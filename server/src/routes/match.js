// ──────────────────────────────────────────────────────────
// FanSync — Match & Leaderboard Routes
// ──────────────────────────────────────────────────────────

import { Router } from 'express';
import User from '../models/User.js';

const router = Router();

// Store reference to match simulator (set from index.js)
let matchSimRef = null;
export function setMatchSimulator(sim) { matchSimRef = sim; }

/**
 * GET /api/v1/match/status
 * Returns the current live match state
 */
router.get('/match/status', (req, res) => {
  if (!matchSimRef) {
    return res.status(503).json({ error: 'Match simulator not initialized' });
  }
  res.json({ status: 'live', match: matchSimRef.getState() });
});

/**
 * GET /api/v1/leaderboard
 * Returns top 10 users ranked by points
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const leaderboard = await User.find({})
      .sort({ totalPoints: -1 })
      .limit(limit)
      .select('username totalPoints currentStreak bestStreak avatarTheme totalPredictions correctPredictions')
      .lean();

    // Add rank and accuracy
    const ranked = leaderboard.map((u, i) => ({
      rank: i + 1,
      ...u,
      accuracy: u.totalPredictions > 0 ? Math.round((u.correctPredictions / u.totalPredictions) * 100) : 0,
    }));

    res.json({ leaderboard: ranked, total: ranked.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * POST /api/v1/webhooks/match-update
 * External endpoint to push match data and trigger AI agent
 */
router.post('/webhooks/match-update', (req, res) => {
  const payload = req.body;
  if (!payload || !payload.over) {
    return res.status(400).json({ error: 'Invalid payload. Required: over, score, wickets, striker' });
  }
  if (matchSimRef) {
    matchSimRef.updateFromWebhook(payload);
  }
  res.json({ message: 'Match state updated', received: payload });
});

export default router;
