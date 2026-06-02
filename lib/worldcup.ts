// World Cup 2026 curated dataset.
// NOTE: Football fixtures / squads here are illustrative seed data for the MVP.
// Market data (Polymarket) is LIVE & real. Swap this module for a real football
// API (API-Football / SportMonks / football-data.org) when keys are available.

export type Team = {
  code: string; // ISO-3166 alpha-2 (lowercase) for flagcdn
  name: string;
  zh: string;
  group: string;
  fifaRank: number;
  elo: number; // strength rating used by the prediction model
  confederation: string;
};

export const TEAMS: Team[] = [
  { code: "ar", name: "Argentina", zh: "阿根廷", group: "A", fifaRank: 1, elo: 2065, confederation: "CONMEBOL" },
  { code: "mx", name: "Mexico", zh: "墨西哥", group: "A", fifaRank: 17, elo: 1810, confederation: "CONCACAF" },
  { code: "sa", name: "Saudi Arabia", zh: "沙特", group: "A", fifaRank: 58, elo: 1640, confederation: "AFC" },
  { code: "gh", name: "Ghana", zh: "加纳", group: "A", fifaRank: 70, elo: 1610, confederation: "CAF" },

  { code: "fr", name: "France", zh: "法国", group: "B", fifaRank: 2, elo: 2080, confederation: "UEFA" },
  { code: "us", name: "USA", zh: "美国", group: "B", fifaRank: 16, elo: 1790, confederation: "CONCACAF" },
  { code: "sn", name: "Senegal", zh: "塞内加尔", group: "B", fifaRank: 19, elo: 1770, confederation: "CAF" },
  { code: "kr", name: "South Korea", zh: "韩国", group: "B", fifaRank: 23, elo: 1740, confederation: "AFC" },

  { code: "es", name: "Spain", zh: "西班牙", group: "C", fifaRank: 3, elo: 2075, confederation: "UEFA" },
  { code: "ca", name: "Canada", zh: "加拿大", group: "C", fifaRank: 30, elo: 1720, confederation: "CONCACAF" },
  { code: "jp", name: "Japan", zh: "日本", group: "C", fifaRank: 15, elo: 1800, confederation: "AFC" },
  { code: "ec", name: "Ecuador", zh: "厄瓜多尔", group: "C", fifaRank: 24, elo: 1735, confederation: "CONMEBOL" },

  { code: "gb-eng", name: "England", zh: "英格兰", group: "D", fifaRank: 4, elo: 2010, confederation: "UEFA" },
  { code: "hr", name: "Croatia", zh: "克罗地亚", group: "D", fifaRank: 10, elo: 1860, confederation: "UEFA" },
  { code: "ma", name: "Morocco", zh: "摩洛哥", group: "D", fifaRank: 12, elo: 1845, confederation: "CAF" },
  { code: "ir", name: "Iran", zh: "伊朗", group: "D", fifaRank: 21, elo: 1745, confederation: "AFC" },

  { code: "br", name: "Brazil", zh: "巴西", group: "E", fifaRank: 5, elo: 2010, confederation: "CONMEBOL" },
  { code: "ch", name: "Switzerland", zh: "瑞士", group: "E", fifaRank: 20, elo: 1760, confederation: "UEFA" },
  { code: "cm", name: "Cameroon", zh: "喀麦隆", group: "E", fifaRank: 53, elo: 1650, confederation: "CAF" },
  { code: "au", name: "Australia", zh: "澳大利亚", group: "E", fifaRank: 25, elo: 1730, confederation: "AFC" },

  { code: "pt", name: "Portugal", zh: "葡萄牙", group: "F", fifaRank: 6, elo: 2000, confederation: "UEFA" },
  { code: "uy", name: "Uruguay", zh: "乌拉圭", group: "F", fifaRank: 11, elo: 1855, confederation: "CONMEBOL" },
  { code: "ng", name: "Nigeria", zh: "尼日利亚", group: "F", fifaRank: 28, elo: 1725, confederation: "CAF" },
  { code: "qa", name: "Qatar", zh: "卡塔尔", group: "F", fifaRank: 35, elo: 1690, confederation: "AFC" },

  { code: "nl", name: "Netherlands", zh: "荷兰", group: "G", fifaRank: 7, elo: 1965, confederation: "UEFA" },
  { code: "co", name: "Colombia", zh: "哥伦比亚", group: "G", fifaRank: 13, elo: 1840, confederation: "CONMEBOL" },
  { code: "eg", name: "Egypt", zh: "埃及", group: "G", fifaRank: 33, elo: 1700, confederation: "CAF" },
  { code: "no", name: "Norway", zh: "挪威", group: "G", fifaRank: 22, elo: 1755, confederation: "UEFA" },

  { code: "be", name: "Belgium", zh: "比利时", group: "H", fifaRank: 8, elo: 1925, confederation: "UEFA" },
  { code: "de", name: "Germany", zh: "德国", group: "H", fifaRank: 9, elo: 1915, confederation: "UEFA" },
  { code: "ci", name: "Ivory Coast", zh: "科特迪瓦", group: "H", fifaRank: 40, elo: 1680, confederation: "CAF" },
  { code: "pe", name: "Peru", zh: "秘鲁", group: "H", fifaRank: 32, elo: 1705, confederation: "CONMEBOL" },
];

