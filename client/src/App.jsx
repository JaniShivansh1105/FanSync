// ──────────────────────────────────────────────────────────
// FanSync — App Component (Redesigned layout)
// 2-column grid: Prediction left, Leaderboard right
// Full-width chat at bottom. Mobile: stacked.
// Socket logic updated for guest sessions.
// ──────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import useStore from './store/useStore';
import { connectSocket, disconnectSocket, getSocket } from './services/socket';
import LiveScoreHeader from './components/LiveScoreHeader';
import PredictionCard from './components/PredictionCard';
import FanChat from './components/FanChat';
import HypeMeter from './components/HypeMeter';
import Leaderboard from './components/Leaderboard';
import TriviaCard from './components/TriviaCard';
import MatchHighlight from './components/MatchHighlight';

export default function App() {
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);
  const setMatchState = useStore((s) => s.setMatchState);
  const setActivePoll = useStore((s) => s.setActivePoll);
  const setPollVotes = useStore((s) => s.setPollVotes);
  const resolvePoll = useStore((s) => s.resolvePoll);
  const addChatMessage = useStore((s) => s.addChatMessage);
  const setLeaderboard = useStore((s) => s.setLeaderboard);
  const setHypeLevel = useStore((s) => s.setHypeLevel);
  const setUserCount = useStore((s) => s.setUserCount);
  const setActiveTrivia = useStore((s) => s.setActiveTrivia);
  const setHighlight = useStore((s) => s.setHighlight);
  const setConnected = useStore((s) => s.setConnected);
  const isConnected = useStore((s) => s.isConnected);
  const [activeTab, setActiveTab] = useState('predict');

  const normalizeUser = useCallback((raw) => {
    if (!raw) return null;
    const id = raw.id || raw._id;
    return { ...raw, id };
  }, []);

  // ── Restore user from localStorage on mount ──
  useEffect(() => {
    const savedUser = localStorage.getItem('fansync_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const normalized = normalizeUser(parsed);
        if (normalized?.id) {
          setUser(normalized);
          localStorage.setItem('fansync_user', JSON.stringify(normalized));
        }
      }
      catch { localStorage.removeItem('fansync_user'); }
    }
  }, []);

  // ── Socket connection lifecycle ──
  useEffect(() => {
    const socket = connectSocket();

    const handleConnect = () => {
      setConnected(true);
      const stored = localStorage.getItem('fansync_user');
      let userId;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          userId = parsed?.id || parsed?._id;
        } catch { userId = null; }
      }
      socket.emit('authenticate', userId ? { userId } : {});
    };

    const handleDisconnect = () => setConnected(false);
    const handleConnectError = () => setConnected(false);

    const handleAuthenticated = (payload) => {
      if (payload?.success && payload.user) {
        const normalized = normalizeUser(payload.user);
        setUser(normalized);
        localStorage.setItem('fansync_user', JSON.stringify(normalized));
      }
    };

    const handleMatchUpdate = (data) => setMatchState(data);
    const handleMatchHighlight = (data) => setHighlight(data);
    const handleInningsBreak = (data) => setMatchState(data);
    const handlePollPublished = (data) => setActivePoll(data);
    const handlePollVotesUpdate = (data) => setPollVotes(data.votes);
    const handlePollResolved = (data) => resolvePoll(data);
    const handleChatMessage = (data) => addChatMessage(data);
    const handleLeaderboardUpdate = (data) => setLeaderboard(data.leaderboard);
    const handleHypeUpdate = (data) => setHypeLevel(data.level);
    const handleUserCount = (data) => setUserCount(data.count);
    const handleTriviaPublished = (data) => setActiveTrivia(data);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('authenticated', handleAuthenticated);
    socket.on('match_update', handleMatchUpdate);
    socket.on('match_highlight', handleMatchHighlight);
    socket.on('innings_break', handleInningsBreak);
    socket.on('poll_published', handlePollPublished);
    socket.on('poll_votes_update', handlePollVotesUpdate);
    socket.on('poll_resolved', handlePollResolved);
    socket.on('live_chat_message', handleChatMessage);
    socket.on('leaderboard_update', handleLeaderboardUpdate);
    socket.on('hype_update', handleHypeUpdate);
    socket.on('user_count', handleUserCount);
    socket.on('trivia_published', handleTriviaPublished);

    // If socket is already connected (e.g. hot reload), authenticate immediately
    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('authenticated', handleAuthenticated);
      socket.off('match_update', handleMatchUpdate);
      socket.off('match_highlight', handleMatchHighlight);
      socket.off('innings_break', handleInningsBreak);
      socket.off('poll_published', handlePollPublished);
      socket.off('poll_votes_update', handlePollVotesUpdate);
      socket.off('poll_resolved', handlePollResolved);
      socket.off('live_chat_message', handleChatMessage);
      socket.off('leaderboard_update', handleLeaderboardUpdate);
      socket.off('hype_update', handleHypeUpdate);
      socket.off('user_count', handleUserCount);
      socket.off('trivia_published', handleTriviaPublished);
      disconnectSocket();
    };
  }, []);

  const tabs = [
    { id: 'predict', label: '🎯 Predict' },
    { id: 'leaderboard', label: '🏆 Ranks' },
    { id: 'chat', label: '💬 Chat' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117' }}>
      <MatchHighlight />
      <LiveScoreHeader />

      {/* ── Mobile tab bar ── */}
      <div className="md:hidden" style={{
        position: 'sticky', top: '64px', zIndex: 40,
        background: 'rgba(15,17,23,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', padding: '6px 12px', gap: '4px',
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: '8px',
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.3px',
              transition: 'all 0.15s ease',
              ...(activeTab === tab.id
                ? { background: 'rgba(99,102,241,0.12)', color: '#818cf8' }
                : { background: 'transparent', color: '#4b5563' }
              ),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 16px 0' }}>

        {/* Desktop: 2-column grid */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Left column: Predictions + Trivia + Hype */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <PredictionCard />
            <TriviaCard />
            <HypeMeter />
          </div>

          {/* Right column: Leaderboard */}
          <div>
            <Leaderboard />
          </div>
        </div>

        {/* Desktop: Full-width chat below */}
        <div className="hidden md:block" style={{ marginTop: '14px' }}>
          <FanChat />
        </div>

        {/* Mobile: tabbed single-column */}
        <div className="md:hidden" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeTab === 'predict' && (
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <PredictionCard />
              <TriviaCard />
              <HypeMeter />
            </motion.div>
          )}
          {activeTab === 'leaderboard' && (
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
              <Leaderboard />
            </motion.div>
          )}
          {activeTab === 'chat' && (
            <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
              <FanChat />
            </motion.div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap style={{ width: '12px', height: '12px', color: '#6366f1' }} />
            <span style={{ fontSize: '10px', color: '#2d3148', fontWeight: 500 }}>FanSync v1.0 — Agentic Premier League</span>
          </div>
        </div>
      </footer>

      {/* ── Connection status indicator (bottom-left) ── */}
      <div className="status-indicator" style={{
        background: isConnected ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
        border: '1px solid',
        borderColor: isConnected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
        color: isConnected ? '#22c55e' : '#ef4444',
      }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isConnected ? '#22c55e' : '#ef4444' }} />
        {isConnected ? 'Connected' : 'Reconnecting…'}
      </div>
    </div>
  );
}
