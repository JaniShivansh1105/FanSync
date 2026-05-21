// ──────────────────────────────────────────────────────────
// FanSync — Match Simulator Service
// Simulates ball-by-ball T20 cricket match progression.
// Drives the entire real-time experience by emitting events.
// ──────────────────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';
import MatchEvent from '../models/MatchEvent.js';

// IPL-style player pools for realistic simulation
const BATSMEN = ['Virat Kohli', 'Rohit Sharma', 'Shubman Gill', 'Suryakumar Yadav', 'KL Rahul', 'Rishabh Pant', 'Hardik Pandya', 'Ravindra Jadeja', 'MS Dhoni', 'Faf du Plessis'];
const BOWLERS = ['Jasprit Bumrah', 'Mohammed Siraj', 'Yuzvendra Chahal', 'Rashid Khan', 'Trent Boult', 'Pat Cummins', 'Kagiso Rabada', 'Arshdeep Singh'];

// Probability distributions for ball outcomes
const OUTCOMES = [
  { runs: 0, weight: 30, desc: 'dot ball', isWicket: false, isBoundary: false },
  { runs: 1, weight: 25, desc: 'single', isWicket: false, isBoundary: false },
  { runs: 2, weight: 12, desc: 'couple of runs', isWicket: false, isBoundary: false },
  { runs: 3, weight: 3, desc: 'three runs', isWicket: false, isBoundary: false },
  { runs: 4, weight: 15, desc: 'FOUR! Boundary!', isWicket: false, isBoundary: true },
  { runs: 6, weight: 10, desc: 'SIX! Into the stands!', isWicket: false, isBoundary: true },
  { runs: 0, weight: 5, desc: 'WICKET! Big moment!', isWicket: true, isBoundary: false },
];

class MatchSimulator {
  constructor() {
    this.matchId = `IPL2026_${uuidv4().slice(0, 8)}`;
    this.state = {
      matchId: this.matchId,
      innings: 1,
      over: 0.0,
      ballInOver: 0,
      totalBalls: 0,
      score: 0,
      wickets: 0,
      striker: BATSMEN[0],
      nonStriker: BATSMEN[1],
      bowler: BOWLERS[0],
      strikerSR: 0,
      strikerRuns: 0,
      strikerBalls: 0,
      currentRunRate: 0,
      target: null,
      requiredRunRate: null,
      lastBallDesc: '',
      isLive: false,
      isPaused: false,
      isTimeout: false,
      batIndex: 2, // Next batsman index
      bowlerIndex: 0,
      team1: 'Mumbai Indians',
      team2: 'Chennai Super Kings',
      team1Score: null,
      outcome: null, // Last ball outcome — used by poll resolver
    };
    this.interval = null;
    this.listeners = [];
  }

  /** Register an event listener */
  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  /** Emit event to all registered listeners */
  emit(event, data) {
    this.listeners.filter(l => l.event === event).forEach(l => l.callback(data));
  }

  /** Start the match simulation */
  start(intervalMs = 8000) {
    if (this.state.isLive) return;
    this.state.isLive = true;
    this.state.isPaused = false;
    console.log(`🏏 [Match] Simulation started: ${this.state.team1} vs ${this.state.team2}`);
    this.emit('match_started', { ...this.state });

    this.interval = setInterval(() => {
      if (!this.state.isPaused) this._simulateBall();
    }, intervalMs);
  }

  /** Pause / resume */
  pause() { this.state.isPaused = true; }
  resume() { this.state.isPaused = false; }

  /** Stop the simulation */
  stop() {
    clearInterval(this.interval);
    this.interval = null;
    this.state.isLive = false;
    this.emit('match_ended', { ...this.state });
  }

  /** Get current match state */
  getState() { return { ...this.state }; }

  /** Update match state from external webhook */
  updateFromWebhook(payload) {
    Object.assign(this.state, payload);
    this.emit('ball_bowled', { ...this.state });
  }