export const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function teamByCode(code: string): Team | undefined {
  return TEAMS.find((t) => t.code === code);
}

export function teamsInGroup(g: string): Team[] {
  return TEAMS.filter((t) => t.group === g).sort((a, b) => a.elo > b.elo ? -1 : 1);
}

export function flag(code: string): string {
  return `https://flagcdn.com/w160/${code}.png`;
}

// ---- Fixtures ----
export type Stage =
  | "Group" | "Round of 32" | "Round of 16" | "Quarterfinal" | "Semifinal" | "Final";

export type Match = {
  id: string;
  stage: Stage;
  group?: string;
  home: string; // team code
  away: string;
  kickoff: string; // ISO
  venue: string;
  city: string;
  status: "scheduled" | "live" | "finished";
  score?: [number, number];
};

// Group-stage schedule (matchday 1) + a few illustrative knockout slots.
export const MATCHES: Match[] = [
  { id: "m1", stage: "Group", group: "A", home: "ar", away: "gh", kickoff: "2026-06-11T20:00:00Z", venue: "Estadio Azteca", city: "Mexico City", status: "scheduled" },
  { id: "m2", stage: "Group", group: "A", home: "mx", away: "sa", kickoff: "2026-06-11T23:00:00Z", venue: "Estadio Akron", city: "Guadalajara", status: "scheduled" },
  { id: "m3", stage: "Group", group: "B", home: "fr", away: "kr", kickoff: "2026-06-12T18:00:00Z", venue: "MetLife Stadium", city: "New York", status: "scheduled" },
  { id: "m4", stage: "Group", group: "B", home: "us", away: "sn", kickoff: "2026-06-12T21:00:00Z", venue: "SoFi Stadium", city: "Los Angeles", status: "scheduled" },
  { id: "m5", stage: "Group", group: "C", home: "es", away: "ec", kickoff: "2026-06-13T18:00:00Z", venue: "Lumen Field", city: "Seattle", status: "scheduled" },
  { id: "m6", stage: "Group", group: "C", home: "jp", away: "ca", kickoff: "2026-06-13T21:00:00Z", venue: "BC Place", city: "Vancouver", status: "scheduled" },
  { id: "m7", stage: "Group", group: "D", home: "gb-eng", away: "ir", kickoff: "2026-06-14T18:00:00Z", venue: "Gillette Stadium", city: "Boston", status: "scheduled" },
  { id: "m8", stage: "Group", group: "D", home: "hr", away: "ma", kickoff: "2026-06-14T21:00:00Z", venue: "Hard Rock Stadium", city: "Miami", status: "scheduled" },
  { id: "m9", stage: "Group", group: "E", home: "br", away: "cm", kickoff: "2026-06-15T18:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta", status: "scheduled" },
  { id: "m10", stage: "Group", group: "E", home: "ch", away: "au", kickoff: "2026-06-15T21:00:00Z", venue: "Levi's Stadium", city: "San Francisco", status: "scheduled" },
  { id: "m11", stage: "Group", group: "F", home: "pt", away: "qa", kickoff: "2026-06-16T18:00:00Z", venue: "AT&T Stadium", city: "Dallas", status: "scheduled" },
  { id: "m12", stage: "Group", group: "F", home: "uy", away: "ng", kickoff: "2026-06-16T21:00:00Z", venue: "NRG Stadium", city: "Houston", status: "scheduled" },
  { id: "m13", stage: "Group", group: "G", home: "nl", away: "eg", kickoff: "2026-06-17T18:00:00Z", venue: "Lincoln Financial Field", city: "Philadelphia", status: "scheduled" },
  { id: "m14", stage: "Group", group: "G", home: "co", away: "no", kickoff: "2026-06-17T21:00:00Z", venue: "Arrowhead Stadium", city: "Kansas City", status: "scheduled" },
  { id: "m15", stage: "Group", group: "H", home: "de", away: "pe", kickoff: "2026-06-18T18:00:00Z", venue: "Levi's Stadium", city: "San Francisco", status: "scheduled" },
  { id: "m16", stage: "Group", group: "H", home: "be", away: "ci", kickoff: "2026-06-18T21:00:00Z", venue: "MetLife Stadium", city: "New York", status: "scheduled" },
  { id: "kf", stage: "Final", home: "fr", away: "es", kickoff: "2026-07-19T19:00:00Z", venue: "MetLife Stadium", city: "New York", status: "scheduled" },
];

export function matchById(id: string): Match | undefined {
  return MATCHES.find((m) => m.id === id);
}

// Illustrative head-to-head history between two team codes.
export function headToHead(a: string, b: string): { date: string; score: string; comp: string }[] {
  const seed = (a.charCodeAt(0) + b.charCodeAt(1)) % 5;
  const base = [
    { date: "2022-12-10", score: "2 - 1", comp: "World Cup QF" },
    { date: "2021-06-18", score: "1 - 1", comp: "Friendly" },
    { date: "2019-09-05", score: "0 - 2", comp: "Nations League" },
    { date: "2018-03-23", score: "3 - 2", comp: "Friendly" },
    { date: "2016-11-11", score: "1 - 0", comp: "Qualifier" },
  ];
  return base.slice(seed % 2, (seed % 2) + 4);
}
