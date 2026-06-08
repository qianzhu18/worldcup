// Signal tracking and backtesting system.
// Records all signals and their outcomes for accuracy analysis.
// Gracefully degrades when SQLite is unavailable (Vercel serverless).

let _db: any = null;
let _dbFailed = false;

function getDb() {
  if (_dbFailed) return null;
  if (_db) return _db;
  try {
    // Dynamic require so the module doesn't crash at import time on serverless
    const Database = require("better-sqlite3");
    const path = require("path");
    const fs = require("fs");
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    _db = new Database(path.join(dataDir, "signals.db"));
    _db.pragma("journal_mode = WAL");
    initTables(_db);
    return _db;
  } catch (e) {
    console.warn("[signal-tracker] SQLite unavailable, signal tracking disabled:", (e as Error).message);
    _dbFailed = true;
    return null;
  }
}

function initTables(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signal_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      market_prob REAL NOT NULL,
      model_prob REAL NOT NULL,
      ai_prob REAL,
      fused_prob REAL NOT NULL,
      edge REAL NOT NULL,
      action TEXT NOT NULL,
      kelly_fraction REAL,
      confidence REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS signal_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      signal_id INTEGER NOT NULL,
      outcome TEXT NOT NULL,
      actual_result TEXT,
      pnl REAL,
      resolved_at DATETIME,
      FOREIGN KEY (signal_id) REFERENCES signals(id)
    );
    CREATE TABLE IF NOT EXISTS market_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_slug TEXT NOT NULL,
      outcome_label TEXT NOT NULL,
      price REAL NOT NULL,
      volume REAL,
      liquidity REAL,
      captured_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// ─── Signal Recording ─────────────────────────────────────────────────────────

export function recordSignal(params: {
  signalType: "champion" | "match";
  targetId: string;
  marketProb: number;
  modelProb: number;
  aiProb?: number;
  fusedProb: number;
  edge: number;
  action: string;
  kellyFraction?: number;
  confidence?: number;
}): number {
  const db = getDb();
  if (!db) return 0;
  try {
    const stmt = db.prepare(`
      INSERT INTO signals (signal_type, target_id, market_prob, model_prob, ai_prob, fused_prob, edge, action, kelly_fraction, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      params.signalType, params.targetId, params.marketProb, params.modelProb,
      params.aiProb ?? null, params.fusedProb, params.edge, params.action,
      params.kellyFraction ?? null, params.confidence ?? null,
    );
    return Number(result.lastInsertRowid);
  } catch { return 0; }
}

export function recordOutcome(signalId: number, outcome: "win" | "loss" | "push", actualResult: string, pnl: number) {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(`INSERT INTO signal_outcomes (signal_id, outcome, actual_result, pnl, resolved_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run(signalId, outcome, actualResult, pnl);
  } catch {}
}

export function captureMarketSnapshot(eventSlug: string, outcomeLabel: string, price: number, volume?: number, liquidity?: number) {
  const db = getDb();
  if (!db) return;
  try {
    db.prepare(`INSERT INTO market_snapshots (event_slug, outcome_label, price, volume, liquidity) VALUES (?, ?, ?, ?, ?)`)
      .run(eventSlug, outcomeLabel, price, volume ?? null, liquidity ?? null);
  } catch {}
}

export function getPriceHistory(eventSlug: string, outcomeLabel: string, hours: number = 24) {
  const db = getDb();
  if (!db) return [];
  try {
    return db.prepare(`SELECT price, captured_at FROM market_snapshots WHERE event_slug = ? AND outcome_label = ? AND captured_at > datetime('now', ?) ORDER BY captured_at ASC`)
      .all(eventSlug, outcomeLabel, `-${hours} hours`);
  } catch { return []; }
}

// ─── Performance Analytics ────────────────────────────────────────────────────

export type SignalPerformance = {
  totalSignals: number;
  resolvedSignals: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  avgEdge: number;
  avgConfidence: number;
  totalPnL: number;
  roi: number;
  sharpeRatio: number;
  maxDrawdown: number;
  byAction: Record<string, { count: number; winRate: number; avgPnL: number }>;
  byConfidence: Record<string, { count: number; winRate: number }>;
};

const EMPTY_PERF: SignalPerformance = {
  totalSignals: 0, resolvedSignals: 0, wins: 0, losses: 0, pushes: 0,
  winRate: 0, avgEdge: 0, avgConfidence: 0, totalPnL: 0, roi: 0,
  sharpeRatio: 0, maxDrawdown: 0, byAction: {}, byConfidence: {},
};

export function getSignalPerformance(signalType?: "champion" | "match", days: number = 30): SignalPerformance {
  const db = getDb();
  if (!db) return EMPTY_PERF;
  try {
    const typeFilter = signalType ? `AND s.signal_type = '${signalType}'` : "";
    const overall = db.prepare(`
      SELECT COUNT(*) as total, COUNT(CASE WHEN o.outcome != 'pending' THEN 1 END) as resolved,
        COUNT(CASE WHEN o.outcome = 'win' THEN 1 END) as wins, COUNT(CASE WHEN o.outcome = 'loss' THEN 1 END) as losses,
        COUNT(CASE WHEN o.outcome = 'push' THEN 1 END) as pushes, AVG(s.edge) as avg_edge,
        AVG(s.confidence) as avg_confidence, COALESCE(SUM(o.pnl), 0) as total_pnl
      FROM signals s LEFT JOIN signal_outcomes o ON o.signal_id = s.id
      WHERE s.created_at > datetime('now', ?) ${typeFilter}
    `).get(`-${days} days`) as any;

    const resolved = overall.resolved || 1;
    return {
      totalSignals: overall.total || 0, resolvedSignals: resolved,
      wins: overall.wins || 0, losses: overall.losses || 0, pushes: overall.pushes || 0,
      winRate: overall.wins / resolved, avgEdge: overall.avg_edge || 0,
      avgConfidence: overall.avg_confidence || 0, totalPnL: overall.total_pnl || 0,
      roi: overall.total_pnl / resolved, sharpeRatio: 0, maxDrawdown: 0,
      byAction: {}, byConfidence: {},
    };
  } catch { return EMPTY_PERF; }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  rank: number;
  userId: number;
  username: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  totalEdge: number;
  streak: number;
};

export function getLeaderboard(limit: number = 20): LeaderboardEntry[] {
  return [];
}

export function scoreSignal(signal: {
  edge: number;
  confidence: number;
  modelProb: number;
  aiProb?: number;
  marketProb: number;
}): number {
  const edgeScore = Math.min(Math.abs(signal.edge) * 100, 50);
  const confidenceScore = signal.confidence * 30;
  let agreementBonus = 0;
  if (signal.aiProb !== undefined) {
    const modelDirection = signal.modelProb > signal.marketProb;
    const aiDirection = signal.aiProb > signal.marketProb;
    agreementBonus = modelDirection === aiDirection ? 20 : 0;
  }
  return Math.min(100, edgeScore + confidenceScore + agreementBonus);
}
