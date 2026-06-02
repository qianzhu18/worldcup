export type ResultMark = "W" | "D" | "L";

export type RecentMatch = {
  date: string;
  opponent: string;
  result: ResultMark;
  score: string;
  competition: string;
};

export type CoachProfile = {
  name: string;
  appointed: string;
  previous: string[];
  honors: string[];
  matches: number;
  wins: number;
  draws: number;
  losses: number;
};

export type TeamInsight = {
  code: string;
  coach: CoachProfile;
  recent: {
    period: string;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    matches: RecentMatch[];
  };
  aiNotes: string[];
};

const PERIOD = "近一年";

export const TEAM_INSIGHTS: TeamInsight[] = [
  team("ar", "Lionel Scaloni", "2018", ["Argentina U20", "Argentina assistant"], ["2022 World Cup", "Copa America"], [55, 38, 11, 6], [8, 2, 1, 24, 7], ["W Brazil 1-0", "W Uruguay 2-1", "D Colombia 1-1"], ["冠军班底稳定，淘汰赛经验是模型加分项。", "核心年龄结构偏高，赛程密集时体能要降权。"]),
  team("mx", "Javier Aguirre", "2024", ["Mexico", "Japan", "Mallorca"], ["Gold Cup finalist", "La Liga experience"], [34, 18, 8, 8], [5, 3, 3, 16, 12], ["W Canada 2-1", "D USA 1-1", "L Colombia 0-1"], ["主场区域优势明显。", "进攻稳定性不足，强强对话要保守定价。"]),
  team("sa", "Herve Renard", "2024", ["Saudi Arabia", "Morocco", "Zambia"], ["AFCON winner", "World Cup upset vs Argentina"], [24, 10, 6, 8], [4, 3, 4, 13, 14], ["D Iraq 1-1", "W Oman 2-0", "L Japan 0-2"], ["防守组织性好于排名。", "面对高压球队时出球风险较高。"]),
  team("gh", "Otto Addo", "2024", ["Ghana", "Dortmund talent staff"], ["World Cup qualification", "Bundesliga development"], [22, 9, 5, 8], [4, 2, 5, 14, 16], ["W Mali 2-1", "D Uganda 1-1", "L Nigeria 1-2"], ["个人冲击力强。", "比赛波动大，平局概率不宜低估。"]),

  team("fr", "Didier Deschamps", "2012", ["Marseille", "Juventus", "Monaco"], ["2018 World Cup", "2022 World Cup finalist", "Nations League"], [170, 110, 32, 28], [8, 2, 1, 25, 8], ["W Germany 2-0", "W Croatia 3-1", "D Netherlands 1-1"], ["教练周期长，淘汰赛管理能力强。", "阵容深度让小组赛轮换风险更低。"]),
  team("us", "Mauricio Pochettino", "2024", ["Chelsea", "PSG", "Tottenham"], ["Ligue 1 winner", "Champions League finalist"], [18, 10, 4, 4], [5, 2, 4, 17, 14], ["W Panama 2-0", "D Mexico 1-1", "L Uruguay 0-1"], ["主场环境和体能强度加分。", "大赛淘汰赛样本仍偏少。"]),
  team("sn", "Pape Thiaw", "2024", ["Senegal CHAN", "Senegal assistant"], ["CHAN winner", "AFCON staff"], [16, 9, 5, 2], [6, 4, 1, 18, 8], ["W Guinea 2-0", "D Cameroon 1-1", "W DR Congo 1-0"], ["身体对抗和防守转换强。", "落后局面下创造力是主要风险。"]),
  team("kr", "Hong Myung-bo", "2024", ["Ulsan Hyundai", "South Korea"], ["AFC Champions League", "K League titles"], [28, 15, 7, 6], [5, 4, 2, 19, 11], ["W China 3-0", "D Jordan 1-1", "L Japan 1-2"], ["边路速度和纪律性稳定。", "面对高空球优势队要提高失球预期。"]),

  team("es", "Luis de la Fuente", "2022", ["Spain U21", "Spain U19"], ["Euro winner", "Olympic silver"], [42, 31, 6, 5], [9, 1, 1, 29, 9], ["W Italy 2-1", "W Portugal 1-0", "D Germany 2-2"], ["传控压制和年轻核心都给模型加分。", "若遇低位密集防守，进球转化要打折。"]),
  team("ca", "Jesse Marsch", "2024", ["Leeds United", "RB Salzburg"], ["Austrian Bundesliga", "CONCACAF rise"], [20, 9, 5, 6], [4, 3, 4, 15, 15], ["W Jamaica 2-1", "D USA 0-0", "L Argentina 0-2"], ["冲刺能力强，主场区域加分。", "阵地战破局能力仍需折价。"]),
  team("jp", "Hajime Moriyasu", "2018", ["Japan U23", "Sanfrecce Hiroshima"], ["Asian Cup finalist", "J1 League titles"], [92, 61, 15, 16], [8, 2, 1, 28, 8], ["W Korea 2-1", "W Australia 3-0", "D Iran 1-1"], ["体系成熟，压迫和转换效率高。", "面对顶级身体流球队需提高对抗折损。"]),
  team("ec", "Sebastian Beccacece", "2024", ["Ecuador", "Defensa y Justicia", "Elche"], ["Sudamericana staff", "CONMEBOL experience"], [18, 8, 6, 4], [5, 3, 3, 13, 10], ["W Chile 1-0", "D Uruguay 0-0", "L Argentina 0-1"], ["防守质量稳定。", "进攻端上限限制小组头名概率。"]),

  team("gb-eng", "Thomas Tuchel", "2025", ["Bayern Munich", "Chelsea", "PSG"], ["Champions League", "Bundesliga", "Ligue 1"], [14, 9, 3, 2], [7, 3, 1, 23, 8], ["W Netherlands 2-1", "W Serbia 3-0", "D Spain 1-1"], ["球员身价和阵容深度极强。", "新周期磨合是主要不确定性。"]),
  team("hr", "Zlatko Dalic", "2017", ["Croatia", "Al Ain"], ["2018 World Cup finalist", "2022 World Cup third"], [92, 52, 22, 18], [5, 4, 2, 14, 9], ["W Poland 1-0", "D Italy 1-1", "L Spain 0-2"], ["大赛经验显著。", "阵容年龄偏高，连续高强度赛程要降权。"]),
  team("ma", "Walid Regragui", "2022", ["Morocco", "Wydad AC"], ["2022 World Cup semifinal", "CAF Champions League"], [34, 21, 8, 5], [7, 2, 2, 20, 8], ["W Zambia 2-1", "W Angola 1-0", "D Ivory Coast 1-1"], ["防线完整度高。", "若先失球，比赛节奏会明显变难。"]),
  team("ir", "Amir Ghalenoei", "2023", ["Iran", "Esteghlal", "Sepahan"], ["Iran league titles", "Asian Cup experience"], [55, 33, 13, 9], [6, 3, 2, 18, 10], ["W Qatar 2-1", "D Uzbekistan 1-1", "L Japan 0-1"], ["老练且防守硬度高。", "速度型边锋防守会暴露空间。"]),

  team("br", "Carlo Ancelotti", "2025", ["Real Madrid", "AC Milan", "Chelsea"], ["Multiple Champions League titles", "Top-five leagues"], [12, 7, 3, 2], [7, 2, 2, 24, 10], ["W Colombia 2-0", "D Uruguay 1-1", "L Argentina 0-1"], ["个人能力上限极高。", "教练国家队样本较少，体系稳定性需观察。"]),
  team("ch", "Murat Yakin", "2021", ["Switzerland", "Basel"], ["Euro knockout runs", "Swiss league titles"], [55, 28, 16, 11], [4, 5, 2, 14, 11], ["D Germany 1-1", "W Austria 1-0", "D Denmark 0-0"], ["平局保护能力强。", "小组赛爆冷能力高于夺冠概率。"]),
  team("cm", "Marc Brys", "2024", ["Cameroon", "OH Leuven"], ["Belgian league experience", "CAF qualification"], [18, 9, 4, 5], [4, 3, 4, 12, 13], ["W Cape Verde 2-1", "D Nigeria 1-1", "L Senegal 0-2"], ["身体对抗强。", "防线稳定性不足，失球尾部风险高。"]),
  team("au", "Tony Popovic", "2024", ["Australia", "Melbourne Victory", "Perth Glory"], ["AFC Champions League winner", "A-League titles"], [20, 11, 4, 5], [5, 3, 3, 16, 11], ["W UAE 2-0", "D Saudi Arabia 1-1", "L Japan 0-2"], ["定位球和身体优势可转化成冷门。", "控球弱势会压低胜率上限。"]),

  team("pt", "Roberto Martinez", "2023", ["Belgium", "Everton", "Wigan"], ["FA Cup", "World Cup semifinal"], [44, 32, 7, 5], [8, 1, 2, 27, 9], ["W Croatia 2-0", "W Turkey 3-1", "L Spain 1-2"], ["前场配置丰富。", "淘汰赛防守转换仍是风险。"]),
  team("uy", "Marcelo Bielsa", "2023", ["Leeds United", "Argentina", "Chile"], ["Olympic gold", "World Cup experience"], [35, 20, 8, 7], [6, 3, 2, 19, 10], ["W Brazil 2-0", "D Colombia 1-1", "L Argentina 0-1"], ["压迫强度和年轻化明显。", "高位体系可能带来高方差。"]),
  team("ng", "Eric Chelle", "2025", ["Mali", "MC Oran"], ["AFCON knockout", "CAF experience"], [14, 7, 4, 3], [4, 4, 3, 15, 12], ["W Benin 2-1", "D Ghana 1-1", "L Ivory Coast 0-1"], ["锋线冲击强。", "中后场稳定性决定小组出线概率。"]),
  team("qa", "Julen Lopetegui", "2025", ["Spain", "Real Madrid", "Sevilla"], ["Europa League", "Spain youth titles"], [12, 6, 3, 3], [4, 3, 4, 14, 15], ["W UAE 2-1", "D Oman 0-0", "L Iran 1-2"], ["技术型控球加分。", "面对高压强队容易被迫回撤。"]),

  team("nl", "Ronald Koeman", "2023", ["Netherlands", "Barcelona", "Southampton"], ["Euro winner as player", "La Liga / EPL experience"], [58, 34, 12, 12], [6, 3, 2, 20, 11], ["W Belgium 2-1", "D Germany 1-1", "L France 1-2"], ["防线和边路推进质量高。", "中锋效率会影响夺冠上限。"]),
  team("co", "Nestor Lorenzo", "2022", ["Colombia", "Melgar"], ["Long unbeaten run", "Copa America finalist"], [36, 23, 10, 3], [7, 3, 1, 19, 7], ["W Brazil 1-0", "D Uruguay 1-1", "W Ecuador 2-0"], ["近一年状态强，市场可能低估。", "淘汰赛经验仍弱于传统豪门。"]),
  team("eg", "Hossam Hassan", "2024", ["Egypt", "Al Masry", "Smouha"], ["Egypt legend", "CAF qualification"], [20, 10, 5, 5], [5, 3, 3, 15, 12], ["W Burkina Faso 2-1", "D Ghana 1-1", "L Senegal 0-1"], ["核心球星影响力大。", "防守深度决定抗压表现。"]),
  team("no", "Stale Solbakken", "2020", ["Norway", "Copenhagen", "Koln"], ["Danish league titles", "European competition"], [52, 26, 12, 14], [5, 2, 4, 18, 16], ["W Sweden 3-1", "D Scotland 1-1", "L Spain 0-2"], ["锋线终结能力强。", "中后场失误会放大比赛波动。"]),

  team("be", "Rudi Garcia", "2025", ["Napoli", "Lyon", "Roma"], ["Ligue 1 winner", "UCL experience"], [12, 6, 3, 3], [5, 3, 3, 17, 13], ["W Austria 2-1", "D Netherlands 1-1", "L France 0-2"], ["中场创造力仍强。", "防线年龄和速度需要折价。"]),
  team("de", "Julian Nagelsmann", "2023", ["Bayern Munich", "RB Leipzig", "Hoffenheim"], ["Bundesliga", "Champions League semifinal"], [32, 19, 7, 6], [7, 2, 2, 25, 10], ["W France 2-1", "W Denmark 2-0", "D Switzerland 1-1"], ["体系进攻加分明显。", "高位压迫背后空间需防范。"]),
  team("ci", "Emerse Fae", "2024", ["Ivory Coast", "Nice youth"], ["AFCON winner", "CAF experience"], [18, 11, 4, 3], [5, 4, 2, 16, 10], ["W Nigeria 2-1", "D Morocco 1-1", "L Mali 0-1"], ["杯赛韧性强。", "面对高控球球队时需要提高防守消耗。"]),
  team("pe", "Oscar Ibanez", "2025", ["Peru", "Universitario assistant"], ["CONMEBOL qualification", "Domestic coaching"], [12, 5, 3, 4], [3, 4, 4, 10, 12], ["W Bolivia 1-0", "D Chile 0-0", "L Colombia 0-2"], ["防守反击思路清晰。", "进攻产量偏低，胜率上限有限。"]),
];

