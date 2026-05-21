// ──────────────────────────────────────────────────────────
// FanSync — Socket.io Real-Time Engine
// Handles all WebSocket events: polls, votes, chat, leaderboard.
// Implements in-memory vote caching with periodic bulk writes.
// ──────────────────────────────────────────────────────────

import Filter from 'bad-words';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import Prediction from '../models/Prediction.js';
import FanChat from '../models/FanChat.js';
import geminiAgent from '../services/geminiAgent.js';

const filter = new Filter();

// In-memory vote cache: Map<pollId, Map<userId, { selectedOption, userId }>>
const voteCache = new Map();
// Active polls: Map<pollId, pollData>
const activePolls = new Map();
// Connected users: Map<socketId, userData>
const connectedUsers = new Map();
// Hype meter: rolling message timestamps
let hypeMessages = [];
// Tracks the match state at poll creation + resolution for deterministic answers
const pollMatchSnapshots = new Map();

const AVATAR_THEMES = ['electric', 'fire', 'cosmic', 'neon', 'phantom'];

function toPublicUser(user) {
  const u = user?.toObject ? user.toObject() : user;
  return {
    id: u._id?.toString?.() || u._id,
    username: u.username,
    totalPoints: u.totalPoints || 0,
    currentStreak: u.currentStreak || 0,
    bestStreak: u.bestStreak || 0,
    avatarTheme: u.avatarTheme || 'electric',
  };
}

async function createGuestUser() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = uuidv4().replace(/-/g, '').slice(0, 8);
    const username = `fan_${suffix}`;
    try {
      const user = await User.create({
        username,
        avatarTheme: AVATAR_THEMES[Math.floor(Math.random() * AVATAR_THEMES.length)],
      });
      return user;
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
  }
  throw new Error('Failed to create guest user');
}