  /** Simulate a single ball delivery */
  _simulateBall() {
    // Check match completion
    if (this.state.innings === 1 && this.state.totalBalls >= 120) {
      this._switchInnings();
      return;
    }
    if (this.state.innings === 2 && (this.state.totalBalls >= 120 || this.state.wickets >= 10 || (this.state.target && this.state.score >= this.state.target))) {
      this.stop();
      return;
    }
    if (this.state.wickets >= 10) {
      if (this.state.innings === 1) { this._switchInnings(); return; }
      this.stop();
      return;
    }

    // Strategic timeout at over 6 and 13
    const currentOver = Math.floor(this.state.totalBalls / 6);
    if ((currentOver === 6 || currentOver === 13) && this.state.ballInOver === 0 && !this.state.isTimeout) {
      this.state.isTimeout = true;
      this.emit('strategic_timeout', { ...this.state });
      setTimeout(() => { this.state.isTimeout = false; }, 5000);
      return;
    }

    // Determine ball outcome using weighted random
    const outcome = this._weightedRandom();
    this.state.totalBalls++;
    this.state.ballInOver++;
    this.state.score += outcome.runs;
    this.state.strikerBalls++;
    this.state.strikerRuns += outcome.runs;
    this.state.strikerSR = this.state.strikerBalls > 0 ? Math.round((this.state.strikerRuns / this.state.strikerBalls) * 100) : 0;
    this.state.lastBallDesc = outcome.desc;
    this.state.outcome = outcome; // Store the outcome for poll resolution

    // Calculate over number display (e.g., 5.3)
    const overNum = Math.floor((this.state.totalBalls - 1) / 6);
    const ballNum = ((this.state.totalBalls - 1) % 6) + 1;
    this.state.over = parseFloat(`${overNum}.${ballNum}`);

    // Current run rate
    const oversCompleted = this.state.totalBalls / 6;
    this.state.currentRunRate = oversCompleted > 0 ? (this.state.score / oversCompleted).toFixed(2) : 0;

    // Required run rate (2nd innings)
    if (this.state.innings === 2 && this.state.target) {
      const ballsRemaining = 120 - this.state.totalBalls;
      const runsNeeded = this.state.target - this.state.score;
      this.state.requiredRunRate = ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : 0;
    }

    // Handle wicket
    if (outcome.isWicket) {
      this.state.wickets++;
      if (this.state.batIndex < BATSMEN.length) {
        this.state.striker = BATSMEN[this.state.batIndex++];
        this.state.strikerRuns = 0;
        this.state.strikerBalls = 0;
        this.state.strikerSR = 0;
      }
    }

    // Rotate strike on odd runs
    if (outcome.runs % 2 === 1) {
      [this.state.striker, this.state.nonStriker] = [this.state.nonStriker, this.state.striker];
    }

    // End of over
    if (this.state.ballInOver >= 6) {
      this.state.ballInOver = 0;
      this.state.bowlerIndex = (this.state.bowlerIndex + 1) % BOWLERS.length;
      this.state.bowler = BOWLERS[this.state.bowlerIndex];
      // Rotate strike at end of over
      [this.state.striker, this.state.nonStriker] = [this.state.nonStriker, this.state.striker];
    }

    // Persist event to MongoDB (fire and forget)
    MatchEvent.create({
      matchId: this.state.matchId,
      ballNumber: this.state.over,
      score: this.state.score,
      wickets: this.state.wickets,
      runsOnBall: outcome.runs,
      isWicket: outcome.isWicket,
      isBoundary: outcome.isBoundary,
      striker: this.state.striker,
      strikerSR: this.state.strikerSR,
      bowler: this.state.bowler,
      description: outcome.desc,
      innings: this.state.innings,
      currentRunRate: parseFloat(this.state.currentRunRate),
    }).catch(err => console.error('DB write failed:', err.message));

    // Emit events
    this.emit('ball_bowled', { ...this.state, outcome });
    if (outcome.isBoundary) this.emit('boundary', { ...this.state, outcome });
    if (outcome.isWicket) this.emit('wicket', { ...this.state, outcome });
  }

  _switchInnings() {
    this.state.team1Score = this.state.score;
    this.state.target = this.state.score + 1;
    this.state.innings = 2;
    this.state.score = 0;
    this.state.wickets = 0;
    this.state.totalBalls = 0;
    this.state.ballInOver = 0;
    this.state.over = 0.0;
    this.state.batIndex = 2;
    this.state.striker = BATSMEN[0];
    this.state.nonStriker = BATSMEN[1];
    this.state.strikerRuns = 0;
    this.state.strikerBalls = 0;
    this.state.strikerSR = 0;
    this.state.currentRunRate = 0;
    this.state.outcome = null;
    this.state.requiredRunRate = ((this.state.target) / 20).toFixed(2);
    this.emit('innings_break', { ...this.state });
  }

  _weightedRandom() {
    const totalWeight = OUTCOMES.reduce((sum, o) => sum + o.weight, 0);
    let r = Math.random() * totalWeight;
    for (const outcome of OUTCOMES) {
      r -= outcome.weight;
      if (r <= 0) return outcome;
    }
    return OUTCOMES[0];
  }
}

export default MatchSimulator;
