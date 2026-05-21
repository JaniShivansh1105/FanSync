// ──────────────────────────────────────────────────────────
// FanSync — MatchHighlight (Redesigned)
// Full-screen overlay with radial gradient backdrop,
// emoji + text animation, minimal and impactful
// ──────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';

export default function MatchHighlight() {
  const highlight = useStore((s) => s.highlight);

  if (!highlight) return null;

  const isBoundary = highlight.type === 'boundary';
  const isWicket = highlight.type === 'wicket';
  const runs = highlight.outcome?.runs ?? 0;
  const isSix = isBoundary && runs === 6;
  const accentColor = isBoundary ? (isSix ? '#f97316' : '#6366f1') : '#ef4444';

  let emoji = '🎯';
  let label = 'WICKET!';
  if (isBoundary) {
    emoji = isSix ? '💥' : '🏏';
    label = isSix ? 'MAXIMUM SIX!' : 'FOUR!';
  }

  return (
    <AnimatePresence>
      <motion.div
        key={`${highlight.type}-${highlight.score}-${highlight.wickets}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
          background: `radial-gradient(circle at center, ${accentColor}15 0%, transparent 70%)`,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.4, 1], rotate: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{ fontSize: '64px', lineHeight: 1, marginBottom: '8px' }}
          >
            {emoji}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{
              fontSize: '26px', fontWeight: 800, color: '#ffffff',
              letterSpacing: '-0.5px',
              textShadow: `0 0 40px ${accentColor}60`,
            }}
          >
            {label}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', fontWeight: 500 }}
          >
            {highlight.striker || 'Batsman'} • {highlight.score ?? 0}/{highlight.wickets ?? 0}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