export function setupSocketHandlers(io, matchSimulator) {
  // ── Periodic bulk write of cached votes to MongoDB (every 10s) ──
  const bulkWriteTimer = setInterval(async () => {
    for (const [pollId, votes] of voteCache.entries()) {
      if (votes.size === 0) continue;
      const ops = [];
      for (const [userId, data] of votes.entries()) {
        ops.push({
          updateOne: {
            filter: { userId: data.userId, pollId },
            update: { $setOnInsert: { userId: data.userId, pollId, selectedOption: data.selectedOption, votedAt: new Date() } },
            upsert: true,
          },
        });
      }
      try {
        await Prediction.bulkWrite(ops);
      } catch (err) {
        console.error('Bulk write error:', err.message);
      }
    }
  }, 10000);

  // ── Periodic leaderboard broadcast (every 15s for demo responsiveness) ──
  const leaderboardTimer = setInterval(async () => {
    try {
      const top = await User.find({})
        .sort({ totalPoints: -1 })
        .limit(20)
        .select('username totalPoints currentStreak bestStreak avatarTheme totalPredictions correctPredictions')
        .lean();
      // Compute accuracy server-side since virtuals aren't included in lean()
      const withAccuracy = top.map((u) => ({
        ...u,
        accuracy: u.totalPredictions > 0 ? Math.round((u.correctPredictions / u.totalPredictions) * 100) : 0,
      }));
      io.emit('leaderboard_update', { leaderboard: withAccuracy, timestamp: new Date() });
    } catch (err) {
      console.error('Leaderboard error:', err.message);
    }
  }, 15000);

  // ── Hype meter broadcast (every 5s) ──
  const hypeTimer = setInterval(() => {
    const now = Date.now();
    hypeMessages = hypeMessages.filter(t => now - t < 30000);
    const hypeLevel = Math.min(100, Math.round((hypeMessages.length / 50) * 100));
    io.emit('hype_update', { level: hypeLevel, messageCount: hypeMessages.length });
  }, 5000);

  // ── Match event listeners ──
  let pollCooldown = false;
  matchSimulator.on('ball_bowled', async (state) => {
    io.emit('match_update', state);

    // Generate poll every 3 balls (avoid spamming)
    if (!pollCooldown && state.totalBalls % 3 === 0 && state.totalBalls > 0) {
      pollCooldown = true;
      setTimeout(() => { pollCooldown = false; }, 20000);

      try {
        const poll = await geminiAgent.generatePoll(state);
        activePolls.set(poll.pollId, { ...poll, votes: {}, totalVotes: 0 });
        voteCache.set(poll.pollId, new Map());
        // Snapshot the match state at poll creation for deterministic resolution
        pollMatchSnapshots.set(poll.pollId, {
          createdAt: state.totalBalls,
          scoreAtCreation: state.score,
          wicketsAtCreation: state.wickets,
          overAtCreation: state.over,
          strikerAtCreation: state.striker,
        });
        io.emit('poll_published', poll);

        // Auto-resolve poll after expiry + buffer
        setTimeout(() => resolvePoll(io, poll.pollId, matchSimulator.getState()), (poll.expiresIn + 5) * 1000);
      } catch (err) {
        console.error('Poll generation error:', err.message);
      }
    }
  });

  matchSimulator.on('boundary', (state) => {
    io.emit('match_highlight', {
      type: 'boundary',
      outcome: state.outcome,
      striker: state.striker,
      score: state.score,
      wickets: state.wickets,
    });
  });

  matchSimulator.on('wicket', (state) => {
    io.emit('match_highlight', {
      type: 'wicket',
      outcome: state.outcome,
      striker: state.striker,
      score: state.score,
      wickets: state.wickets,
    });
  });

  matchSimulator.on('innings_break', async (state) => {
    io.emit('innings_break', state);
    try {
      const trivia = await geminiAgent.generateTrivia(state);
      io.emit('trivia_published', trivia);
    } catch (err) {
      console.error('Trivia generation error:', err.message);
    }
  });

  matchSimulator.on('strategic_timeout', async (state) => {
    io.emit('strategic_timeout', state);
    try {
      const trivia = await geminiAgent.generateTrivia(state);
      io.emit('trivia_published', trivia);
    } catch (err) {
      console.error('Trivia generation error:', err.message);
    }
  });

  // ── Socket connection handler ──
  io.on('connection', (socket) => {
    console.log(`🔌 [Socket] Client connected: ${socket.id}`);

    // Send current match state on connect
    socket.emit('match_update', matchSimulator.getState());

    // Send the latest active poll (only the most recent, not all)
    const pollEntries = [...activePolls.entries()];
    if (pollEntries.length > 0) {
      const [, latestPoll] = pollEntries[pollEntries.length - 1];
      socket.emit('poll_published', latestPoll);
      // Also send current vote tally
      socket.emit('poll_votes_update', { pollId: latestPoll.pollId, votes: latestPoll.votes, totalVotes: latestPoll.totalVotes });
    }

    // ── Associate socket with a guest user ──
    socket.on('authenticate', async (data = {}) => {
      try {
        let user = null;
        if (data.userId) {
          try {
            user = await User.findById(data.userId);
          } catch {
            user = null;
          }
        }
        if (!user) {
          user = await createGuestUser();
        }

        connectedUsers.set(socket.id, { ...user.toObject(), socketId: socket.id });
        await User.updateOne({ _id: user._id }, { isOnline: true });
        io.emit('user_count', { count: connectedUsers.size });
        socket.emit('authenticated', { success: true, user: toPublicUser(user) });

        // Send initial leaderboard to newly connected user
        try {
          const top = await User.find({})
            .sort({ totalPoints: -1 })
            .limit(20)
            .select('username totalPoints currentStreak bestStreak avatarTheme totalPredictions correctPredictions')
            .lean();
          const withAccuracy = top.map((u) => ({
            ...u,
            accuracy: u.totalPredictions > 0 ? Math.round((u.correctPredictions / u.totalPredictions) * 100) : 0,
          }));
          socket.emit('leaderboard_update', { leaderboard: withAccuracy, timestamp: new Date() });
        } catch {}
      } catch (err) {
        socket.emit('authenticated', { success: false, error: err.message });
      }
    });

    // ── Vote submission ──
    socket.on('vote_submitted', async (data) => {
      const { pollId, selectedOption, userId } = data;
      if (!pollId || !selectedOption || !userId) return;

      const poll = activePolls.get(pollId);
      if (!poll) return socket.emit('vote_error', { message: 'Poll expired or not found' });

      // Check if already voted (in-memory check for speed)
      const pollVotes = voteCache.get(pollId);
      if (pollVotes && pollVotes.has(userId)) {
        return socket.emit('vote_error', { message: 'Already voted on this poll' });
      }

      // Cache the vote
      if (pollVotes) pollVotes.set(userId, { selectedOption, userId });
      poll.totalVotes = (poll.totalVotes || 0) + 1;
      if (!poll.votes[selectedOption]) poll.votes[selectedOption] = 0;
      poll.votes[selectedOption]++;

      hypeMessages.push(Date.now());
      socket.emit('vote_confirmed', { pollId, selectedOption });
      io.emit('poll_votes_update', { pollId, votes: poll.votes, totalVotes: poll.totalVotes });
    });

    // ── Live chat message ──
    socket.on('live_chat_message', async (data) => {
      const { message, userId, username, avatarTheme } = data;
      if (!message || !userId || !username) return;
      if (message.trim().length === 0 || message.length > 280) return;

      // Profanity filter
      let cleanMessage;
      try {
        cleanMessage = filter.clean(message);
      } catch {
        cleanMessage = message;
      }

      // Simple sentiment: positive words = +, negative = -
      const sentiment = computeSentiment(cleanMessage);

      const chatMsg = {
        userId, username, avatarTheme: avatarTheme || 'electric',
        message: cleanMessage, sentimentScore: sentiment,
        timestamp: new Date(), matchId: matchSimulator.getState().matchId,
      };

      // Broadcast to all clients
      io.emit('live_chat_message', chatMsg);
      hypeMessages.push(Date.now());

      // Persist (fire and forget)
      FanChat.create(chatMsg).catch(() => {});
    });

    // ── Disconnect ──
    socket.on('disconnect', async () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        await User.updateOne({ _id: user._id }, { isOnline: false }).catch(() => {});
        connectedUsers.delete(socket.id);
      }
      io.emit('user_count', { count: connectedUsers.size });
      console.log(`🔌 [Socket] Client disconnected: ${socket.id}`);
    });
  });
}

