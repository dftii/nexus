import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness probe: the process is up. Never touches the database. */
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "nexus",
    timestamp: new Date().toISOString(),
  });
}
