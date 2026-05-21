// ──────────────────────────────────────────────────────────
// FanSync — FanChat Schema
// ──────────────────────────────────────────────────────────
// Stores chat messages from the real-time fan pulse feed.
// Messages are persisted after passing through the profanity
// filter. sentimentScore is computed server-side to power
// the aggregate "Hype Meter" visualization on the frontend.
// ──────────────────────────────────────────────────────────

import mongoose from 'mongoose';

const fanChatSchema = new mongoose.Schema(
  {
    // Reference to the User who sent this message
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // The username (denormalized for fast chat rendering without joins)
    username: {
      type: String,
      required: true,
    },

    // The avatar theme (denormalized)
    avatarTheme: {
      type: String,
      default: 'electric',
    },

    // The chat message content (post-filter)
    message: {
      type: String,
      required: true,
      maxlength: [280, 'Messages cannot exceed 280 characters'],
      trim: true,
    },

    // Sentiment score: -1 (negative) to +1 (positive)
    // Used to compute the Hype Meter aggregate
    sentimentScore: {
      type: Number,
      default: 0,
      min: -1,
      max: 1,
    },

    // Match context: which match this message belongs to
    matchId: {
      type: String,
      default: 'live',
    },

    // Message timestamp
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// TTL Index: automatically delete chat messages after 24 hours
// This keeps the collection lean for active match data only
fanChatSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

// Index for fetching recent messages for a match
fanChatSchema.index({ matchId: 1, timestamp: -1 });

const FanChat = mongoose.model('FanChat', fanChatSchema);
export default FanChat;
