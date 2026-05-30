import { createServerClient } from "@/lib/supabase";

const AGENT_API_URL = process.env.AGENT_API_URL || "http://localhost:8000";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const body = await req.json();

  // Add user_id from session if not provided
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestBody = {
    ...body,
    user_id: user.id,
  };

  // Forward to FastAPI and stream back
  const upstream = await fetch(`${AGENT_API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!upstream.ok) {
    const error = await upstream.text();
    return Response.json({ error }, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
