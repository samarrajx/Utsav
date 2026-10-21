/**
 * Health check endpoint for Utsav API
 */
export default async function handler(req, res) {
  const payload = {
    ok: true,
    message: "pong",
    service: "Utsav AI Planner",
    timestamp: new Date().toISOString()
  };

  if (res && typeof res.status === "function") {
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(payload);
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
