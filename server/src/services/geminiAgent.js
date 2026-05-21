// ──────────────────────────────────────────────────────────
// FanSync — Gemini AI Agent ("Agentic Umpire")
// Uses Google Gemini via LangChain.js to generate polls,
// trivia, and commentary from live match state.
// ──────────────────────────────────────────────────────────

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { v4 as uuidv4 } from 'uuid';

const FALLBACK_POLLS = [
  { question: "Will there be a boundary on the next ball?", options: ["Yes, a Four! 🏏", "Yes, a Six! 💥", "No boundary ❌"], type: 'prediction' },
  { question: "How many runs in this over?", options: ["0-5 runs", "6-10 runs", "11+ runs 🔥"], type: 'prediction' },
  { question: "Will a wicket fall in the next 2 overs?", options: ["Yes! 🎯", "No 🛡️"], type: 'prediction' },
  { question: "Run rate at powerplay end?", options: ["Under 7", "7-9", "10+ 🚀"], type: 'prediction' },
];

const FALLBACK_TRIVIA = [
  { question: "Fastest IPL fifty?", answer: "KL Rahul — 14 balls (2018)", funFact: "He smashed it against Delhi!" },
  { question: "Most IPL sixes?", answer: "Chris Gayle — 357 sixes", funFact: "The Universe Boss averaged ~2 sixes per match!" },
  { question: "Highest IPL score?", answer: "Gayle — 175* off 66 balls", funFact: "17 sixes in one innings!" },
  { question: "Most IPL titles?", answer: "Mumbai Indians — 5 titles", funFact: "MI won in 2013, 2015, 2017, 2019, 2020!" },
];

class GeminiAgent {
  constructor() {
    this.model = null;
    this.isInitialized = false;
    this.fallbackIndex = 0;
    this.triviaIndex = 0;
  }

  async initialize() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn('⚠️  [AI Agent] No Gemini API key. Using fallback content.');
      return;
    }
    try {
      this.model = new ChatGoogleGenerativeAI({
        modelName: 'gemini-2.0-flash', apiKey, temperature: 0.8, maxOutputTokens: 1024,
      });
      await this.model.invoke([new HumanMessage('Say "ready"')]);
      this.isInitialized = true;
      console.log('✅ [AI Agent] Gemini initialized');
    } catch (err) {
      console.error('❌ [AI Agent] Init failed:', err.message);
    }
  }

  async generatePoll(matchState) {
    const pollId = uuidv4();
    if (!this.isInitialized) return this._fallbackPoll(pollId, matchState);

    try {
      const sys = new SystemMessage(`You are FanSync AI Umpire for a LIVE T20 match. Generate ONE prediction poll.
RESPOND IN VALID JSON ONLY: {"question":"...","options":["a","b","c"],"type":"prediction","hype":7,"insight":"..."}`);
      const human = new HumanMessage(`Over: ${matchState.over}, Score: ${matchState.score}/${matchState.wickets}, Striker: ${matchState.striker} (SR: ${matchState.strikerSR || matchState.striker_sr}), Bowler: ${matchState.bowler || 'Unknown'}`);
      const res = await this.model.invoke([sys, human]);
      const json = res.content.match(/\{[\s\S]*\}/);
      const parsed = json ? JSON.parse(json[0]) : null;
      if (!parsed) throw new Error('No JSON');
      return { pollId, ...parsed, matchState: { over: matchState.over, score: matchState.score, wickets: matchState.wickets, striker: matchState.striker }, createdAt: new Date(), expiresIn: 25, isAIGenerated: true };
    } catch (err) {
      console.error('❌ Poll gen failed:', err.message);
      return this._fallbackPoll(pollId, matchState);
    }
  }

  async generateTrivia(matchState) {
    if (!this.isInitialized) return this._fallbackTrivia();
    try {
      const sys = new SystemMessage(`You are a cricket trivia expert. Generate ONE trivia. RESPOND IN VALID JSON ONLY: {"question":"...","answer":"...","funFact":"...","difficulty":"medium"}`);
      const human = new HumanMessage(`Context: ${matchState.striker} batting, ${matchState.score}/${matchState.wickets}, over ${matchState.over}`);
      const res = await this.model.invoke([sys, human]);
      const json = res.content.match(/\{[\s\S]*\}/);
      const parsed = json ? JSON.parse(json[0]) : null;
      if (!parsed) throw new Error('No JSON');
      return { triviaId: uuidv4(), ...parsed, createdAt: new Date(), isAIGenerated: true };
    } catch { return this._fallbackTrivia(); }
  }

  async generateCommentary(matchState) {
    if (!this.isInitialized) return `${matchState.striker} at ${matchState.score}/${matchState.wickets}. Over ${matchState.over} underway!`;
    try {
      const res = await this.model.invoke([new HumanMessage(`T20 commentator: describe Over ${matchState.over}, ${matchState.striker} vs ${matchState.bowler||'bowler'}, ${matchState.score}/${matchState.wickets}. Under 80 chars, energetic.`)]);
      return res.content.trim().replace(/^["']|["']$/g, '');
    } catch { return `Exciting action at ${matchState.score}/${matchState.wickets}!`; }
  }

  _fallbackPoll(pollId, ms) {
    const p = FALLBACK_POLLS[this.fallbackIndex++ % FALLBACK_POLLS.length];
    return { pollId, question: p.question.replace('the next ball', `${ms.striker}'s next ball`), options: p.options, type: p.type, hype: Math.floor(Math.random()*4)+5, insight: `${ms.striker} SR: ${ms.strikerSR||ms.striker_sr||'N/A'}!`, matchState: { over: ms.over, score: ms.score, wickets: ms.wickets, striker: ms.striker }, createdAt: new Date(), expiresIn: 25, isAIGenerated: false };
  }

  _fallbackTrivia() {
    const t = FALLBACK_TRIVIA[this.triviaIndex++ % FALLBACK_TRIVIA.length];
    return { triviaId: uuidv4(), ...t, difficulty: 'medium', createdAt: new Date(), isAIGenerated: false };
  }
}

const geminiAgent = new GeminiAgent();
export default geminiAgent;
