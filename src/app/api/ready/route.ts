import { NextResponse } from "next/server";
import { pingDatabase } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * Readiness probe: 200 when the database answers `SELECT 1`, 503 otherwise.
 * The body never includes error messages or connection details.
 */
export async function GET() {
  const database = await pingDatabase();
  if (!database) {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({
    status: "ready",
    checks: { database: "ok" },
    timestamp: new Date().toISOString(),
  });
}
