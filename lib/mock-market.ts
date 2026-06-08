// Mock market data for development when Polymarket API is unreachable.
// Uses Elo-based probabilities as a proxy for "market" prices.

import { TEAMS } from "./worldcup";
import type { Market, Outcome } from "./polymarket";

// Generate mock market probabilities based on Elo ratings
function eloToProbability(elo: number, allElos: number[]): number {
  const T = 110; // temperature parameter
  const exps = allElos.map((e) => Math.exp(e / T));
  const sum = exps.reduce((a, b) => a + b, 0);
  return Math.exp(elo / T) / sum;
}

export function getMockWinnerMarket(): Market {
  const sortedTeams = [...TEAMS].sort((a, b) => b.elo - a.elo);
  const allElos = TEAMS.map((t) => t.elo);

  const outcomes: Outcome[] = sortedTeams.slice(0, 20).map((team) => {
    const prob = eloToProbability(team.elo, allElos);
    // Add some noise to make it look like real market data
    const noise = (Math.random() - 0.5) * 0.02;
    return {
      label: team.name,
      price: Math.max(0.01, Math.min(0.99, prob + noise)),
      question: `Will ${team.name} win the 2026 FIFA World Cup?`,
      url: `https://polymarket.com/event/world-cup-winner`,
      volume: Math.round(Math.random() * 5000000 + 100000),
      liquidity: Math.round(Math.random() * 2000000 + 50000),
    };
  });

  // Normalize prices to sum to ~1
  const totalPrice = outcomes.reduce((sum, o) => sum + o.price, 0);
  outcomes.forEach((o) => {
    o.price = o.price / totalPrice;
  });

  return {
    id: "mock-world-cup-winner",
    platform: "Polymarket",
    title: "2026 FIFA World Cup Winner",
    slug: "world-cup-winner",
    url: "https://polymarket.com/event/world-cup-winner",
    category: "World Cup",
    outcomes,
    volume: outcomes.reduce((sum, o) => sum + (o.volume || 0), 0),
    liquidity: outcomes.reduce((sum, o) => sum + (o.liquidity || 0), 0),
    heat: 85.5,
    topOutcome: outcomes[0],
  };
}

export function getMockGoldenBootMarket(): Market {
  // Top scorers from traditional football nations
  const topScorers = [
    { name: "Kylian Mbappé", team: "France", baseProb: 0.12 },
    { name: "Erling Haaland", team: "Norway", baseProb: 0.08 },
    { name: "Harry Kane", team: "England", baseProb: 0.10 },
    { name: "Lionel Messi", team: "Argentina", baseProb: 0.07 },
    { name: "Vinicius Jr", team: "Brazil", baseProb: 0.09 },
    { name: "Jude Bellingham", team: "England", baseProb: 0.06 },
    { name: "Antoine Griezmann", team: "France", baseProb: 0.05 },
    { name: "Lautaro Martínez", team: "Argentina", baseProb: 0.06 },
    { name: "Cody Gakpo", team: "Netherlands", baseProb: 0.04 },
    { name: "Bukayo Saka", team: "England", baseProb: 0.05 },
  ];

  const outcomes: Outcome[] = topScorers.map((scorer) => {
    const noise = (Math.random() - 0.5) * 0.01;
    return {
      label: scorer.name,
      price: Math.max(0.01, scorer.baseProb + noise),
      question: `Will ${scorer.name} win the Golden Boot?`,
      url: `https://polymarket.com/event/world-cup-golden-boot`,
      volume: Math.round(Math.random() * 1000000 + 50000),
      liquidity: Math.round(Math.random() * 500000 + 20000),
    };
  });

  return {
    id: "mock-golden-boot",
    platform: "Polymarket",
    title: "2026 FIFA World Cup Golden Boot",
    slug: "world-cup-golden-boot",
    url: "https://polymarket.com/event/world-cup-golden-boot",
    category: "World Cup",
    outcomes,
    volume: outcomes.reduce((sum, o) => sum + (o.volume || 0), 0),
    liquidity: outcomes.reduce((sum, o) => sum + (o.liquidity || 0), 0),
    heat: 72.3,
    topOutcome: outcomes[0],
  };
}

export function getAllMockMarkets(): Market[] {
  return [
    getMockWinnerMarket(),
    getMockGoldenBootMarket(),
  ];
}
