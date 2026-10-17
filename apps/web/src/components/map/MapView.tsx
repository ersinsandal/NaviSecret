import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSdk } from '@/contexts/SdkContext';
import { calculateDistance } from '@navisecret/sdk';
import TrailLayer from './TrailLayer';
import ExplorationLayer from './ExplorationLayer';
import { NaviIcon } from '@/components/common/NaviIcons';
import { decryptCapsuleMessage } from '@/utils/capsuleCrypto';
import { useI18n } from '@/i18n';
import type { LocationCurrentRow, Profile } from '@navisecret/sdk';

interface MapViewProps {
  currentLocation: { lat: number; lon: number; accuracy: number } | null;
  showTrails: boolean;
  showExploration: boolean;
  onOpenChat?: (userId: string) => void;
  onFriendsUpdate?: (friends: LocationCurrentRow[], profiles: Record<string, Profile | null>) => void;
}

function MapLifecycle({ currentLocation }: { currentLocation: { lat: number; lon: number } | null }) {
  const map = useMap();
  const centeredRef = useRef(false);

  useEffect(() => {
    // Invalidate Leaflet map size immediately and on short delays to ensure all tiles load properly
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);

    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  useEffect(() => {
    if (currentLocation && !centeredRef.current) {
      map.setView([currentLocation.lat, currentLocation.lon], 15);
      centeredRef.current = true;
    }
  }, [map, currentLocation]);

  return null;
}

// 1. Bespoke Neon User Self-Marker (Pulsing Sonar Beacon)
const selfMarkerIcon = L.divIcon({
  className: 'custom-self-beacon',
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background: rgba(0, 184, 148, 0.25); animation: sonar-wave 2.2s cubic-bezier(0, 0.2, 0.8, 1) infinite;"></div>
      <div style="position: absolute; width: 22px; height: 22px; border-radius: 9999px; background: rgba(0, 184, 148, 0.45); animation: sonar-wave 2.2s cubic-bezier(0, 0.2, 0.8, 1) 0.6s infinite;"></div>
      <div style="position: relative; width: 14px; height: 14px; border-radius: 9999px; background: #00B894; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 10px rgba(0, 184, 148, 0.5); z-index: 10;"></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// 2. Bespoke Friend Avatar Marker Icon
const createFriendMarkerIcon = (initial: string, isCasper: boolean, statusEmoji?: string | null) => {
  const borderColor = isCasper ? '#6366F1' : '#00B894';
  const glowColor = isCasper ? 'rgba(99, 102, 241, 0.35)' : 'rgba(0, 184, 148, 0.35)';

  return L.divIcon({
    className: 'custom-friend-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="width: 38px; height: 38px; border-radius: 9999px; background: #FFFFFF; border: 2.5px solid ${borderColor}; box-shadow: 0 4px 14px ${glowColor}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; color: #0F172A;">
          ${initial}
          ${
            statusEmoji
              ? `<span style="position: absolute; bottom: -3px; right: -3px; font-size: 11px; background: #FFFFFF; border-radius: 9999px; padding: 1px 2px; box-shadow: 0 1px 4px rgba(0,0,0,0.15);">${statusEmoji}</span>`
              : ''
          }
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

// 3. Dual-Mode Capsule Icons
const vaultCapsuleIcon = L.divIcon({
  className: 'custom-capsule-marker-vault',
  html: `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: rgba(217, 119, 6, 0.25); animation: sonar-wave 2.4s infinite;"></div>
      <div style="position: relative; width: 28px; height: 28px; border-radius: 10px; background: #FFFBEB; border: 2px solid #D97706; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4); display: flex; align-items: center; justify-content: center; font-size: 13px; z-index: 10;">
        🔒
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const openCapsuleIcon = L.divIcon({
  className: 'custom-capsule-marker-open',
  html: `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: rgba(0, 184, 148, 0.25); animation: sonar-wave 2.4s infinite;"></div>
      <div style="position: relative; width: 28px; height: 28px; border-radius: 10px; background: #F0FDF4; border: 2px solid #00B894; box-shadow: 0 4px 12px rgba(0, 184, 148, 0.4); display: flex; align-items: center; justify-content: center; font-size: 13px; z-index: 10;">
        📍
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

type MapProvider = 'osm' | 'esri';

interface TileConfig {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

const MAP_PROVIDERS: Record<MapProvider, TileConfig> = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &bull; <span class="slifersoft-brand">SliferSoft</span>',
    maxZoom: 19,
  },
  esri: {
    name: 'ESRI Streets',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &bull; <span class="slifersoft-brand">SliferSoft</span>',
    maxZoom: 19,
  },
};

function MapControls({
  currentLocation,
  currentProvider,
  onToggleProvider,
}: {
  currentLocation: { lat: number; lon: number } | null;
  currentProvider: MapProvider;
  onToggleProvider: () => void;
}) {
  const map = useMap();
  const { t } = useI18n();

  const handleRecenter = () => {
    if (currentLocation) {
      map.flyTo([currentLocation.lat, currentLocation.lon], 16, { duration: 1 });
    }
  };

  return (
    <div className="absolute right-3.5 bottom-24 z-[1000] flex flex-col items-center gap-2 pointer-events-auto">
      {/* Switch Map Style */}
      <button
        onClick={onToggleProvider}
        title={t('map.styleTooltip', { name: MAP_PROVIDERS[currentProvider].name })}
        className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md text-slate-700 hover:text-[#00B894] hover:border-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
      >
        <NaviIcon.Layers size={18} />
      </button>

      {/* Recenter to GPS location */}
      {currentLocation && (
        <button
          onClick={handleRecenter}
          title={t('map.recenterTooltip')}
          className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md text-slate-700 hover:text-[#00B894] hover:border-slate-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
        >
          <NaviIcon.Radar size={18} />
        </button>
      )}

      {/* Zoom In / Out */}
      <div className="flex flex-col rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md overflow-hidden">
        <button
          onClick={() => map.zoomIn()}
          title={t('map.zoomIn')}
          className="w-10 h-10 text-slate-700 hover:bg-slate-50 hover:text-[#00B894] flex items-center justify-center transition-colors border-b border-slate-100 cursor-pointer font-bold text-lg select-none"
        >
          +
        </button>
        <button
          onClick={() => map.zoomOut()}
          title={t('map.zoomOut')}
          className="w-10 h-10 text-slate-700 hover:bg-slate-50 hover:text-[#00B894] flex items-center justify-center transition-colors cursor-pointer font-bold text-lg select-none"
        >
          −
        </button>
      </div>
    </div>
  );
}

export default function MapView({
  currentLocation,
  showTrails,
  showExploration,
  onOpenChat,
  onFriendsUpdate,
}: MapViewProps) {
  const sdk = useSdk();
  const { t } = useI18n();
  const [provider, setProvider] = useState<MapProvider>('osm');
  const [friends, setFriends] = useState<LocationCurrentRow[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<Record<string, Profile | null>>({});
  const [capsules, setCapsules] = useState<any[]>([]);
  const [unlockedCapsules, setUnlockedCapsules] = useState<Record<string, string>>({});
  const [passcodeInputs, setPasscodeInputs] = useState<Record<string, string>>({});
  const [passcodeErrors, setPasscodeErrors] = useState<Record<string, string>>({});
  const lastSentRef = useRef<{ lat: number; lon: number } | null>(null);

  // Fetch nearby secret capsules every 15s
  useEffect(() => {
    let cancelled = false;
    const fetchCapsules = async () => {
      const lat = currentLocation ? currentLocation.lat : 41.0082;
      const lon = currentLocation ? currentLocation.lon : 28.9784;
      try {
        const data = await (sdk as any).getNearbyCapsules(lat, lon, 10000);
        if (!cancelled) setCapsules(data);
      } catch {
        /* ignore */
      }
    };
    fetchCapsules();
    const interval = setInterval(fetchCapsules, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sdk, currentLocation]);

  const handleUnlockCapsule = async (capsuleId: string, requiresPasscode: boolean) => {
    if (!currentLocation) {
      alert(t('capsule.gpsRequiredError'));
      return;
    }

    const enteredPasscode = requiresPasscode ? passcodeInputs[capsuleId] || '' : null;
    if (requiresPasscode && !enteredPasscode?.trim()) {
      setPasscodeErrors((prev) => ({ ...prev, [capsuleId]: t('map.enterSecretPasscodeError') }));
      return;
    }

    try {
      setPasscodeErrors((prev) => ({ ...prev, [capsuleId]: '' }));
      const res = await (sdk as any).unlockCapsule(capsuleId, currentLocation.lat, currentLocation.lon);
      if (res.encryptedPayload) {
        const result = await decryptCapsuleMessage(res.encryptedPayload, enteredPasscode);
        if (result.success && result.text) {
          setUnlockedCapsules((prev) => ({ ...prev, [capsuleId]: result.text! }));
        } else {
          setPasscodeErrors((prev) => ({
            ...prev,
            [capsuleId]: result.error || t('map.incorrectPasscode'),
          }));
        }
      }
    } catch (e: any) {
      alert(e.message || t('map.tooFarToDecrypt'));
    }
  };

  // Fetch real friends every 15s
  useEffect(() => {
    let cancelled = false;
    const fetchFriends = async () => {
      try {
        const data = await sdk.getVisibleFriends();
        const user = await (sdk as any).getCurrentUser?.() || (await sdk.supabase.auth.getUser()).data.user;
        const othersOnly = user ? data.filter((f) => f.user_id !== user.id) : data;
        if (!cancelled) {
          setFriends(othersOnly);

          for (const f of othersOnly) {
            if (!friendProfiles[f.user_id]) {
              sdk
                .getProfile(f.user_id)
                .then((p) => {
                  if (!cancelled && p) {
                    setFriendProfiles((prev) => {
                      const next = { ...prev, [f.user_id]: p };
                      onFriendsUpdate?.(othersOnly, next);
                      return next;
                    });
                  }
                })
                .catch(() => {});
            }
          }
          onFriendsUpdate?.(othersOnly, friendProfiles);
        }
      } catch {
        // Silently handle error
      }
    };

    fetchFriends();
    const interval = setInterval(fetchFriends, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sdk, friendProfiles, onFriendsUpdate]);

  // Subscribe to real-time location updates via WebSockets
  useEffect(() => {
    const channel = sdk.subscribeLocations((row) => {
      setFriends((prev) => {
        const idx = prev.findIndex((f) => f.user_id === row.user_id);
        const next = idx >= 0 ? [...prev] : [...prev, row];
        if (idx >= 0) next[idx] = row;
        onFriendsUpdate?.(next, friendProfiles);
        return next;
      });

      if (!friendProfiles[row.user_id]) {
        sdk
          .getProfile(row.user_id)
          .then((p) => {
            if (p) {
              setFriendProfiles((prev) => {
                const next = { ...prev, [row.user_id]: p };
                onFriendsUpdate?.(friends, next);
                return next;
              });
            }
          })
          .catch(() => {});
      }
    });
    return () => {
      channel.unsubscribe();
    };
  }, [sdk, friendProfiles, friends, onFriendsUpdate]);

  // Send own real location when it changes (>10m movement)
  const sendLocation = useCallback(
    async (loc: { lat: number; lon: number; accuracy: number }) => {
      const last = lastSentRef.current;
      if (last) {
        const dist = calculateDistance(last.lat, last.lon, loc.lat, loc.lon);
        if (dist < 10) return;
      }
      lastSentRef.current = { lat: loc.lat, lon: loc.lon };
      try {
        await sdk.sendLocationWithTrail({ lat: loc.lat, lon: loc.lon, accuracy: loc.accuracy });
      } catch {
        /* ignore */
      }
    },
    [sdk]
  );

  useEffect(() => {
    if (currentLocation) {
      const timer = setTimeout(() => sendLocation(currentLocation), 500);
      return () => clearTimeout(timer);
    }
  }, [currentLocation, sendLocation]);

  const center: [number, number] = currentLocation
    ? [currentLocation.lat, currentLocation.lon]
    : [41.0082, 28.9784]; // Istanbul / default center

  const activeConfig = MAP_PROVIDERS[provider];

  return (
    <div className="relative w-full h-full bg-[#E8EEF5]">
      <MapContainer
        center={center}
        zoom={15}
        style={{ width: '100%', height: '100%', background: '#E8EEF5' }}
        zoomControl={false}
        keyboard={false}
      >
        <TileLayer
          key={provider}
          attribution={activeConfig.attribution}
          url={activeConfig.url}
          maxZoom={activeConfig.maxZoom}
        />

        {/* Floating Map Controls (Layer toggle, Recenter, Zoom) */}
        <MapControls
          currentLocation={currentLocation}
          currentProvider={provider}
          onToggleProvider={() => setProvider((p) => (p === 'osm' ? 'esri' : 'osm'))}
        />

        {/* Map Lifecycle Manager (Size Invalidation & Centering) */}
        <MapLifecycle currentLocation={currentLocation} />

        {/* User Self Beacon */}
        {currentLocation && (
          <Marker position={[currentLocation.lat, currentLocation.lon]} icon={selfMarkerIcon}>
              <Popup className="cyber-leaflet-popup">
                <div className="p-1 min-w-[140px] text-xs">
                  <div className="font-bold text-[#0F172A] flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#00B894]" />
                    <span>Your Location</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-sans">
                    Accuracy: ±{Math.round(currentLocation.accuracy)}m
                  </div>
                </div>
              </Popup>
            </Marker>
        )}

        {/* Friend Spatial Markers */}
        {friends.map((f) => {
          const profile = friendProfiles[f.user_id];
          const label = profile?.display_name || profile?.username || f.user_id.slice(0, 8);
          const initial = label[0]?.toUpperCase() || '?';
          const dist = currentLocation
            ? calculateDistance(currentLocation.lat, currentLocation.lon, f.lat, f.lon)
            : null;

          const friendIcon = createFriendMarkerIcon(
            initial,
            Boolean((f as any).is_casper),
            profile?.status_emoji
          );

          return (
            <Marker key={f.user_id} position={[f.lat, f.lon]} icon={friendIcon}>
              <Popup className="cyber-leaflet-popup">
                <div className="p-2 min-w-[190px] text-xs font-sans text-slate-900">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-full bg-teal-50 border border-[#00B894] flex items-center justify-center font-bold text-xs text-[#00B894]">
                      {initial}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <strong className="text-slate-900 truncate font-semibold">{label}</strong>
                      {profile?.username && (
                        <span className="text-[10px] text-slate-500">@{profile.username}</span>
                      )}
                    </div>
                  </div>

                  {/* Telemetry info */}
                  <div className="space-y-1 text-[11px] text-slate-600 mb-3 font-sans">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Activity:</span>
                      <span className="capitalize font-medium text-[#00B894]">{f.motion}</span>
                    </div>
                    {f.battery_level != null && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Battery:</span>
                        <span className="font-medium">{f.battery_level}%</span>
                      </div>
                    )}
                    {dist != null && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Distance:</span>
                        <span className="font-medium text-[#00B894]">
                          {dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Button */}
                  {onOpenChat && (
                    <button
                      onClick={() => onOpenChat(f.user_id)}
                      className="w-full py-1.5 px-3 rounded-xl bg-[#0F172A] text-white font-bold text-xs hover:bg-[#1E293B] transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <NaviIcon.Chat size={14} className="w-3.5 h-3.5" />
                      <span>Send Message</span>
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Secret Location-Bound Capsules */}
        {capsules.map((c) => {
          const dist = currentLocation
            ? calculateDistance(currentLocation.lat, currentLocation.lon, c.latitude, c.longitude)
            : c.distanceMeters ?? null;
          const canUnlock = dist !== null && dist <= c.unlock_radius_m;
          const unlockedText = unlockedCapsules[c.id];
          const isVault = Boolean(c.requires_passcode);

          return (
            <Marker
              key={c.id}
              position={[c.latitude, c.longitude]}
              icon={isVault ? vaultCapsuleIcon : openCapsuleIcon}
            >
              <Popup className="cyber-leaflet-popup">
                <div className="p-3 min-w-[220px] text-xs font-sans text-slate-900 space-y-2.5">
                  {/* Header */}
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-sm shadow-xs shrink-0 ${
                      isVault ? 'bg-amber-50 border-amber-300' : 'bg-teal-50 border-teal-300'
                    }`}>
                      {isVault ? '🔒' : '📍'}
                    </div>
                    <div className="min-w-0">
                      <strong className="block truncate text-slate-900 font-bold text-xs">
                        {c.title}
                      </strong>
                      <span className="text-[10px] text-slate-400">
                        {t('map.createdBy', { creator: c.creator_name || 'Secret Agent' })}
                      </span>
                    </div>
                  </div>

                  {/* Mode Badge */}
                  <div className="flex items-center gap-1.5">
                    {isVault ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100/80 text-amber-900 text-[10px] font-bold">
                        {t('map.secretVaultBadge')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-teal-100/80 text-teal-900 text-[10px] font-bold">
                        {t('map.proximityOpenBadge')}
                      </span>
                    )}
                  </div>

                  {/* Distance info */}
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t('map.distance')}</span>
                      <span className={`font-bold ${isVault ? 'text-[#D97706]' : 'text-[#00B894]'}`}>
                        {dist !== null
                          ? dist < 1000
                            ? `${Math.round(dist)}m`
                            : `${(dist / 1000).toFixed(1)}km`
                          : t('map.proximityNeeded')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">{t('map.unlockZone')}</span>
                      <span className="font-medium text-slate-700">{t('map.withinRadius', { radius: c.unlock_radius_m })}</span>
                    </div>
                  </div>

                  {/* Content or Unlock Controls */}
                  {unlockedText ? (
                    <div className={`p-2.5 rounded-xl border text-xs font-medium break-words space-y-1 ${
                      isVault ? 'bg-amber-50/90 border-amber-300' : 'bg-teal-50/90 border-teal-300'
                    }`}>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                        <span>{isVault ? t('map.decryptedSecret') : t('map.locationMessage')}</span>
                      </div>
                      <div className="font-sans leading-relaxed text-slate-900 font-semibold">{unlockedText}</div>
                    </div>
                  ) : canUnlock ? (
                    <div className="space-y-2 pt-1">
                      {isVault && (
                        <div>
                          {c.passcode_hint && (
                            <div className="text-[10px] text-amber-900 bg-amber-50 p-1.5 rounded-lg border border-amber-200 mb-1.5">
                              💡 <strong>{t('map.hint')}</strong> {c.passcode_hint}
                            </div>
                          )}
                          <input
                            type="text"
                            placeholder={t('map.enterPasscodePlaceholder')}
                            value={passcodeInputs[c.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPasscodeInputs((prev) => ({ ...prev, [c.id]: val }));
                              if (passcodeErrors[c.id]) {
                                setPasscodeErrors((prev) => ({ ...prev, [c.id]: '' }));
                              }
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#D97706] focus:ring-2 focus:ring-amber-500/20 outline-none text-xs font-mono font-bold"
                          />
                          {passcodeErrors[c.id] && (
                            <div className="text-[10px] text-rose-600 font-semibold mt-1">
                              {passcodeErrors[c.id]}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => handleUnlockCapsule(c.id, isVault)}
                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                          isVault
                            ? 'bg-[#D97706] hover:bg-[#B45309] text-white'
                            : 'bg-[#00B894] hover:bg-[#009874] text-white'
                        }`}
                      >
                        {isVault ? (
                          <>
                            <NaviIcon.Capsule size={14} color="#FFFFFF" />
                            <span>{t('map.unlockWithPasscodeBtn')}</span>
                          </>
                        ) : (
                          <>
                            <NaviIcon.Pin size={14} color="#FFFFFF" />
                            <span>{t('map.readMessageBtn')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 text-[10px] text-center font-medium">
                      {t('map.moveCloser', { radius: c.unlock_radius_m, dist: dist !== null ? `${Math.round(dist)}m` : '' })}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {showTrails && <TrailLayer sdk={sdk} />}
        {showExploration && <ExplorationLayer sdk={sdk} />}
      </MapContainer>
    </div>
  );
}
