import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSdk } from '@/contexts/SdkContext';
import SlidePanel from '@/components/layout/SlidePanel';
import ErrorBoundary from '@/components/ErrorBoundary';
import ApexCommandDeck from '@/components/layout/ApexCommandDeck';
import QuantumDock, { type DockTabId } from '@/components/layout/QuantumDock';
import { NaviIcon } from '@/components/common/NaviIcons';
import { useI18n } from '@/i18n';
import type { LocationCurrentRow, Profile } from '@navisecret/sdk';

export type PanelType =
  | 'friends' | 'chat' | 'profile' | 'more'
  | 'groups' | 'favorites' | 'sharing' | 'bumps' | 'reactions'
  | 'capsule_drop'
  | null;

const MapView = lazy(() => import('@/components/map/MapView'));
const FriendsPanel = lazy(() => import('@/components/friends/FriendsPanel'));
const ChatPanel = lazy(() => import('@/components/chat/ChatPanel'));
const ProfilePanel = lazy(() => import('@/components/profile/ProfilePanel'));
const SettingsPanel = lazy(() => import('@/components/settings/SettingsPanel'));
const GroupsPanel = lazy(() => import('@/components/groups/GroupsPanel'));
const FavoritesPanel = lazy(() => import('@/components/favorites/FavoritesPanel'));
const SharingPanel = lazy(() => import('@/components/sharing/SharingPanel'));
const BumpPanel = lazy(() => import('@/components/bumps/BumpPanel'));
const ReactionPanel = lazy(() => import('@/components/reactions/ReactionPanel'));
const CapsuleDropPanel = lazy(() => import('@/components/capsules/CapsuleDropPanel'));