// ── Poll resolution logic (deterministic) ──
async function resolvePoll(io, pollId, currentMatchState) {
  const poll = activePolls.get(pollId);
  if (!poll) return;

  const snapshot = pollMatchSnapshots.get(pollId) || {};

  // Determine the correct answer based on actual match outcomes between poll creation and now
  const correctOption = determineCorrectOption(poll, snapshot, currentMatchState);

  // Update all predictions for this poll
  const votes = voteCache.get(pollId);
  if (votes) {
    for (const [userId, voteData] of votes.entries()) {
      const isCorrect = voteData.selectedOption === correctOption;
      const basePoints = isCorrect ? 10 : 0;

      if (isCorrect) {
        try {
          const user = await User.findById(voteData.userId);
          if (user) {
            user.currentStreak += 1;
            user.correctPredictions += 1;
            user.totalPredictions += 1;
            if (user.currentStreak > user.bestStreak) user.bestStreak = user.currentStreak;
            // Streak multiplier: 1x base, +2 per streak level (capped at 5)
            const streakBonus = Math.min(user.currentStreak, 5) * 2;
            user.totalPoints += basePoints + streakBonus;
            await user.save();
          }
        } catch (err) {
          console.error('Error updating winner:', err.message);
        }
      } else {
        try {
          await User.updateOne({ _id: voteData.userId }, { $set: { currentStreak: 0 }, $inc: { totalPredictions: 1 } });
        } catch {}
      }
    }
  }

  // Broadcast resolution
  io.emit('poll_resolved', { pollId, correctOption, matchState: currentMatchState });

  // Immediately broadcast updated leaderboard after resolution
  try {
    const top = await User.find({})
      .sort({ totalPoints: -1 })
      .limit(20)
      .select('username totalPoints currentStreak bestStreak avatarTheme totalPredictions correctPredictions')
      .lean();
    const withAccuracy = top.map((u) => ({
      ...u,
      accuracy: u.totalPredictions > 0 ? Math.round((u.correctPredictions / u.totalPredictions) * 100) : 0,
    }));
    io.emit('leaderboard_update', { leaderboard: withAccuracy, timestamp: new Date() });
  } catch {}

  // Cleanup
  activePolls.delete(pollId);
  voteCache.delete(pollId);
  pollMatchSnapshots.delete(pollId);
}

/**
 * Deterministic poll resolution: compares match state at poll creation vs now
 * to pick the correct option based on what actually happened.
 */
