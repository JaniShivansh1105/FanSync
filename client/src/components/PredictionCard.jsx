// ──────────────────────────────────────────────────────────
// FanSync — PredictionCard (Redesigned)
// Glowing indigo border pulse, pill vote buttons with
// progress bars behind text, countdown + vote count
// ──────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, Check, TrendingUp } from 'lucide-react';
import useStore from '../store/useStore';
import { getSocket } from '../services/socket';

export default function PredictionCard() {
  const activePoll = useStore((s) => s.activePoll);
  const userVote = useStore((s) => s.userVote);
  const pollVotes = useStore((s) => s.pollVotes);
  const pollHistory = useStore((s) => s.pollHistory);
  const user = useStore((s) => s.user);
  const setUserVote = useStore((s) => s.setUserVote);
  const [timeLeft, setTimeLeft] = useState(0);

  // Get the most recent resolved poll for showing results
  const lastResolved = pollHistory.length > 0 ? pollHistory[0] : null;

  useEffect(() => {
    if (!activePoll) return;
    setTimeLeft(activePoll.expiresIn || 25);
    const timer = setInterval(() => {
      setTimeLeft((t) => { if (t <= 1) { clearInterval(timer); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [activePoll?.pollId]);

  const handleVote = useCallback((option) => {
    if (userVote || timeLeft <= 0 || !user) return;
    const socket = getSocket();
    socket.emit('vote_submitted', { pollId: activePoll.pollId, selectedOption: option, userId: user.id });
    setUserVote(option);
  }, [userVote, timeLeft, user, activePoll, setUserVote]);

  const totalVotes = Object.values(pollVotes).reduce((s, v) => s + v, 0) || 0;
  const getPercentage = (option) => totalVotes > 0 ? Math.round(((pollVotes[option] || 0) / totalVotes) * 100) : 0;

  /* ── Empty / waiting state ── */
  if (!activePoll) {
    return (
      <div className="fs-card" style={{ padding: '28px 20px' }}>
        <div className="shimmer-wait" style={{ borderRadius: '10px', padding: '32px 16px', textAlign: 'center' }}>
          <Sparkles style={{ width: '28px', height: '28px', margin: '0 auto 10px', color: '#2d3148' }} />
          <p style={{ fontSize: '12px', fontWeight: 500, color: '#4b5563' }}>Waiting for next prediction…</p>
          <p style={{ fontSize: '10px', color: '#374151', marginTop: '4px' }}>AI Umpire is analyzing the match</p>
        </div>

        {/* Show last resolved poll result */}
        {lastResolved && (
          <div style={{
            marginTop: '16px', padding: '12px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Check style={{ width: '11px', height: '11px', color: '#22c55e' }} />
              <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#4b5563' }}>LAST RESULT</span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>{lastResolved.question}</p>
            <p style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, marginTop: '4px' }}>
              ✓ {lastResolved.result?.correctOption}
            </p>
          </div>
        )}
      </div>
    );
  }

  const isExpired = timeLeft <= 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activePoll.pollId}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        className={`fs-card ${!isExpired ? 'poll-active' : ''}`}
        style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles style={{ width: '14px', height: '14px', color: '#a855f7' }} />
            <span className="fs-label" style={{ color: '#a855f7' }}>
              {activePoll.isAIGenerated ? '⚡ AI PREDICTION' : '⚡ LIVE PREDICTION'}
            </span>
          </div>

          {/* Countdown */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
            color: timeLeft <= 5 ? '#ef4444' : '#94a3b8',
            background: timeLeft <= 5 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
          }}>
            <Clock style={{ width: '12px', height: '12px' }} />
            {isExpired ? 'Resolving…' : `${timeLeft}s`}
          </div>
        </div>

        {/* Question */}
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.4, marginBottom: '4px' }}>
          {activePoll.question}
        </h3>
        {activePoll.insight && (
          <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp style={{ width: '11px', height: '11px' }} /> {activePoll.insight}
          </p>
        )}
        {!activePoll.insight && <div style={{ marginBottom: '16px' }} />}

        {/* Vote options — pill buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activePoll.options?.map((option, i) => {
            const pct = getPercentage(option);
            const isSelected = userVote === option;

            return (
              <button
                key={i}
                onClick={() => handleVote(option)}
                disabled={!!userVote || isExpired}
                className="vote-option"
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '12px 16px', borderRadius: '10px',
                  position: 'relative', overflow: 'hidden',
                  background: isSelected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                  border: '1px solid',
                  borderColor: isSelected ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)',
                  cursor: userVote || isExpired ? 'default' : 'pointer',
                }}
              >
                {/* Progress bar fill (behind text) */}
                {(userVote || isExpired) && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                    style={{
                      position: 'absolute', top: 0, left: 0, bottom: 0,
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(99,102,241,0.08)' : 'rgba(249,115,22,0.06)',
                    }}
                  />
                )}

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>{option}</span>
                  {(userVote || isExpired) && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>
                      {pct}%
                    </motion.span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer: vote count + match context */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
          {activePoll.matchState && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#4b5563' }}>
              <span>Over {activePoll.matchState.over}</span>
              <span style={{ opacity: 0.3 }}>•</span>
              <span>{activePoll.matchState.score}/{activePoll.matchState.wickets}</span>
            </div>
          )}
          <span style={{ fontSize: '10px', color: '#4b5563', fontWeight: 500 }}>{totalVotes} votes</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
