// ──────────────────────────────────────────────────────────
// FanSync — Leaderboard (Redesigned)
// Clean list with gold/silver/bronze, "you" highlight,
// slide-in stagger animation
// ──────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Flame, Trophy } from 'lucide-react';
import useStore from '../store/useStore';

const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7f32'];
const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const leaderboard = useStore((s) => s.leaderboard);
  const user = useStore((s) => s.user);

  return (
    <div className="fs-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="fs-label">🏆 LEADERBOARD</span>
        <span style={{ fontSize: '10px', color: '#4b5563', fontWeight: 500 }}>
          {leaderboard.length > 0 ? `Top ${Math.min(leaderboard.length, 10)}` : 'Live Rankings'}
        </span>
      </div>

      {/* Entries */}
      <div>
        {leaderboard.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <Trophy style={{ width: '28px', height: '28px', margin: '0 auto 10px', color: '#2d3148' }} />
            <p style={{ fontSize: '12px', color: '#4b5563', fontWeight: 500 }}>No rankings yet</p>
            <p style={{ fontSize: '10px', color: '#374151', marginTop: '4px' }}>Start predicting to climb the leaderboard!</p>
          </div>
        )}

        {leaderboard.slice(0, 10).map((entry, i) => {
          const isMe = user && (entry.username === user.username || entry._id === user.id);

          return (
            <motion.div
              key={entry._id || entry.username}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                background: isMe ? 'rgba(99,102,241,0.08)' : 'transparent',
                borderLeft: isMe ? '2px solid #6366f1' : '2px solid transparent',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { if (!isMe) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
              onMouseLeave={(e) => { if (!isMe) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Rank */}
              <span style={{
                width: '22px', textAlign: 'center',
                fontSize: i < 3 ? '14px' : '11px',
                fontWeight: 700,
                color: i < 3 ? RANK_COLORS[i] : '#4b5563',
              }}>
                {i < 3 ? RANK_EMOJIS[i] : i + 1}
              </span>

              {/* Avatar */}
              <div className={`avatar-${entry.avatarTheme || 'electric'}`} style={{
                width: '26px', height: '26px', borderRadius: '7px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {entry.username?.charAt(0).toUpperCase()}
              </div>

              {/* Name + accuracy */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.username}
                  {isMe && <span style={{ fontSize: '10px', color: '#6366f1', marginLeft: '5px', fontWeight: 500 }}>(you)</span>}
                </div>
                <div style={{ fontSize: '10px', color: '#4b5563' }}>
                  {entry.accuracy || 0}% acc • {entry.totalPredictions || 0} picks
                </div>
              </div>

              {/* Points + streak */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1' }}>{entry.totalPoints || 0}</div>
                {entry.currentStreak > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                    <Flame style={{ width: '10px', height: '10px', color: '#f97316' }} />
                    <span style={{ fontSize: '10px', color: '#f97316', fontWeight: 600 }}>{entry.currentStreak}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