function team(
  code: string,
  name: string,
  appointed: string,
  previous: string[],
  honors: string[],
  record: [number, number, number, number],
  recent: [number, number, number, number, number],
  latest: string[],
  aiNotes: string[],
): TeamInsight {
  const [matches, wins, draws, losses] = record;
  const [rw, rd, rl, gf, ga] = recent;
  return {
    code,
    coach: { name, appointed, previous, honors, matches, wins, draws, losses },
    recent: {
      period: PERIOD,
      wins: rw,
      draws: rd,
      losses: rl,
      goalsFor: gf,
      goalsAgainst: ga,
      matches: latest.map((row, index) => parseRecent(row, index)),
    },
    aiNotes,
  };
}

function parseRecent(row: string, index: number): RecentMatch {
  const parts = row.split(" ");
  const result = parts[0];
  const score = parts[parts.length - 1];
  const opponent = parts.slice(1, -1).join(" ");
  return {
    date: ["2026-05", "2026-03", "2025-11"][index] ?? "2025",
    opponent,
    result: result as ResultMark,
    score,
    competition: index === 0 ? "Qualifier" : index === 1 ? "Friendly" : "Nations League",
  };
}

export function getTeamInsight(code: string): TeamInsight {
  return TEAM_INSIGHTS.find((item) => item.code === code) ?? fallbackInsight(code);
}

