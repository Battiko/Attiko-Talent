import { NextResponse } from "next/server";

export async function GET() {
  const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
  try {
    const res = await fetch(`${apiUrl}/api/health`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(5_000),
    });
    const data: unknown = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (cause) {
    return NextResponse.json(
      {
        status: "down",
        error: cause instanceof Error ? cause.message : "API unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
