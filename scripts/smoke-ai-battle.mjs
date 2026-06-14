const target =
  process.env.AI_BATTLE_SMOKE_URL ||
  "http://localhost:3000/api/sports-guess/ai-predictions?matchId=m1";
const timeoutMs = Number(process.env.AI_BATTLE_SMOKE_TIMEOUT_MS || 20000);

const startedAt = Date.now();
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), timeoutMs);

try {
  const res = await fetch(target, { signal: ctrl.signal });
  const text = await res.text();
  const elapsedMs = Date.now() - startedAt;

  if (!res.ok) {
    throw new Error(`Expected 2xx, got ${res.status}: ${text.slice(0, 200)}`);
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON response, got: ${text.slice(0, 200)}`);
  }

  if (!Array.isArray(body.predictions) || body.predictions.length < 3) {
    throw new Error(`Expected at least 3 predictions, got ${JSON.stringify(body.predictions)}`);
  }

  for (const prediction of body.predictions) {
    for (const key of ["personaId", "displayName", "home", "draw", "away", "confidence", "summary"]) {
      if (prediction[key] === undefined || prediction[key] === null || prediction[key] === "") {
        throw new Error(`Prediction missing ${key}: ${JSON.stringify(prediction)}`);
      }
    }
  }

  console.log(`AI battle smoke passed in ${elapsedMs}ms with ${body.predictions.length} predictions`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`AI battle smoke failed for ${target}: ${message}`);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
