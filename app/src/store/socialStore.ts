import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateInviteCode, type Friend, type FleetActivity } from '@/lib/fleet-social';

export type PositionPrivacy = 'off' | 'blurred' | 'full';

interface SocialStore {
  friends: Friend[];
  inviteCode: string | null;
  privacyLevel: PositionPrivacy;
  activities: FleetActivity[];

  addFriend: (friend: Friend) => void;
  removeFriend: (id: string) => void;
  updateFriendStatus: (id: string, updates: Partial<Friend>) => void;
  setPrivacyLevel: (level: PositionPrivacy) => void;
  addActivity: (activity: FleetActivity) => void;
  generateNewInviteCode: () => string;
  clearActivities: () => void;
}

export const useSocialStore = create<SocialStore>()(
  persist(
    (set) => ({
      friends: [],
      inviteCode: null,
      privacyLevel: 'blurred',
      activities: [],

      addFriend: (friend) =>
        set((state) => ({
          friends: state.friends.some((f) => f.id === friend.id)
            ? state.friends
            : [...state.friends, friend],
        })),

      removeFriend: (id) =>
        set((state) => ({
          friends: state.friends.filter((f) => f.id !== id),
        })),

      updateFriendStatus: (id, updates) =>
        set((state) => ({
          friends: state.friends.map((f) => f.id === id ? { ...f, ...updates } : f),
        })),

      setPrivacyLevel: (level) => set({ privacyLevel: level }),

      addActivity: (activity) =>
        set((state) => ({
          activities: [activity, ...state.activities].slice(0, 200),
        })),

      generateNewInviteCode: () => {
        const code = generateInviteCode();
        set({ inviteCode: code });
        return code;
      },

      clearActivities: () => set({ activities: [] }),
    }),
    {
      name: 'harbormesh-social',
      partialize: (state) => ({
        friends: state.friends,
        inviteCode: state.inviteCode,
        privacyLevel: state.privacyLevel,
        activities: state.activities,
      }),
    }
  )
);
