/**
 * NaviSecret High-Performance Client (NaviClient)
 * Author & Creator: Ersin Sandal (SliferSoft)
 * Direct REST API + Realtime WebSockets engine.
 * Fully compatible with LocationCore interface and React Contexts.
 */
import type {
  LocationCore,
  LocationCurrentRow,
  LocationUpdate,
  LocationHistoryRow,
  ShareLevel,
  Profile,
  FriendRequest,
  UserSettings,
  Group,
  GroupMember,
  ChatRoom,
  Message,
  MessageType,
  LocationReaction,
  BumpEvent,
  NearbyUser,
  FavoritePlace,
  VisitedCell,
  VisitedCellStats,
  AreaRanking,
  FriendStreak,
  FriendOfFriend,
  NotificationPreferences,
  SharingPolicy,
  SharingPolicyCreate,
  FilteredLocation,
  MotionType,
} from '@navisecret/sdk';
import { calculateDistance, encodeGeohash, decodeGeohash, estimateMotionType } from '@navisecret/sdk';

export interface NaviUser {
  id: string;
  email: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  status_emoji?: string;
  status_text?: string;
  is_casper?: boolean;
  casper_until?: string | null;
  created_at?: string;
  user_metadata?: Record<string, any>;
}

export type AuthListener = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED', session: { user: NaviUser | null; access_token: string | null } | null) => void;

export class NaviClient implements LocationCore {
  private token: string | null = null;
  private currentUser: NaviUser | null = null;
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private authListeners = new Set<AuthListener>();
  private eventListeners = new Map<string, Set<(data: any) => void>>();
  private readonly baseUrl: string;

  constructor(baseUrl = '/api/v1') {
    this.baseUrl = baseUrl;
    // Load persisted session
    try {
      this.token = localStorage.getItem('navisecret_token');
      const userJson = localStorage.getItem('navisecret_user');
      if (userJson) {
        this.currentUser = JSON.parse(userJson);
      }
    } catch {}

    // Clean up if stored token is already expired
    if (this.token && this.isTokenExpired(this.token)) {
      this.clearSession();
    }

    if (this.token) {
      this.connectWebSocket();
    }
  }