export default function AppShell() {
  const { t } = useI18n();
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [showTrails, setShowTrails] = useState(false);
  const [showExploration, setShowExploration] = useState(false);
  const [chatFriendId, setChatFriendId] = useState<string | undefined>();
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [ghostUntil, setGhostUntil] = useState<string | null>(null);
  const [pulseAlert, setPulseAlert] = useState<{ name: string; distance: number } | null>(null);

  const geo = useGeolocation();
  const core = useSdk();

  // Casper Mode poll and listener
  useEffect(() => {
    let mounted = true;
    const checkGhost = async () => {
      try {
        const s = await core.getSettings();
        if (mounted && s) {
          setIsGhostMode(!!s.ghost_mode);
          setGhostUntil(s.ghost_until || null);
        }
      } catch {
        // silent fallback
      }
    };
    checkGhost();
    const interval = setInterval(checkGhost, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [core, activePanel]);

  const currentLocation = useMemo(() => {
    if (geo.lat !== null && geo.lon !== null && geo.accuracy !== null) {
      return { lat: geo.lat, lon: geo.lon, accuracy: geo.accuracy };
    }
    return null;
  }, [geo.lat, geo.lon, geo.accuracy]);

  const openPanel = (panel: PanelType) => setActivePanel(panel);
  const togglePanel = (panel: PanelType) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };
  const closePanel = () => {
    setActivePanel(null);
    setChatFriendId(undefined);
  };

  const handleOpenChat = (userId: string) => {
    setChatFriendId(userId);
    setActivePanel('chat');
  };

  const handleFriendsUpdate = useCallback(
    (_friends: LocationCurrentRow[], _profiles: Record<string, Profile | null>) => {
      // friends update callback
    },
    []
  );

  // Dock selection mapping
  const activeDockTab: DockTabId | null = useMemo(() => {
    if (activePanel === null) return 'map';
    if (activePanel === 'bumps') return 'pulse';
    if (activePanel === 'friends') return 'friends';
    if (activePanel === 'chat') return 'chat';
    if (activePanel === 'more') return 'settings';
    return null;
  }, [activePanel]);

  const handleSelectDockTab = (tab: DockTabId | null) => {
    if (tab === 'map' || tab === null) {
      setActivePanel(null);
      return;
    }
    if (tab === 'pulse') {
      setActivePanel(activePanel === 'bumps' ? null : 'bumps');
    } else if (tab === 'friends') {
      setActivePanel(activePanel === 'friends' ? null : 'friends');
    } else if (tab === 'chat') {
      setActivePanel(activePanel === 'chat' ? null : 'chat');
    } else if (tab === 'settings') {
      setActivePanel(activePanel === 'more' ? null : 'more');
    }
  };

  // Nexus Radial Actions
  const handleNexusDeployCapsule = () => {
    openPanel('capsule_drop');
  };

  const handleNexusTriggerPulsePing = async () => {
    openPanel('bumps');
  };

  const handleNexusToggleCasper = async () => {
    try {
      if (isGhostMode) {
        await core.disableGhostMode();
        setIsGhostMode(false);
        setGhostUntil(null);
      } else {
        await core.enableGhostMode(60); // 1 hour quick cloak
        setIsGhostMode(true);
        const until = new Date(Date.now() + 60 * 60000).toISOString();
        setGhostUntil(until);
      }
    } catch {
      openPanel('more');
    }
  };

  const handleNexusSharePin = () => {
    openPanel('favorites');
  };

  return (
    <div className="relative h-full w-full bg-[#F8FAFC] overflow-hidden select-none">
      {/* Map Scene (Stacking context contained) */}
      <div className="absolute inset-0 z-0">
        <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-slate-400">{t('map.failedToLoadMap')}</div>}>
          <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400">{t('map.loadingMap')}</div>}>
            <MapView
              currentLocation={currentLocation}
              showTrails={showTrails}
              showExploration={showExploration}
              onOpenChat={handleOpenChat}
              onFriendsUpdate={handleFriendsUpdate}
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* --- Top Flight Deck: Apex Command Deck --- */}
      <ApexCommandDeck
        isCasper={isGhostMode}
        casperUntil={ghostUntil}
        gpsAccuracy={geo.accuracy}
        rttMs={24}
        activePanel={activePanel}
        onOpenCasper={() => togglePanel('more')}
        onOpenPulse={() => togglePanel('bumps')}
        onOpenProfile={() => togglePanel('profile')}
        onOpenNotifications={() => togglePanel('reactions')}
        pulseAlert={pulseAlert}
      />

      {/* GPS Error Alert Banner */}
      {geo.error && (
        <div className="fixed top-16 left-4 right-4 z-40 max-w-md mx-auto cyber-glass-heavy p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xl border border-red-500/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
              <NaviIcon.Radar size={16} className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-rose-500 font-sans tracking-wide">
                {t('map.gpsRequired')}
              </div>
              <div className="text-xs truncate text-slate-600">
                {geo.error}
              </div>
            </div>
          </div>
          <button
            onClick={() => geo.retry()}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#00B894] text-white transition-transform active:scale-95 cursor-pointer shadow-sm hover:bg-[#00a382]"
          >
            {t('map.retry')}
          </button>
        </div>
      )}

      {/* Acquiring GPS location pill */}
      {!currentLocation && !geo.error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 cyber-glass-heavy px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg text-slate-700 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-[#00B894] animate-ping" />
          <span>{t('map.gpsAcquiring')}</span>
        </div>
      )}

      {/* --- Slide Panels (Modal Card System with adaptive placement) --- */}
      <ErrorBoundary>
        <Suspense fallback={<div className="flex justify-center p-6 text-slate-500">{t('common.loadingComponent')}</div>}>
          <SlidePanel
            open={activePanel === 'friends'}
            onClose={closePanel}
            title={t('friends.friendsTitle')}
            category="FRIENDS"
            side="left"
          >
            <FriendsPanel onOpenChat={handleOpenChat} />
          </SlidePanel>

          <SlidePanel
            open={activePanel === 'chat'}
            onClose={closePanel}
            title={t('chat.directMessages')}
            category="CHAT"
            side="left"
          >
            <ChatPanel initialFriendId={chatFriendId} />
          </SlidePanel>

          <SlidePanel
            open={activePanel === 'profile'}
            onClose={closePanel}
            title={t('profile.profileTitle')}
            category="PROFILE"
            side="right"
          >
            <ProfilePanel />
          </SlidePanel>

          <SlidePanel
            open={activePanel === 'more'}
            onClose={closePanel}
            title={t('settings.settingsTitle')}
            category="SETTINGS"
            side="right"
          >
            <SettingsPanel />
            <div className="mt-4 flex flex-col gap-2 px-4 pb-4">
              <button
                onClick={() => openPanel('groups')}
                className="w-full py-3 rounded-xl border border-slate-200 bg-white/70 text-left px-4 text-sm text-slate-800 hover:bg-white flex items-center gap-2.5 transition-colors cursor-pointer shadow-xs"
              >
                <NaviIcon.Friends size={16} className="w-4 h-4 text-[#00B894]" />
                <span className="font-medium">{t('settings.circlesGroups')}</span>
              </button>
              <button
                onClick={() => openPanel('favorites')}
                className="w-full py-3 rounded-xl border border-slate-200 bg-white/70 text-left px-4 text-sm text-slate-800 hover:bg-white flex items-center gap-2.5 transition-colors cursor-pointer shadow-xs"
              >
                <NaviIcon.Capsule size={16} className="w-4 h-4 text-[#FFB800]" />
                <span className="font-medium">{t('settings.savedPlaces')}</span>
              </button>
              <button
                onClick={() => openPanel('sharing')}
                className="w-full py-3 rounded-xl border border-slate-200 bg-white/70 text-left px-4 text-sm text-slate-800 hover:bg-white flex items-center gap-2.5 transition-colors cursor-pointer shadow-xs"
              >
                <NaviIcon.ZeroProof size={16} className="w-4 h-4 text-[#8B5CF6]" />
                <span className="font-medium">{t('settings.privacySharing')}</span>
              </button>
            </div>
          </SlidePanel>

          <SlidePanel
            open={activePanel === 'groups'}
            onClose={closePanel}
            title={t('settings.circlesGroups')}
            category="CIRCLES"
            side="left"
          >
            <GroupsPanel />
          </SlidePanel>

          <SlidePanel
            open={activePanel === 'favorites'}
            onClose={closePanel}
            title={t('settings.savedPlaces')}
            category="PLACES"
            side="left"
          >
            <FavoritesPanel currentLocation={currentLocation} />
          </SlidePanel>

          <SlidePanel
            open={activePanel === 'sharing'}
            onClose={closePanel}
            title={t('settings.privacySharing')}
            category="PRIVACY"
            side="right"
          >
            <SharingPanel />
          </SlidePanel>

          <SlidePanel
            open={activePanel === 'bumps'}
            onClose={closePanel}
            title={t('pulse.radarTitle')}
            category="RADAR"
            side="center"
          >
            <BumpPanel currentLocation={currentLocation} />
          </SlidePanel>

          <SlidePanel
            open={activePanel === 'reactions'}
            onClose={closePanel}
            title={t('settings.notifReactions')}
            category="NOTIFICATIONS"
            side="right"
          >
            <ReactionPanel />
          </SlidePanel>

          <SlidePanel
            open={activePanel === 'capsule_drop'}
            onClose={closePanel}
            title={t('capsule.dropPanelTitle')}
            category="CAPSULE"
            side="center"
          >
            <CapsuleDropPanel
              currentLocation={currentLocation}
              onSuccess={closePanel}
            />
          </SlidePanel>
        </Suspense>
      </ErrorBoundary>

      {/* --- Bottom Navigation: Quantum Orbit Dock --- */}
      <QuantumDock
        activeTab={activeDockTab}
        onSelectTab={handleSelectDockTab}
        onDeployCapsule={handleNexusDeployCapsule}
        onTriggerPulsePing={handleNexusTriggerPulsePing}
        onToggleCasper={handleNexusToggleCasper}
        onSharePin={handleNexusSharePin}
        pulseActive={isGhostMode}
      />
    </div>
  );
}
