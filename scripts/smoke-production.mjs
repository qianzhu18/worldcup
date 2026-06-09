const DEFAULT_BASE_URL = "https://worldcup-polymarket-win.vercel.app";
const baseUrl = (process.env.SMOKE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 45000);

const checks = [
  {
    name: "home page",
    path: "/",
    status: 200,
    contains: ["JMWL World Cup"],
  },
  {
    name: "login page",
    path: "/login",
    status: 200,
    contains: ['type="email"', "/register"],
  },
  {
    name: "register page",
    path: "/register",
    status: 200,
    contains: ['type="email"', "/login"],
  },
  {
    name: "privacy page",
    path: "/privacy",
    status: 200,
    contains: ["privacy policy"],
  },
  {
    name: "terms page",
    path: "/terms",
    status: 200,
    contains: ["terms of service"],
  },
  {
    name: "match prediction card",
    path: "/match/m1",
    status: 200,
    contains: ["prediction arena", "/predictions"],
  },
  {
    name: "profile redirects when signed out",
    path: "/profile",
    status: 200,
    finalPath: "/login",
  },
  {
    name: "predictions redirects when signed out",
    path: "/predictions",
    status: 200,
    finalPath: "/login",
  },
  {
    name: "prediction API requires auth",
    path: "/api/predictions",
    status: 401,
    contains: ["Unauthorized"],
  },
  {
    name: "signals API responds",
    path: "/api/signals",
    status: 200,
    warnAfterMs: 15000,
  },
];

function makeUrl(path) {
  return new URL(path, `${baseUrl}/`).toString();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "worldcup-smoke-test/1.0",
      },
    });
    const text = await response.text();
    return {
      response,
      text,
      durationMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timer);
  }
}

let failures = 0;
let warnings = 0;

console.log(`Smoke target: ${baseUrl}`);

for (const check of checks) {
  const url = makeUrl(check.path);

  try {
    const { response, text, durationMs } = await fetchWithTimeout(url);
    const finalUrl = new URL(response.url);
    const problems = [];

    if (response.status !== check.status) {
      problems.push(`expected status ${check.status}, got ${response.status}`);
    }

    if (check.finalPath && finalUrl.pathname !== check.finalPath) {
      problems.push(`expected final path ${check.finalPath}, got ${finalUrl.pathname}`);
    }

    for (const needle of check.contains || []) {
      if (!text.includes(needle)) {
        problems.push(`missing text: ${needle}`);
      }
    }

    if (problems.length > 0) {
      failures += 1;
      console.log(`FAIL ${check.name} (${durationMs}ms)`);
      for (const problem of problems) console.log(`  - ${problem}`);
      continue;
    }

    if (check.warnAfterMs && durationMs > check.warnAfterMs) {
      warnings += 1;
      console.log(`WARN ${check.name} passed but slow (${durationMs}ms)`);
      continue;
    }

    console.log(`PASS ${check.name} (${durationMs}ms)`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${check.name}`);
    console.log(`  - ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (warnings > 0) {
  console.log(`Completed with ${warnings} warning(s).`);
}

if (failures > 0) {
  console.error(`Smoke test failed with ${failures} failure(s).`);
  process.exit(1);
}

console.log("Smoke test passed.");
