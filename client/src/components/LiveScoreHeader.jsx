// ──────────────────────────────────────────────────────────
// FanSync — LiveScoreHeader (Redesigned)
// Sticky 64px header: LIVE dot + teams + score + batter + streak
// Shows a loading skeleton before match state arrives
// ──────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Flame, Users } from 'lucide-react';
import useStore from '../store/useStore';

export default function LiveScoreHeader() {
  const matchState = useStore((s) => s.matchState);
  const user = useStore((s) => s.user);
  const isConnected = useStore((s) => s.isConnected);
  const userCount = useStore((s) => s.userCount);

  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        minHeight: '64px',
        background: 'rgba(15, 17, 23, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid #1e2235',
        display: 'flex', alignItems: 'center',
        padding: '0 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>

        {/* LEFT — LIVE + Teams + Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* LIVE badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 10px 3px 8px', borderRadius: '6px', background: isConnected ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>
            <div className={isConnected ? 'live-dot' : ''} style={!isConnected ? { width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 } : {}} />
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: isConnected ? '#22c55e' : '#ef4444' }}>
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Teams + Score */}
          {matchState ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#6b7280' }}>
                {matchState.team1 || 'MI'} vs {matchState.team2 || 'CSK'}
              </span>
              <motion.span
                key={matchState.score}
                initial={{ scale: 1.15, color: '#818cf8' }}
                animate={{ scale: 1, color: '#ffffff' }}
                transition={{ duration: 0.3 }}
                className="fs-score"
              >
                {matchState.score}/{matchState.wickets}
              </motion.span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>Over {matchState.over || '0.0'}</span>
                <span style={{ fontSize: '10px', color: '#4b5563' }}>CRR {matchState.currentRunRate || '0.00'}</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="shimmer-wait" style={{ width: '120px', height: '14px', borderRadius: '4px' }} />
              <div className="shimmer-wait" style={{ width: '60px', height: '30px', borderRadius: '6px' }} />
            </div>
          )}
        </div>

        {/* CENTER — Batter (hidden on mobile to avoid overflow) */}
        {matchState && (
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{matchState.striker}</span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#0f1117', background: '#6366f1', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.3px' }}>
              SR {matchState.strikerSR || 0}
            </span>
            {matchState.innings === 2 && matchState.target && (
              <span style={{ fontSize: '10px', fontWeight: 500, color: '#f97316', marginLeft: '6px' }}>
                Need {Math.max(0, matchState.target - matchState.score)} off {Math.max(0, 120 - matchState.totalBalls)}b
              </span>
            )}
          </div>
        )}

        {/* RIGHT — Fan count + Streak pill + Points */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Fan count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users style={{ width: '12px', height: '12px', color: '#4b5563' }} />
            <span style={{ fontSize: '10px', color: '#4b5563', fontWeight: 500 }}>{userCount || 0}</span>
          </div>

          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Streak pill */}
              <div
                className={user.currentStreak > 0 ? 'streak-shimmer' : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '4px 12px', borderRadius: '20px',
                  background: user.currentStreak > 0
                    ? 'linear-gradient(135deg, #f97316, #ea580c)'
                    : 'rgba(255,255,255,0.04)',
                  border: '1px solid',
                  borderColor: user.currentStreak > 0 ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.06)',
                }}
              >
                {user.currentStreak > 0 && <Flame style={{ width: '12px', height: '12px', color: '#fff' }} />}
                <span style={{ fontSize: '11px', fontWeight: 700, color: user.currentStreak > 0 ? '#fff' : '#4b5563' }}>
                  {user.currentStreak || 0} Streak
                </span>
              </div>

              {/* Points */}
              <div style={{ textAlign: 'right' }}>
                <motion.div key={user.totalPoints} initial={{ scale: 1.15 }} animate={{ scale: 1 }} style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>
                  {user.totalPoints || 0}
                </motion.div>
                <span style={{ fontSize: '9px', color: '#4b5563', fontWeight: 500, letterSpacing: '0.5px' }}>PTS</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
