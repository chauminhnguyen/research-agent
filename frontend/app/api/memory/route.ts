import { NextRequest, NextResponse } from "next/server";

const BASE = process.env.AGENT_API_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const session_id = searchParams.get("session_id");
  const limit = searchParams.get("limit") || "5";

  if (!q) {
    return NextResponse.json({ error: "q parameter is required" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({ q, limit });
    if (session_id) params.set("session_id", session_id);

    const response = await fetch(`${BASE}/v1/memory/recall?${params}`, {
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.detail || "Memory recall failed" }, { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("Memory recall error:", error);
    return NextResponse.json({ error: "Failed to recall memory" }, { status: 500 });
  }
}
