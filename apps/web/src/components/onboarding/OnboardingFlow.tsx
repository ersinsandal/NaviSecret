import { useState, useCallback, useRef } from 'react';
import { useSdk } from '@/contexts/SdkContext';
import { useAuth } from '@/contexts/AuthContext';
import { NaviIcon } from '@/components/common/NaviIcons';

interface OnboardingFlowProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'profile' | 'location' | 'friends' | 'done';

const STEPS: Step[] = ['welcome', 'profile', 'location', 'friends', 'done'];

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const sdk = useSdk();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('welcome');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [statusEmoji, setStatusEmoji] = useState(user?.status_emoji || '👋');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendResults, setFriendResults] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stepIdx = STEPS.indexOf(step);
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  const next = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }, [step]);

  const back = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }, [step]);

  // ─── Step: Profile ──────────────────────
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      if (displayName.trim()) {
        await sdk.updateProfile({ display_name: displayName.trim() });
      }
      if (statusEmoji) {
        await sdk.setStatus(statusEmoji);
      }
      if (avatarFile) {
        await sdk.uploadAvatar(avatarFile);
      }
      next();
    } catch (e: any) {
      setError(e.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Step: Location ─────────────────────
  const requestLocation = async () => {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      await sdk.sendLocation({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      setLocationGranted(true);
    } catch {
      // User denied or error
    }
  };

  // ─── Step: Friends ──────────────────────
  const searchFriends = async () => {
    if (!friendSearch.trim()) return;
    try {
      const results = await sdk.searchProfiles(friendSearch.trim());
      setFriendResults(results.filter((p: any) => p.user_id !== user?.id));
    } catch {
      setFriendResults([]);
    }
  };

  const sendRequest = async (userId: string) => {
    try {
      await sdk.sendFriendRequest(userId);
      setSentRequests((prev) => new Set(prev).add(userId));
    } catch (e: any) {
      alert(e.message);
    }
  };

  // ─── Step: Done ─────────────────────────
  const finish = () => {
    localStorage.setItem(`navisecret:onboarded:${user?.id}`, '1');
    onComplete();
  };

  const GLYPHS = ['👋', '⚡', '📍', '🚀', '🎯', '🔥', '💎', '🧭', '🌟', '🛡️'];

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-sky-50 text-slate-800 select-none">
      {/* Top Clean Progress Line */}
      <div className="h-1.5 bg-slate-200/80 w-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#00B894] via-[#0284C7] to-[#6366F1] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-2xl rounded-3xl p-8 border border-slate-200/90 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.12)] relative overflow-hidden">
          {/* Soft ambient brand halos */}
          <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

          {/* ─── Step 1: Welcome ─── */}
          {step === 'welcome' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-1.5 rounded-2xl bg-[#0F172A] shadow-md transition-transform hover:scale-105 duration-200">
                  <img
                    src="/logo-icon.svg"
                    alt="NaviSecret Logo"
                    className="w-16 h-16 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#0F172A]">
                  Welcome to Navi<span className="text-[#00B894]">Secret</span>
                </h1>
                <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mt-0.5">
                  EVERY PLACE HOLDS A SECRET
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-sans px-2">
                Real-time, end-to-end encrypted location sharing and secret location-bound capsules. Your coordinates and privacy remain strictly under your control.
              </p>

              <div className="pt-4">
                <button
                  onClick={next}
                  className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#0F172A] hover:bg-[#1E293B] text-white transition-all shadow-md shadow-slate-900/10 active:scale-95 cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 2: Profile ─── */}
          {step === 'profile' && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                  Set Up Your Profile
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Choose how your friends see you on the map and in chat
                </p>
              </div>

              {/* Avatar Selector */}
              <div className="flex flex-col items-center justify-center py-2 gap-2">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-2xl cursor-pointer border-2 border-dashed border-slate-300 hover:border-[#00B894] bg-slate-50 hover:bg-slate-100 flex items-center justify-center relative overflow-hidden transition-all group shadow-sm"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-[#00B894] transition-colors">
                      <span className="text-2xl font-light">+</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                    Change
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarSelect} />
                <span className="text-[11px] font-medium text-slate-500">
                  {avatarPreview ? 'Click to change photo' : 'Click to upload a profile photo'}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ersin Sandal"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20 transition-all outline-none font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                  Map Status Emoji
                </label>
                <div className="flex gap-2 flex-wrap justify-center">
                  {GLYPHS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setStatusEmoji(statusEmoji === e ? '' : e)}
                      className={`w-9 h-9 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                        statusEmoji === e
                          ? 'bg-teal-50 border-2 border-[#00B894] shadow-sm scale-110'
                          : 'bg-slate-100 border border-slate-200/80 hover:bg-slate-200'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={back}
                  className="px-5 py-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#0F172A] hover:bg-[#1E293B] text-white transition-all shadow-md shadow-slate-900/10 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Location ─── */}
          {step === 'location' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 shadow-sm">
                  <NaviIcon.Map size={36} color="#00B894" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                  Location Access
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Enable GPS to see your location and discover friends
                </p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-sans px-2">
                Your coordinates are encrypted and only accessible to approved friends. You can go invisible anytime using Ghost Mode.
              </p>

              <div className="py-2">
                {locationGranted ? (
                  <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-[#00B894] text-xs font-semibold flex items-center justify-center gap-2 shadow-sm">
                    <NaviIcon.DoubleCheck size={18} color="#00B894" />
                    <span>Location access granted successfully!</span>
                  </div>
                ) : (
                  <button
                    onClick={requestLocation}
                    className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#00B894] hover:bg-[#009874] text-white transition-all shadow-md shadow-teal-500/20 active:scale-95 cursor-pointer"
                  >
                    Enable Location Access
                  </button>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={back}
                  className="px-5 py-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={next}
                  className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#0F172A] hover:bg-[#1E293B] text-white transition-all shadow-md shadow-slate-900/10 active:scale-95 cursor-pointer"
                >
                  {locationGranted ? 'Continue' : 'Skip for now'}
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 4: Friends ─── */}
          {step === 'friends' && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-black text-[#0F172A] tracking-tight">
                  Connect with Friends
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Search by username to add your first connections
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  placeholder="Search username..."
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchFriends()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#00B894] focus:ring-2 focus:ring-[#00B894]/20 outline-none transition-all font-sans"
                />
                <button
                  onClick={searchFriends}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-[#1E293B] text-white transition-colors shrink-0 cursor-pointer shadow-sm"
                >
                  Search
                </button>
              </div>

              {friendResults.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {friendResults.map((p: any) => (
                    <div
                      key={p.user_id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-sans"
                    >
                      <span className="text-slate-900 font-semibold truncate">
                        {p.display_name || p.username || p.user_id.slice(0, 8)}
                      </span>
                      {sentRequests.has(p.user_id) ? (
                        <span className="text-[#00B894] font-bold text-xs">Sent!</span>
                      ) : (
                        <button
                          onClick={() => sendRequest(p.user_id)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-[#00B894] text-white hover:bg-[#009874] cursor-pointer shadow-sm transition-colors"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={back}
                  className="px-5 py-3 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={next}
                  className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#0F172A] hover:bg-[#1E293B] text-white transition-all shadow-md shadow-slate-900/10 active:scale-95 cursor-pointer"
                >
                  {sentRequests.size > 0 ? 'Continue' : 'Skip for now'}
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 5: Done ─── */}
          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 shadow-sm">
                  <NaviIcon.DoubleCheck size={36} color="#00B894" />
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">
                  You're All Set!
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Your secure map is ready. Start exploring your surroundings.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5 text-xs font-sans">
                <div className="flex items-center gap-2.5 text-slate-700">
                  <NaviIcon.Casper size={16} color="#6366F1" />
                  <span><strong>Ghost Mode:</strong> Go invisible from the top bar with one tap.</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700">
                  <NaviIcon.Pulse size={16} color="#00B894" />
                  <span><strong>Pulse Radar:</strong> Detect nearby friends in real time.</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700">
                  <NaviIcon.Capsule size={16} color="#D97706" />
                  <span><strong>Secret Capsules:</strong> Drop location-bound encrypted messages.</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={finish}
                  className="w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#0F172A] hover:bg-[#1E293B] text-white transition-all shadow-md shadow-slate-900/10 active:scale-95 cursor-pointer"
                >
                  Enter Map
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
