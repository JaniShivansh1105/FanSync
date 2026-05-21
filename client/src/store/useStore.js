// ──────────────────────────────────────────────────────────
// FanSync — Zustand Global Store
// Manages: user, match state, polls, chat, leaderboard, hype
// ──────────────────────────────────────────────────────────

import { create } from 'zustand';

const useStore = create((set, get) => ({
  // ── User ──
  user: null,
  setUser: (user) => set({ user }),

  // ── Match State ──
  matchState: null,
  setMatchState: (state) => set({ matchState: state }),

  // ── Polls ──
  activePoll: null,
  pollHistory: [],
  userVote: null,
  pollVotes: {},
  setActivePoll: (poll) => set({ activePoll: poll, userVote: null, pollVotes: {} }),
  setUserVote: (vote) => set({ userVote: vote }),
  setPollVotes: (votes) => set({ pollVotes: votes }),
  resolvePoll: (result) => {
    const { activePoll, userVote, user } = get();
    if (activePoll && activePoll.pollId === result.pollId) {
      // Update user points/streak from the resolved result if user voted correctly
      let updatedUser = user;
      if (user && userVote) {
        const isCorrect = userVote === result.correctOption;
        updatedUser = {
          ...user,
          currentStreak: isCorrect ? (user.currentStreak || 0) + 1 : 0,
          totalPoints: isCorrect
            ? (user.totalPoints || 0) + 10 + Math.min(((user.currentStreak || 0) + 1), 5) * 2
            : user.totalPoints || 0,
        };
        localStorage.setItem('fansync_user', JSON.stringify(updatedUser));
      }

      set((s) => ({
        activePoll: null,
        user: updatedUser,
        pollHistory: [{ ...activePoll, result }, ...s.pollHistory].slice(0, 10),
      }));
    }
  },

  // ── Chat ──
  chatMessages: [],
  addChatMessage: (msg) => set((s) => ({
    chatMessages: [...s.chatMessages, msg].slice(-100),
  })),

  // ── Leaderboard ──
  leaderboard: [],
  setLeaderboard: (lb) => set({ leaderboard: lb }),

  // ── Hype Meter ──
  hypeLevel: 0,
  setHypeLevel: (level) => set({ hypeLevel: level }),

  // ── Connected Users ──
  userCount: 0,
  setUserCount: (count) => set({ userCount: count }),

  // ── Trivia ──
  activeTrivia: null,
  setActiveTrivia: (trivia) => set({ activeTrivia: trivia }),

  // ── Highlights ──
  highlight: null,
  setHighlight: (h) => {
    set({ highlight: h });
    setTimeout(() => set({ highlight: null }), 3500);
  },

  // ── Socket status ──
  isConnected: false,
  setConnected: (v) => set({ isConnected: v }),
}));

export default useStore;
