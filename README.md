# FanSync — Real-Time Fan Engagement Platform

> **Second-Screen Gamification Platform for Live Cricket Matches**  
> Built for the Agentic Premier League Hackathon 2026

![FanSync](https://img.shields.io/badge/FanSync-v1.0-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-22-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green?style=for-the-badge)

## 🏏 What is FanSync?

FanSync transforms passive cricket viewing into an **interactive second-screen experience**. During live T20 matches, fans can:

- **🎯 Predict** — Vote on AI-generated micro-predictions ("Will Gill hit a boundary next ball?")
- **💬 Chat** — Real-time fan pulse chat with profanity filtering
- **🏆 Compete** — Climb the leaderboard through correct predictions and streaks
- **🔥 Hype** — Watch the crowd energy meter surge with every boundary and wicket
- **🧠 Learn** — AI-powered cricket trivia during strategic timeouts

## 🏗️ Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   React Client  │◄──────────────────►│  Express Server  │
│   (Vite + TW4)  │    Socket.io       │   + Socket.io    │
└─────────────────┘                    └────────┬────────┘
                                                │
                                    ┌───────────┼───────────┐
                                    │           │           │
                              ┌─────▼──┐  ┌────▼────┐ ┌───▼────┐
                              │MongoDB │  │ Gemini  │ │ Match  │
                              │        │  │ AI Agent│ │ Sim    │
                              └────────┘  └─────────┘ └────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (running locally or Atlas URI)
- Google Gemini API key (optional — falls back to curated content)

### 1. Clone & Install

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Configure Environment

```bash
# server/.env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/fansync
GEMINI_API_KEY=your_gemini_api_key  # Optional
CLIENT_URL=http://localhost:5173
```

### 3. Run

```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev
```

Open **http://localhost:5173** — Jump in as a guest and start engaging!

## 📁 Project Structure

```
antigravity/
├── server/
│   ├── src/
│   │   ├── index.js              # Express + Socket.io entry
│   │   ├── models/
│   │   │   ├── User.js           # User schema with gamification
│   │   │   ├── MatchEvent.js     # Ball-by-ball match events
│   │   │   ├── Prediction.js     # User vote tracking
│   │   │   └── FanChat.js        # Chat messages with sentiment
│   │   ├── routes/
│   │   │   └── match.js          # Match status, leaderboard, webhooks
│   │   ├── services/
│   │   │   ├── geminiAgent.js    # Google Gemini AI content generator
│   │   │   └── matchSimulator.js # Ball-by-ball T20 simulation
│   │   └── socket/
│   │       └── socketHandler.js  # Real-time event handlers
│   └── .env
└── client/
    ├── src/
    │   ├── App.jsx               # Main orchestrator
    │   ├── index.css             # Design system (glassmorphism)
    │   ├── components/
    │   │   ├── LiveScoreHeader.jsx
    │   │   ├── PredictionCard.jsx
    │   │   ├── FanChat.jsx
    │   │   ├── HypeMeter.jsx
    │   │   ├── Leaderboard.jsx
    │   │   ├── TriviaCard.jsx
    │   │   └── MatchHighlight.jsx
    │   ├── store/useStore.js     # Zustand global state
    │   └── services/socket.js    # Socket.io client
    └── vite.config.js
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/match/status` | Current match state |
| `GET` | `/api/v1/leaderboard` | Top users by points |
| `POST` | `/api/v1/webhooks/match-update` | Push external match data |
| `GET` | `/api/health` | Server health check |

## ⚡ Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `authenticate` | Client → Server | Guest/returning user auth |
| `authenticated` | Server → Client | Auth confirmation + user data |
| `match_update` | Server → Client | Ball-by-ball state |
| `match_highlight` | Server → Client | Boundary/wicket overlays |
| `innings_break` | Server → Client | Innings switch data |
| `poll_published` | Server → Client | New AI prediction poll |
| `vote_submitted` | Client → Server | User prediction vote |
| `vote_confirmed` | Server → Client | Vote acknowledgement |
| `poll_votes_update` | Server → Client | Live vote tally |
| `poll_resolved` | Server → Client | Poll result + scoring |
| `live_chat_message` | Bi-directional | Real-time chat |
| `leaderboard_update` | Server → Client | Top 20 users (every 15s + on resolve) |
| `hype_update` | Server → Client | Engagement meter (every 5s) |
| `trivia_published` | Server → Client | AI trivia during timeouts |
| `user_count` | Server → Client | Online fan count |
| `strategic_timeout` | Server → Client | Timeout notification |

## 🎨 Design System

- **Theme:** Deep dark (#0f1117) with neon accents (indigo, orange, purple)
- **Fonts:** Inter (body), Outfit (scores/display)
- **Effects:** Glassmorphism cards, pulse animations, gradient hype bar
- **Mobile:** Tab-based navigation; Desktop: 2-column grid
- **CSS:** Tailwind CSS v4 + custom design tokens

## 🤖 AI Agent (Gemini)

The "Agentic Umpire" uses Google Gemini (via LangChain.js) to:
1. Generate context-aware prediction polls from live match state
2. Create cricket trivia during strategic timeouts
3. Produce AI commentary for key moments

Falls back to curated cricket content when no API key is configured.

## 🎯 Key Features

- **Deterministic Poll Resolution** — Polls resolve based on actual match state changes, not random selection
- **Streak Multiplier System** — Consecutive correct predictions earn bonus points (up to 5x)
- **Optimistic UI Updates** — Points and streaks update instantly on the client
- **Guest Auth with Persistence** — No login required; state preserved across reconnects
- **Profanity-Filtered Chat** — Real-time chat with bad-words filter
- **Responsive Design** — Premium experience on both desktop and mobile

## 📄 License

MIT — Built for the Agentic Premier League Hackathon 2026