function determineCorrectOption(poll, snapshot, currentState) {
  const q = (poll.question || '').toLowerCase();
  const opts = poll.options || [];

  const runsSinceCreation = currentState.score - (snapshot.scoreAtCreation || 0);
  const wicketsSinceCreation = currentState.wickets - (snapshot.wicketsAtCreation || 0);
  const ballsSinceCreation = currentState.totalBalls - (snapshot.createdAt || 0);

  // ── "Boundary on the next ball?" type questions ──
  if (q.includes('boundary') && q.includes('next ball')) {
    const lastOutcome = currentState.outcome;
    if (lastOutcome?.isBoundary) {
      if (lastOutcome.runs === 6) {
        const sixOpt = opts.find(o => o.toLowerCase().includes('six'));
        if (sixOpt) return sixOpt;
      }
      const fourOpt = opts.find(o => o.toLowerCase().includes('four'));
      if (fourOpt) return fourOpt;
      const yesOpt = opts.find(o => o.toLowerCase().includes('yes'));
      if (yesOpt) return yesOpt;
    }
    const noOpt = opts.find(o => o.toLowerCase().includes('no'));
    return noOpt || opts[opts.length - 1];
  }

  // ── "How many runs in this over?" type questions ──
  if (q.includes('runs') && (q.includes('over') || q.includes('this over'))) {
    const runs = runsSinceCreation;
    // Match to the correct bracket
    for (const opt of opts) {
      const match = opt.match(/(\d+)\s*[-–]\s*(\d+)/);
      if (match) {
        const low = parseInt(match[1]), high = parseInt(match[2]);
        if (runs >= low && runs <= high) return opt;
      }
      const plusMatch = opt.match(/(\d+)\+/);
      if (plusMatch && runs >= parseInt(plusMatch[1])) return opt;
    }
    // Fallback: pick the bracket that's closest
    if (runs <= 5) return opts[0];
    if (runs <= 10) return opts.length > 1 ? opts[1] : opts[0];
    return opts[opts.length - 1];
  }

  // ── "Will a wicket fall?" type questions ──
  if (q.includes('wicket')) {
    if (wicketsSinceCreation > 0) {
      const yesOpt = opts.find(o => o.toLowerCase().includes('yes'));
      return yesOpt || opts[0];
    }
    const noOpt = opts.find(o => o.toLowerCase().includes('no'));
    return noOpt || opts[opts.length - 1];
  }

  // ── "Run rate" type questions ──
  if (q.includes('run rate') || q.includes('runrate')) {
    const crr = parseFloat(currentState.currentRunRate) || 0;
    for (const opt of opts) {
      const match = opt.match(/(\d+)\s*[-–]\s*(\d+)/);
      if (match) {
        const low = parseInt(match[1]), high = parseInt(match[2]);
        if (crr >= low && crr <= high) return opt;
      }
      if (opt.toLowerCase().includes('under') || opt.toLowerCase().includes('below')) {
        const numMatch = opt.match(/(\d+)/);
        if (numMatch && crr < parseInt(numMatch[1])) return opt;
      }
      const plusMatch = opt.match(/(\d+)\+/);
      if (plusMatch && crr >= parseInt(plusMatch[1])) return opt;
    }
    return opts[Math.min(1, opts.length - 1)];
  }

  // ── "Score" type questions (will score reach X?) ──
  if (q.includes('score') || q.includes('total')) {
    const score = currentState.score;
    for (const opt of opts) {
      const match = opt.match(/(\d+)\s*[-–]\s*(\d+)/);
      if (match) {
        const low = parseInt(match[1]), high = parseInt(match[2]);
        if (score >= low && score <= high) return opt;
      }
    }
  }

  // ── Fallback: use the most-voted option for demo consistency ──
  // This ensures the "crowd" is usually right, which feels good in a demo
  const votes = poll.votes || {};
  let bestOption = opts[0];
  let bestCount = 0;
  for (const opt of opts) {
    if ((votes[opt] || 0) > bestCount) {
      bestCount = votes[opt];
      bestOption = opt;
    }
  }
  // If nobody voted, pick the first option deterministically
  return bestCount > 0 ? bestOption : opts[0];
}

// Simple keyword-based sentiment
function computeSentiment(msg) {
  const positive = ['great', 'awesome', 'amazing', 'six', 'four', 'boundary', 'wicket', 'love', 'wow', 'fire', 'yes', "let's go", 'goat', '🔥', '💥', '🎯', '🏏', '❤️'];
  const negative = ['bad', 'terrible', 'awful', 'boring', 'slow', 'out', 'no', 'hate', 'worst', '😡', '👎'];
  const lower = msg.toLowerCase();
  let score = 0;
  positive.forEach(w => { if (lower.includes(w)) score += 0.2; });
  negative.forEach(w => { if (lower.includes(w)) score -= 0.2; });
  return Math.max(-1, Math.min(1, score));
}
