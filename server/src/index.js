// ──────────────────────────────────────────────────────────
// FanSync — Server Entry Point
// Express + Socket.io + MongoDB + Gemini AI
// ──────────────────────────────────────────────────────────

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import matchRoutes, { setMatchSimulator } from './routes/match.js';
import { setupSocketHandlers } from './socket/socketHandler.js';
import MatchSimulator from './services/matchSimulator.js';
import geminiAgent from './services/geminiAgent.js';

const app = express();
const httpServer = createServer(app);

// ── CORS Config ──
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({ origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('dev'));
app.use(express.json());

// ── Socket.io Server ──
const io = new Server(httpServer, {
  cors: { origin: [CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'], methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── REST Routes ──
app.use('/api/v1', matchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date() });
});

// ── Startup Sequence ──
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fansync';

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ [DB] MongoDB connected');

    // 2. Initialize Gemini AI Agent
    await geminiAgent.initialize();

    // 3. Create & start match simulator
    const matchSimulator = new MatchSimulator();
    setMatchSimulator(matchSimulator);

    // 4. Setup Socket.io handlers
    setupSocketHandlers(io, matchSimulator);

    // 5. Start match simulation (new ball every 8 seconds)
    matchSimulator.start(8000);

    // 6. Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`\n🚀 ═══════════════════════════════════════════`);
      console.log(`   FanSync Server running on port ${PORT}`);
      console.log(`   Client URL: ${CLIENT_URL}`);
      console.log(`   MongoDB: ${MONGODB_URI}`);
      console.log(`   AI Agent: ${geminiAgent.isInitialized ? 'Gemini Active' : 'Fallback Mode'}`);
      console.log(`═══════════════════════════════════════════════\n`);
    });
  } catch (err) {
    console.error('❌ Server startup failed:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

startServer();
