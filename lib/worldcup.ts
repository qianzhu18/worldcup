// World Cup 2026 dataset. Teams and fixtures are generated from public 2026
// World Cup schedule data via scripts/pull-worldcup-data.mjs.
import { GENERATED_MATCHES, GENERATED_TEAMS } from "./generated/worldcup-data";

export type Team = {
  code: string; // ISO-3166 alpha-2 (lowercase) for flagcdn
  name: string;
  zh: string;
  group: string;
  fifaRank: number;
  elo: number; // strength rating used by the prediction model
  confederation: string;
};

export const TEAMS: Team[] = GENERATED_TEAMS;

export const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

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
  | "Group" | "Round of 32" | "Round of 16" | "Quarterfinal" | "Semifinal" | "Third place" | "Final";

export type Match = {
  id: string;
  stage: Stage;
  group?: string;
  home?: string; // team code when known
  away?: string;
  homeLabel?: string;
  awayLabel?: string;
  kickoff: string; // ISO
  kickoffLocal?: string;
  venue: string;
  city: string;
  status: "scheduled" | "live" | "finished";
  score?: [number, number];
};

export const MATCHES: Match[] = GENERATED_MATCHES;

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