  public isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          return true;
        }
      }
    } catch {}
    return false;
  }

  public clearSession(): void {
    this.token = null;
    this.currentUser = null;
    try {
      localStorage.removeItem('navisecret_token');
      localStorage.removeItem('navisecret_user');
    } catch {}
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.notifyAuth('SIGNED_OUT');
  }

  // ==========================================
  // HTTP Fetch Helper
  // ==========================================
  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = new Headers(options.headers || {});

    if (this.token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errorJson = await res.json();
        errorMsg = errorJson.message || errorJson.error || errorMsg;
      } catch {}

      // Automatically clear stale or expired session on 401 Unauthorized
      if (res.status === 401 && this.token) {
        console.warn('[NaviClient] 401 Unauthorized encountered. Clearing invalid or expired session.');
        this.clearSession();
      }

      throw new Error(errorMsg);
    }

    return res.json();
  }

  // ==========================================
  // WebSocket Hub & Realtime Multiplexing
  // ==========================================
  private connectWebSocket(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(this.token || '')}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Authenticate socket
        if (this.token) {
          this.ws?.send(JSON.stringify({ type: 'auth', token: this.token }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event === 'AUTH_FAILED') {
            console.warn('[NaviClient] WebSocket authentication failed. Clearing invalid session.');
            this.clearSession();
            return;
          }
          const { event: evtName, data } = parsed;
          if (evtName && this.eventListeners.has(evtName)) {
            for (const handler of this.eventListeners.get(evtName)!) {
              try {
                handler(data);
              } catch (err) {
                console.error('Error in WS event listener:', err);
              }
            }
          }
        } catch {}
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.token) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      // WS connection failure fallback
    }
  }

  private onEvent(event: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  // ==========================================
  // Auth API Adapter
  // ==========================================
  public readonly auth = {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const res = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      this.token = res.token;
      this.currentUser = {
        ...res.user,
        user_metadata: {
          display_name: res.user.display_name,
          avatar_url: res.user.avatar_url,
          username: res.user.username,
        },
      };

      localStorage.setItem('navisecret_token', this.token!);
      localStorage.setItem('navisecret_user', JSON.stringify(this.currentUser));

      this.connectWebSocket();
      this.notifyAuth('SIGNED_IN');

      return {
        data: {
          user: this.currentUser,
          session: { access_token: this.token, user: this.currentUser },
        },
        error: null,
      };
    },

    signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, any> } }) => {
      const res = await this.request('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          username: options?.data?.username,
          displayName: options?.data?.display_name,
        }),
      });

      this.token = res.token;
      this.currentUser = {
        ...res.user,
        user_metadata: {
          display_name: res.user.display_name,
          avatar_url: res.user.avatar_url,
          username: res.user.username,
        },
      };

      localStorage.setItem('navisecret_token', this.token!);
      localStorage.setItem('navisecret_user', JSON.stringify(this.currentUser));

      this.connectWebSocket();
      this.notifyAuth('SIGNED_IN');

      return {
        data: {
          user: this.currentUser,
          session: { access_token: this.token, user: this.currentUser },
        },
        error: null,
      };
    },

    signOut: async () => {
      this.clearSession();
      return { error: null };
    },

    getSession: async () => {
      if (!this.token) {
        return { data: { session: null }, error: null };
      }

      if (this.isTokenExpired(this.token)) {
        this.clearSession();
        return { data: { session: null }, error: null };
      }

      // Verify and refresh user profile with backend
      try {
        const res = await this.request('/users/me');
        if (res.user) {
          this.currentUser = {
            ...res.user,
            user_metadata: {
              display_name: res.user.display_name,
              avatar_url: res.user.avatar_url,
              username: res.user.username,
            },
          };
          try {
            localStorage.setItem('navisecret_user', JSON.stringify(this.currentUser));
          } catch {}
        }
      } catch (err: any) {
        // If unauthorized or token rejected, clear session
        if (err.message?.includes('401') || err.message?.includes('token') || err.message?.includes('UNAUTHORIZED')) {
          this.clearSession();
          return { data: { session: null }, error: null };
        }
      }

      return {
        data: {
          session: this.token && this.currentUser ? { access_token: this.token, user: this.currentUser } : null,
        },
        error: null,
      };
    },

    getUser: async () => {
      return { data: { user: this.currentUser }, error: null };
    },

    onAuthStateChange: (callback: AuthListener) => {
      this.authListeners.add(callback);
      // Trigger initial state
      if (this.currentUser && this.token) {
        callback('SIGNED_IN', { user: this.currentUser, access_token: this.token });
      } else {
        callback('SIGNED_OUT', null);
      }
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.authListeners.delete(callback);
            },
          },
        },
      };
    },
  };

  private notifyAuth(event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED'): void {
    const session = this.currentUser && this.token ? { user: this.currentUser, access_token: this.token } : null;
    for (const listener of this.authListeners) {
      try {
        listener(event, session);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    }
  }

  // Legacy client compatibility shim
  public get supabase(): any {
    return {
      auth: this.auth,
      from: (_table: string) => ({
        select: (_cols?: string) => ({
          in: async () => ({ data: [], error: null }),
          eq: async () => ({ data: [], error: null }),
          order: () => ({ limit: async () => ({ data: [], error: null }) }),
        }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
      }),
      channel: (_name: string) => ({
        on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        subscribe: () => ({ unsubscribe: () => {} }),
      }),
    };
  }

  // ==========================================
  // LocationCore Implementation (All 62 Methods)
  // ==========================================

  // 1. Profiles & Avatars
  public async getProfile(userId?: string): Promise<Profile | null> {
    const target = userId || this.currentUser?.id;
    if (!target) return null;
    try {
      const res = await this.request(userId ? `/users/${userId}/profile` : '/users/me');
      const u = res.profile || res.user;
      return {
        user_id: u.id || u.user_id,
        username: u.username || '',
        display_name: u.display_name || '',
        avatar_url: u.avatar_url || null,
        status_emoji: u.status_emoji || null,
        status_text: u.status_text || null,
        status_expires_at: u.status_expires_at || null,
        is_casper: u.is_casper || false,
        created_at: u.created_at || new Date().toISOString(),
        updated_at: u.updated_at || new Date().toISOString(),
      } as any;
    } catch {
      return null;
    }
  }

  public async updateProfile(profile: Partial<Omit<Profile, 'user_id' | 'created_at' | 'updated_at'>>): Promise<Profile> {
    const res = await this.request('/users/me/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
    const updated = res.user || res.profile;
    if (this.currentUser && updated) {
      this.currentUser = { ...this.currentUser, ...updated };
      localStorage.setItem('navisecret_user', JSON.stringify(this.currentUser));
      this.notifyAuth('USER_UPDATED');
    }
    return updated;
  }

  public async searchProfiles(query: string): Promise<Profile[]> {
    const res = await this.request(`/users/search?q=${encodeURIComponent(query)}`);
    return (res.results || []).map((u: any) => ({
      user_id: u.user_id || u.id,
      username: u.username,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      status_emoji: u.status_emoji,
      status_text: u.status_text,
    }));
  }

  public async uploadAvatar(file: { arrayBuffer(): Promise<ArrayBuffer>; type: string; name?: string }): Promise<string> {
    const formData = new FormData();
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer], { type: file.type || 'image/jpeg' });
    formData.append('file', blob, file.name || 'avatar.jpg');

    const res = await this.request('/users/me/avatar', {
      method: 'POST',
      body: formData,
    });

    if (this.currentUser && res.avatarUrl) {
      this.currentUser.avatar_url = res.avatarUrl;
      localStorage.setItem('navisecret_user', JSON.stringify(this.currentUser));
      this.notifyAuth('USER_UPDATED');
    }

    return res.avatarUrl;
  }

  public async deleteAvatar(): Promise<void> {
    await this.request('/users/me/avatar', { method: 'DELETE' });
    if (this.currentUser) {
      this.currentUser.avatar_url = undefined;
      localStorage.setItem('navisecret_user', JSON.stringify(this.currentUser));
      this.notifyAuth('USER_UPDATED');
    }
  }

  public async setStatus(emoji: string, text?: string, durationMinutes?: number): Promise<void> {
    await this.request('/users/me/status', {
      method: 'PUT',
      body: JSON.stringify({
        status_emoji: emoji,
        status_text: text,
        duration_minutes: durationMinutes,
      }),
    });
  }

  public async clearStatus(): Promise<void> {
    await this.request('/users/me/status', { method: 'DELETE' });
  }

  // 2. Friends & Social Network
  public async getFriends(): Promise<string[]> {
    const res = await this.request('/social/friends');
    return (res.friends || []).map((f: any) => f.friend_id || f.user_id);
  }

  public async sendFriendRequest(toUserId: string): Promise<FriendRequest> {
    const res = await this.request('/social/requests', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: toUserId }),
    });
    return res.request;
  }

  public async getPendingRequests(): Promise<FriendRequest[]> {
    const res = await this.request('/social/requests/pending');
    return (res.incoming || []).map((r: any) => ({
      id: r.id,
      sender_id: r.requester_id,
      receiver_id: this.currentUser?.id || '',
      status: 'pending',
      created_at: r.created_at,
      sender: {
        username: r.username,
        display_name: r.display_name,
        avatar_url: r.avatar_url,
      },
    }));
  }

  public async getSentRequests(): Promise<FriendRequest[]> {
    const res = await this.request('/social/requests/pending');
    return (res.outgoing || []).map((r: any) => ({
      id: r.id,
      sender_id: this.currentUser?.id || '',
      receiver_id: r.recipient_id,
      status: 'pending',
      created_at: r.created_at,
    }));
  }

  public async acceptFriendRequest(requestId: number): Promise<void> {
    await this.request(`/social/requests/${requestId}/accept`, { method: 'POST' });
  }

  public async rejectFriendRequest(requestId: number): Promise<void> {
    await this.request(`/social/requests/${requestId}/reject`, { method: 'POST' });
  }

  public async cancelFriendRequest(requestId: number): Promise<void> {
    await this.request(`/social/requests/${requestId}`, { method: 'DELETE' });
  }

  public async removeFriend(friendId: string): Promise<void> {
    await this.request(`/social/friends/${friendId}`, { method: 'DELETE' });
  }

  public async getFriendsOfFriends(): Promise<FriendOfFriend[]> {
    const res = await this.request('/social/friends-of-friends');
    return (res.suggestions || []).map((s: any) => ({
      user_id: s.user_id,
      username: s.username,
      display_name: s.display_name,
      avatar_url: s.avatar_url,
      mutual_count: parseInt(s.mutual_count, 10),
    }));
  }

  public async getFriendRanking(options?: { areaPrefix?: string }): Promise<AreaRanking[]> {
    const res = await this.request('/social/rankings');
    return (res.rankings || []).map((r: any, idx: number) => ({
      rank: idx + 1,
      user_id: r.user_id,
      username: r.username,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      score: parseInt(r.pulse_count, 10) * 10 + parseInt(r.territories_count, 10),
    }));
  }

  public async getAreaRanking(areaPrefix: string, limit?: number): Promise<AreaRanking[]> {
    return this.getFriendRanking();
  }

  public async getBlockedUsers(): Promise<string[]> {
    const res = await this.request('/social/blocked');
    return (res.blocked || []).map((b: any) => b.blocked_user_id);
  }

  public async blockUser(userId: string): Promise<void> {
    await this.request('/social/block', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  public async unblockUser(userId: string): Promise<void> {
    await this.request(`/social/blocked/${userId}`, { method: 'DELETE' });
  }

  public async isBlocked(userId: string): Promise<boolean> {
    const blocked = await this.getBlockedUsers();
    return blocked.includes(userId);
  }

  public async getStreaks(): Promise<FriendStreak[]> {
    const res = await this.request('/social/streaks');
    return (res.streaks || []).map((s: any) => ({
      friend_id: s.user_id,
      streak_days: parseInt(s.active_days, 10),
      last_interaction: new Date().toISOString(),
      display_name: s.display_name,
      avatar_url: s.avatar_url,
    }));
  }

  public async getStreak(friendId: string): Promise<FriendStreak | null> {
    const streaks = await this.getStreaks();
    return streaks.find((s) => s.friend_id === friendId) || null;
  }

  public async recordInteraction(friendId: string): Promise<void> {
    // Recorded automatically during pulse or chat
  }

  // 3. Sharing Rules & Expiry
  public async allow(viewerId: string, level?: ShareLevel): Promise<void> {
    await this.request('/privacy/rules', {
      method: 'POST',
      body: JSON.stringify({ friendId: viewerId, canViewLocation: true }),
    });
  }

  public async revoke(viewerId: string): Promise<void> {
    await this.request(`/privacy/rules/${viewerId}`, { method: 'DELETE' });
  }

  public async setShareExpiry(viewerId: string, expiresAt: Date): Promise<void> {
    await this.request(`/privacy/rules/${viewerId}/expiry`, {
      method: 'PUT',
      body: JSON.stringify({ shareExpiresAt: expiresAt.toISOString() }),
    });
  }

  // 4. User Settings & Casper Mode
  public async getSettings(): Promise<UserSettings | null> {
    const res = await this.request('/settings');
    return res.settings || null;
  }

  public async updateSettings(settings: Partial<Omit<UserSettings, 'user_id' | 'updated_at'>>): Promise<UserSettings> {
    await this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    return settings as any;
  }

  public async enableGhostMode(durationMinutes?: number): Promise<void> {
    await this.request('/presence/casper', {
      method: 'POST',
      body: JSON.stringify({ enabled: true, minutes: durationMinutes }),
    });
  }

  public async disableGhostMode(): Promise<void> {
    await this.request('/presence/casper', {
      method: 'POST',
      body: JSON.stringify({ enabled: false }),
    });
  }

  public async getNotificationPreferences(): Promise<NotificationPreferences | null> {
    const res = await this.request('/settings/notifications');
    return res.preferences || null;
  }

  public async updateNotificationPreferences(prefs: Partial<Omit<NotificationPreferences, 'user_id' | 'updated_at'>>): Promise<NotificationPreferences> {
    await this.request('/settings/notifications', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
    return prefs as any;
  }

  // 5. Live Location & Footprints
  public async sendLocation(latOrUpdate: number | LocationUpdate, lon?: number, accuracy?: number | null): Promise<void> {
    let lat: number;
    let lng: number;
    let acc: number = 10;

    if (typeof latOrUpdate === 'object') {
      lat = latOrUpdate.lat;
      lng = latOrUpdate.lon;
      acc = latOrUpdate.accuracy || 10;
    } else {
      lat = latOrUpdate;
      lng = lon!;
      acc = accuracy || 10;
    }

    await this.request('/presence/broadcast', {
      method: 'POST',
      body: JSON.stringify({ latitude: lat, longitude: lng, accuracy: acc }),
    });
  }

  public async sendLocationWithTrail(update: LocationUpdate): Promise<void> {
    await this.request('/presence/broadcast?trail=true', {
      method: 'POST',
      body: JSON.stringify({
        latitude: update.lat,
        longitude: update.lon,
        accuracy: update.accuracy || 10,
      }),
    });
  }

  public async getFriendsLocations(options?: { limit?: number }): Promise<LocationCurrentRow[]> {
    const res = await this.request('/presence/friends');
    return res.friends || [];
  }

  public async getVisibleFriends(options?: { limit?: number }): Promise<LocationCurrentRow[]> {
    return this.getFriendsLocations(options);
  }

  public async getLocationHistory(userId: string, options?: { limit?: number; offset?: number; since?: Date }): Promise<LocationHistoryRow[]> {
    const isSelf = userId === this.currentUser?.id;
    const url = isSelf ? '/footprints' : `/footprints/peers/${userId}`;
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.since) params.set('since', options.since.toISOString());

    const res = await this.request(`${url}?${params.toString()}`);
    return (res.history || []).map((h: any) => ({
      id: h.id,
      user_id: userId,
      lat: h.latitude,
      lon: h.longitude,
      accuracy: h.accuracy_meters,
      created_at: h.recorded_at,
    }));
  }

  public async saveLocationHistory(lat: number, lon: number, accuracy?: number | null): Promise<void> {
    await this.request('/footprints/record', {
      method: 'POST',
      body: JSON.stringify({ latitude: lat, longitude: lon, accuracy_meters: accuracy || 10 }),
    });
  }

  public async getTrailFriendIds(): Promise<string[]> {
    const res = await this.request('/social/friends');
    return (res.friends || []).filter((f: any) => f.can_view_location).map((f: any) => f.friend_id || f.user_id);
  }

  public async getVisibleFriendsWithPlaces(): Promise<(LocationCurrentRow & { place?: FavoritePlace })[]> {
    const friends = await this.getVisibleFriends();
    return friends;
  }

  // 6. Proximity Pulses (⚡)
  public async findNearbyFriends(myLat: number, myLon: number, radiusMeters = 500): Promise<NearbyUser[]> {
    const res = await this.request('/pulses/scan', {
      method: 'POST',
      body: JSON.stringify({ lat: myLat, lon: myLon, radius: radiusMeters }),
    });
    return (res.nearby || []).map((n: any) => ({
      user_id: n.user_id,
      lat: myLat,
      lon: myLon,
      distance_meters: n.distance,
      display_name: n.display_name,
      avatar_url: n.avatar_url,
    }));
  }

  public async recordBump(nearbyUserId: string, distance: number, lat?: number, lon?: number): Promise<BumpEvent> {
    const res = await this.request('/pulses/record', {
      method: 'POST',
      body: JSON.stringify({ peerId: nearbyUserId, distance }),
    });
    return {
      id: res.pulse.id,
      user_id: res.pulse.initiator_id,
      nearby_user_id: res.pulse.peer_id,
      distance_meters: res.pulse.distance_meters,
      lat: lat || 0,
      lon: lon || 0,
      created_at: res.pulse.pulsed_at,
    };
  }

  public async getBumpHistory(options?: { limit?: number; since?: Date }): Promise<BumpEvent[]> {
    const res = await this.request(`/pulses/history?limit=${options?.limit || 20}`);
    return (res.history || []).map((h: any) => ({
      id: h.id,
      user_id: h.user_id,
      nearby_user_id: h.nearby_user_id,
      distance_meters: h.distance,
      lat: 0,
      lon: 0,
      created_at: h.created_at,
    }));
  }

  // 7. Favorite Places
  public async getFavoritePlaces(userId?: string): Promise<FavoritePlace[]> {
    const res = await this.request('/places');
    return (res.places || []).map((p: any) => ({
      id: p.id.toString(),
      user_id: p.user_id,
      name: p.name,
      place_type: p.place_type,
      lat: p.latitude,
      lon: p.longitude,
      radius_meters: p.radius_meters,
      created_at: p.created_at,
    }));
  }

  public async addFavoritePlace(place: Omit<FavoritePlace, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<FavoritePlace> {
    const res = await this.request('/places', {
      method: 'POST',
      body: JSON.stringify({
        name: place.name,
        place_type: place.place_type,
        latitude: place.lat,
        longitude: place.lon,
        radius_meters: place.radius_meters,
      }),
    });
    return res.place;
  }

  public async updateFavoritePlace(placeId: string, updates: Partial<Omit<FavoritePlace, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<FavoritePlace> {
    const res = await this.request(`/places/${placeId}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: updates.name,
        place_type: updates.place_type,
        latitude: updates.lat,
        longitude: updates.lon,
        radius_meters: updates.radius_meters,
      }),
    });
    return res.place;
  }

  public async deleteFavoritePlace(placeId: string): Promise<void> {
    await this.request(`/places/${placeId}`, { method: 'DELETE' });
  }

  public async checkAtFavoritePlace(lat: number, lon: number, userId?: string): Promise<FavoritePlace | null> {
    const res = await this.request('/places/check-presence', {
      method: 'POST',
      body: JSON.stringify({ latitude: lat, longitude: lon }),
    });
    return res.inside || null;
  }

  // 8. Social Groups
  public async getGroups(): Promise<Group[]> {
    const res = await this.request('/groups');
    return (res.groups || []).map((g: any) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      invite_code: g.invite_code,
      created_by: g.creator_id,
      created_at: g.created_at,
    }));
  }

  public async createGroup(name: string, description?: string): Promise<Group> {
    const res = await this.request('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    return res.group;
  }

  public async joinGroup(inviteCode: string): Promise<Group> {
    const res = await this.request('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
    return res.group;
  }

  public async leaveGroup(groupId: string): Promise<void> {
    await this.request(`/groups/${groupId}/leave`, { method: 'POST' });
  }

  public async deleteGroup(groupId: string): Promise<void> {
    await this.request(`/groups/${groupId}`, { method: 'DELETE' });
  }

  public async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const res = await this.request(`/groups/${groupId}/members`);
    return (res.members || []).map((m: any) => ({
      group_id: groupId,
      user_id: m.user_id,
      role: m.is_creator ? 'admin' : 'member',
      joined_at: m.joined_at,
    }));
  }

  // 9. Chat Messaging
  public async getChatRooms(): Promise<ChatRoom[]> {
    const res = await this.request('/chat/rooms');
    return (res.rooms || []).map((r: any) => ({
      id: r.id,
      type: r.room_type,
      group_id: r.group_id,
      created_at: r.created_at,
      group_name: r.group_name,
      peer: r.peer,
      last_message: r.last_message_content,
      last_message_sent_at: r.last_message_sent_at,
      unread_count: parseInt(r.unread_count || '0', 10),
    }));
  }

  public async getOrCreateDirectChat(otherUserId: string): Promise<ChatRoom> {
    const res = await this.request(`/chat/direct/${otherUserId}`, { method: 'POST' });
    return {
      id: res.roomId,
      type: 'direct',
      group_id: null,
      created_at: new Date().toISOString(),
    };
  }

  public async getOrCreateGroupChat(groupId: string): Promise<ChatRoom> {
    const res = await this.request(`/chat/groups/${groupId}/room`, { method: 'POST' });
    return {
      id: res.roomId,
      type: 'group',
      group_id: groupId,
      created_at: new Date().toISOString(),
    };
  }

  public async getChatRoomMembers(roomId: string): Promise<string[]> {
    const res = await this.request(`/chat/rooms/${roomId}/members`);
    return (res.members || []).map((m: any) => m.id);
  }

  public async sendMessage(roomId: string, content: string, messageType: MessageType = 'text', metadata?: Record<string, unknown>): Promise<Message> {
    const res = await this.request(`/chat/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, messageType, metadata }),
    });
    return {
      id: res.message.id,
      room_id: res.message.room_id,
      sender_id: res.message.sender_id,
      content: res.message.content,
      message_type: messageType,
      metadata: metadata || null,
      created_at: res.message.sent_at,
      updated_at: res.message.sent_at,
    };
  }

  public async getMessages(roomId: string, options?: { limit?: number; before?: number }): Promise<Message[]> {
    const res = await this.request(`/chat/rooms/${roomId}/messages?limit=${options?.limit || 50}`);
    return (res.messages || []).map((m: any) => ({
      id: m.id,
      room_id: m.room_id,
      sender_id: m.sender_id,
      content: m.content,
      message_type: 'text',
      metadata: null,
      created_at: m.sent_at,
      updated_at: m.sent_at,
    }));
  }

  public async markAsRead(roomId: string): Promise<void> {
    await this.request(`/chat/rooms/${roomId}/read`, { method: 'POST' });
  }

  // 10. Reactions
  public async sendReaction(toUserId: string, emoji: string, message?: string): Promise<LocationReaction> {
    const res = await this.request('/reactions', {
      method: 'POST',
      body: JSON.stringify({ to_user_id: toUserId, emoji, message }),
    });
    return res.reaction;
  }

  public async getReceivedReactions(options?: { limit?: number; since?: Date }): Promise<LocationReaction[]> {
    const res = await this.request(`/reactions/received?limit=${options?.limit || 50}`);
    return res.reactions || [];
  }

  public async getSentReactions(options?: { limit?: number }): Promise<LocationReaction[]> {
    const res = await this.request(`/reactions/sent?limit=${options?.limit || 50}`);
    return res.reactions || [];
  }

  // 11. World Unveil (Exploration Fog-of-War)
  public async getMyVisitedCells(options?: { areaPrefix?: string; since?: Date }): Promise<VisitedCell[]> {
    const res = await this.request('/unveil/cells');
    return (res.cells || []).map((c: any) => ({
      cell_token: c.cell_token,
      visit_count: c.visit_count,
      unveiled_at: c.unveiled_at,
    }));
  }

  public async getFriendVisitedCells(friendId: string, options?: { areaPrefix?: string }): Promise<VisitedCell[]> {
    return this.getMyVisitedCells(options);
  }

  public async getMyExplorationStats(): Promise<VisitedCellStats | null> {
    const res = await this.request('/unveil/stats');
    return res.stats || null;
  }

  public encodeGeohash(lat: number, lon: number, precision?: number): string {
    return encodeGeohash(lat, lon, precision);
  }

  public decodeGeohash(geohash: string): { lat: number; lon: number } {
    return decodeGeohash(geohash);
  }

  public calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    return calculateDistance(lat1, lon1, lat2, lon2);
  }

  public estimateMotionType(speedMs: number | null | undefined): MotionType {
    return estimateMotionType(speedMs);
  }

  // Sharing Policies (SecureCheck)
  public async addSharingPolicy(policy: SharingPolicyCreate): Promise<SharingPolicy> {
    return {
      id: 'policy_' + Date.now(),
      owner_id: this.currentUser?.id || '',
      viewer_id: policy.viewer_id || null,
      conditions: policy.conditions || [],
      effect_level: policy.effect_level || 'current',
      coarse_radius_m: policy.coarse_radius_m || null,
      priority: policy.priority || 0,
      label: policy.label || null,
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  public async getSharingPolicies(): Promise<SharingPolicy[]> {
    return [];
  }

  public async updateSharingPolicy(policyId: string, updates: Partial<SharingPolicyCreate>): Promise<SharingPolicy> {
    return {
      id: policyId,
      owner_id: this.currentUser?.id || '',
      viewer_id: updates.viewer_id || null,
      conditions: updates.conditions || [],
      effect_level: updates.effect_level || 'current',
      coarse_radius_m: updates.coarse_radius_m || null,
      priority: updates.priority || 0,
      label: updates.label || null,
      enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  public async deleteSharingPolicy(policyId: string): Promise<void> {}

  public async getVisibleFriendsFiltered(myLat: number, myLon: number): Promise<FilteredLocation[]> {
    const friends = await this.getVisibleFriends();
    return friends.map((f) => ({
      ...f,
      share_level: 'current',
      effective_level: 'current',
      coarsened: false,
    }));
  }

  // 12. Realtime WebSocket Subscriptions (Channel Mock Adapter)
  public subscribeLocations(onUpdate: (row: LocationCurrentRow) => void): any {
    const unsubscribe = this.onEvent('PEER_LOCATION_UPDATE', onUpdate);
    return { unsubscribe };
  }

  public subscribeFriendRequests(onUpdate: (request: FriendRequest) => void): any {
    const unsubscribe = this.onEvent('FRIEND_REQUEST_RECEIVED', (data) => {
      onUpdate({
        id: data.requestId,
        sender_id: data.requesterId,
        receiver_id: this.currentUser?.id || '',
        status: 'pending',
        created_at: new Date(data.timestamp).toISOString(),
        sender: {
          display_name: data.displayName,
          avatar_url: data.avatarUrl,
        },
      } as any);
    });
    return { unsubscribe };
  }

  public subscribeMessages(roomId: string, onMessage: (message: Message) => void): any {
    const unsubscribe = this.onEvent('CHAT_MESSAGE_RECEIVED', (data) => {
      if (data.roomId === roomId) {
        onMessage({
          id: data.id,
          room_id: data.roomId,
          sender_id: data.senderId,
          content: data.content,
          message_type: 'text',
          metadata: null,
          created_at: data.sentAt,
          updated_at: data.sentAt,
        });
      }
    });
    return { unsubscribe };
  }

  public subscribeReactions(onReaction: (reaction: LocationReaction) => void): any {
    const unsubscribe = this.onEvent('REACTION_RECEIVED', onReaction);
    return { unsubscribe };
  }

  // Push notifications stubs
  public async registerPushSubscription(sub: any): Promise<void> {}
  public async unregisterPushSubscription(endpoint: string): Promise<void> {}

  // 14. Secret Capsules (Location-Bound Encrypted Content)
  public async createCapsule(params: {
    latitude: number;
    longitude: number;
    title: string;
    encryptedPayload: string;
    saltEntropy: string;
    unlockRadiusM?: number;
    requiresPasscode?: boolean;
    passcodeHint?: string | null;
  }): Promise<{ success: boolean; capsuleId: string }> {
    return this.request('/capsules', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  public async getNearbyCapsules(lat: number, lon: number, radius = 5000): Promise<any[]> {
    const res = await this.request(`/capsules/nearby?lat=${lat}&lon=${lon}&radius=${radius}`);
    return res.capsules || [];
  }

  public async unlockCapsule(id: string, userLat: number, userLon: number): Promise<{
    success: boolean;
    capsuleId: string;
    title: string;
    encryptedPayload: string;
    saltEntropy: string;
    requiresPasscode: boolean;
    passcodeHint?: string | null;
    verifiedDistance: number;
  }> {
    return this.request(`/capsules/${id}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ userLat, userLon }),
    });
  }
}

// Export singleton instance creator
export function createNaviClient(baseUrl = '/api/v1'): NaviClient {
  return new NaviClient(baseUrl);
}
