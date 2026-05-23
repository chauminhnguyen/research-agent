import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  response.cookies.delete("token");
  
  return response;
}
