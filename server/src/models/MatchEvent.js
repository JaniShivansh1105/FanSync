// ──────────────────────────────────────────────────────────
// FanSync — MatchEvent Schema
// ──────────────────────────────────────────────────────────
// Stores ball-by-ball events from the live match simulation.
// Each document represents a single delivery in the match.
// This acts as the "source of truth" for match state, which
// the AI agent consumes to generate context-aware content.
// ──────────────────────────────────────────────────────────

import mongoose from 'mongoose';

const matchEventSchema = new mongoose.Schema(
  {
    // Unique match identifier (e.g., "IPL2026_MI_CSK_01")
    matchId: {
      type: String,
      required: true,
      index: true,
    },

    // Ball number in format: over.ball (e.g., 5.3 = 5th over, 3rd ball)
    ballNumber: {
      type: Number,
      required: true,
    },

    // Current match score at this point
    score: {
      type: Number,
      required: true,
      min: 0,
    },

    // Wickets fallen so far
    wickets: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },

    // Runs scored on this specific ball
    runsOnBall: {
      type: Number,
      default: 0,
    },

    // Whether a wicket fell on this ball
    isWicket: {
      type: Boolean,
      default: false,
    },

    // Whether this ball was a boundary (4 or 6)
    isBoundary: {
      type: Boolean,
      default: false,
    },

    // Current striker batsman name
    striker: {
      type: String,
      required: true,
    },

    // Striker's current strike rate
    strikerSR: {
      type: Number,
      default: 0,
    },

    // Current bowler name
    bowler: {
      type: String,
      default: 'Unknown',
    },

    // Human-readable description of the ball event
    description: {
      type: String,
      required: true,
    },

    // The innings (1 or 2)
    innings: {
      type: Number,
      enum: [1, 2],
      default: 1,
    },

    // Required run rate (for second innings chase)
    requiredRunRate: {
      type: Number,
      default: null,
    },

    // Current run rate
    currentRunRate: {
      type: Number,
      default: 0,
    },

    // Timestamp of this event
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient match timeline queries
matchEventSchema.index({ matchId: 1, ballNumber: 1 });

const MatchEvent = mongoose.model('MatchEvent', matchEventSchema);
export default MatchEvent;
