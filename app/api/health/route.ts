export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    ok: true,
    service: "worldcup-polymarket-win",
    timestamp: new Date().toISOString(),
  });
}
