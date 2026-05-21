// ──────────────────────────────────────────────────────────
// FanSync — HypeMeter (Redesigned)
// Compact bar: label left, % right, indigo→purple gradient
// ──────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import useStore from '../store/useStore';

const HYPE_LABELS = [
  { min: 0, max: 20, label: 'Calm', emoji: '😌', color: '#4b5563' },
  { min: 21, max: 40, label: 'Building', emoji: '📈', color: '#6366f1' },
  { min: 41, max: 60, label: 'Exciting', emoji: '⚡', color: '#818cf8' },
  { min: 61, max: 80, label: 'On Fire', emoji: '🔥', color: '#f97316' },
  { min: 81, max: 100, label: 'INSANE', emoji: '💥', color: '#ef4444' },
];

export default function HypeMeter() {
  const hypeLevel = useStore((s) => s.hypeLevel);
  const hypeInfo = HYPE_LABELS.find((h) => hypeLevel >= h.min && hypeLevel <= h.max) || HYPE_LABELS[0];

  return (
    <div className="fs-card" style={{ padding: '14px 16px' }}>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap style={{ width: '12px', height: '12px', color: hypeInfo.color }} />
          <span className="fs-label">🔥 HYPE METER</span>
        </div>
        <span style={{ fontSize: '10px', fontWeight: 600, color: hypeInfo.color }}>
          {hypeInfo.emoji} {hypeInfo.label}
        </span>
      </div>

      {/* Bar track */}
      <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <motion.div
          className="hype-bar-gradient"
          initial={{ width: 0 }}
          animate={{ width: `${hypeLevel}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
          style={{ height: '100%', borderRadius: '3px' }}
        />
      </div>

      {/* Percentage */}
      <div style={{ textAlign: 'right', marginTop: '4px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: '#4b5563' }}>{hypeLevel}%</span>
      </div>
    </div>
  );
}
