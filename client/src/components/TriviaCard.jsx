// ──────────────────────────────────────────────────────────
// FanSync — TriviaCard (Redesigned)
// Compact card: orange accent, reveal toggle, glass styling
// Shows a premium empty state when no trivia is active
// ──────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Eye, EyeOff } from 'lucide-react';
import useStore from '../store/useStore';

export default function TriviaCard() {
  const activeTrivia = useStore((s) => s.activeTrivia);
  const [showAnswer, setShowAnswer] = useState(false);

  // Reset answer visibility when trivia changes
  useEffect(() => {
    setShowAnswer(false);
  }, [activeTrivia?.triviaId]);

  if (!activeTrivia) {
    return (
      <div className="fs-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
          <Brain style={{ width: '13px', height: '13px', color: '#374151' }} />
          <span className="fs-label" style={{ color: '#374151' }}>🧠 TRIVIA</span>
        </div>
        <div style={{
          padding: '20px 16px', borderRadius: '8px', textAlign: 'center',
          background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.06)',
        }}>
          <p style={{ fontSize: '11px', color: '#374151', fontWeight: 500 }}>
            Cricket trivia appears during strategic timeouts & innings breaks
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTrivia.triviaId}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="fs-card"
        style={{ padding: '16px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Brain style={{ width: '13px', height: '13px', color: '#f97316' }} />
            <span className="fs-label" style={{ color: '#f97316' }}>🧠 TRIVIA</span>
          </div>
          {activeTrivia.difficulty && (
            <span style={{
              fontSize: '9px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: '4px',
              color: activeTrivia.difficulty === 'easy' ? '#22c55e' : activeTrivia.difficulty === 'hard' ? '#ef4444' : '#f97316',
              background: activeTrivia.difficulty === 'easy' ? 'rgba(34,197,94,0.1)' : activeTrivia.difficulty === 'hard' ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)',
            }}>
              {activeTrivia.difficulty}
            </span>
          )}
        </div>

        {/* Question */}
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9', lineHeight: 1.4, marginBottom: '12px' }}>
          {activeTrivia.question}
        </h4>

        {/* Reveal toggle */}
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          style={{
            width: '100%', padding: '9px 0', borderRadius: '8px',
            fontSize: '11px', fontWeight: 600, color: '#94a3b8',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
        >
          {showAnswer ? <EyeOff style={{ width: '13px', height: '13px' }} /> : <Eye style={{ width: '13px', height: '13px' }} />}
          {showAnswer ? 'Hide Answer' : 'Reveal Answer'}
        </button>

        {/* Answer reveal */}
        <AnimatePresence>
          {showAnswer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.12)' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#f97316' }}>{activeTrivia.answer}</p>
                {activeTrivia.funFact && (
                  <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>💡 {activeTrivia.funFact}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
