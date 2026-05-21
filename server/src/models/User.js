// ──────────────────────────────────────────────────────────
// FanSync — User Schema
// ──────────────────────────────────────────────────────────
// Architectural Decision: We store totalPoints and currentStreak
// directly on the User document for O(1) leaderboard reads.
// A separate PointsHistory collection could be added for audit
// trails, but for real-time leaderboard performance this is optimal.
// ──────────────────────────────────────────────────────────

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // Unique username for display in chat and leaderboards
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Username must be at least 2 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },

    // Optional password (auth disabled in demo mode)
    password: {
      type: String,
      minlength: 6,
      select: false, // Never return password in queries by default
    },

    // Gamification: cumulative points from correct predictions
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Gamification: consecutive correct predictions (resets on wrong answer)
    currentStreak: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Longest streak ever achieved (for badges/achievements)
    bestStreak: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Visual theme for the user's avatar in chat
    // Options: 'electric', 'fire', 'cosmic', 'neon', 'phantom'
    avatarTheme: {
      type: String,
      enum: ['electric', 'fire', 'cosmic', 'neon', 'phantom'],
      default: 'electric',
    },

    // Track if user is currently connected via Socket.io
    isOnline: {
      type: Boolean,
      default: false,
    },

    // Total predictions made (for accuracy calculation)
    totalPredictions: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Correct predictions
    correctPredictions: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: prediction accuracy percentage
userSchema.virtual('accuracy').get(function () {
  if (this.totalPredictions === 0) return 0;
  return Math.round((this.correctPredictions / this.totalPredictions) * 100);
});

// Index for leaderboard queries — sort by totalPoints descending
userSchema.index({ totalPoints: -1 });


const User = mongoose.model('User', userSchema);
export default User;
