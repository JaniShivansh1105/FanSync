// ──────────────────────────────────────────────────────────
// FanSync — FanChat (Redesigned)
// Full-width bottom chat: initials avatar, fade-in-up msgs,
// dark rounded input + indigo icon-only send button
// ──────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import useStore from '../store/useStore';
import { getSocket } from '../services/socket';

// Deterministic accent color from username
const AVATAR_COLORS = ['#6366f1', '#a855f7', '#f97316', '#22c55e', '#06b6d4', '#ec4899', '#eab308', '#ef4444'];
function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function FanChat() {
  const chatMessages = useStore((s) => s.chatMessages);
  const user = useStore((s) => s.user);
  const userCount = useStore((s) => s.userCount);
  const [message, setMessage] = useState('');
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    const socket = getSocket();
    socket.emit('live_chat_message', { message: message.trim(), userId: user.id, username: user.username, avatarTheme: user.avatarTheme });
    setMessage('');
  };

  return (
    <div className="fs-card" style={{ display: 'flex', flexDirection: 'column', height: '320px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
      }}>
        <span className="fs-label">💬 FAN PULSE</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 8px', borderRadius: '5px', background: 'rgba(255,255,255,0.04)' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: 500 }}>{userCount || 0} online</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {chatMessages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
            <MessageCircle style={{ width: '24px', height: '24px', color: '#2d3148' }} />
            <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>Be the first to send a message 🏏</span>
            <span style={{ fontSize: '10px', color: '#2d3148' }}>Chat with fellow fans during the match</span>
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <div key={`${msg.timestamp}-${i}`} className="msg-enter" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            {/* Avatar circle */}
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 700, color: '#fff', marginTop: '1px',
              background: avatarColor(msg.username),
            }}>
              {(msg.username || '?').slice(0, 2).toUpperCase()}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#d1d5db' }}>{msg.username}</span>
                <span style={{ fontSize: '9px', color: '#374151' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', wordBreak: 'break-word', lineHeight: 1.4 }}>{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} style={{
        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px',
        borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
      }}>
        <input
          id="chat-input" type="text" placeholder={user ? 'Type your message…' : 'Connecting…'} value={message}
          onChange={(e) => setMessage(e.target.value)} maxLength={280}
          disabled={!user}
          style={{
            flex: 1, padding: '9px 14px', borderRadius: '10px', fontSize: '12px',
            color: '#f1f5f9', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)', outline: 'none',
            transition: 'border-color 0.15s',
            opacity: user ? 1 : 0.5,
          }}
          onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.4)'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
        />
        <button
          id="chat-send" type="submit" disabled={!message.trim() || !user}
          style={{
            width: '36px', height: '36px', borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: message.trim() && user ? '#6366f1' : 'rgba(255,255,255,0.04)',
            opacity: message.trim() && user ? 1 : 0.3,
            transition: 'all 0.15s ease', flexShrink: 0,
          }}
        >
          <Send style={{ width: '14px', height: '14px', color: '#fff' }} />
        </button>
      </form>
    </div>
  );
}