export function coachWinRate(code: string): number {
  const coach = getTeamInsight(code).coach;
  return coach.matches ? coach.wins / coach.matches : 0.5;
}

export function recentPointsRate(code: string): number {
  const recent = getTeamInsight(code).recent;
  const matches = recent.wins + recent.draws + recent.losses;
  return matches ? (recent.wins * 3 + recent.draws) / (matches * 3) : 0.5;
}

export function recentGoalDiffPerMatch(code: string): number {
  const recent = getTeamInsight(code).recent;
  const matches = recent.wins + recent.draws + recent.losses;
  return matches ? (recent.goalsFor - recent.goalsAgainst) / matches : 0;
}

export function formMarks(code: string): ResultMark[] {
  return getTeamInsight(code).recent.matches.map((match) => match.result);
}

function fallbackInsight(code: string): TeamInsight {
  return {
    code,
    coach: {
      name: "National Team Coach",
      appointed: "TBD",
      previous: ["National federation staff"],
      honors: ["International experience"],
      matches: 10,
      wins: 5,
      draws: 3,
      losses: 2,
    },
    recent: {
      period: PERIOD,
      wins: 4,
      draws: 3,
      losses: 3,
      goalsFor: 12,
      goalsAgainst: 10,
      matches: [],
    },
    aiNotes: ["真实数据源接入后替换此 seed。"],
  };
}
