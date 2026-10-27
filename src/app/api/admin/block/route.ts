import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { addBlock, listBlocks, removeBlock } from "@/lib/store";
import { OPEN_HOUR, CLOSE_HOUR } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ blocks: listBlocks() });
}

export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { date, court = 1, hour, duration = 1, reason = "" } = await req.json().catch(() => ({}));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  if (!Number.isInteger(hour) || hour < OPEN_HOUR || hour + duration > CLOSE_HOUR || duration < 1) {
    return NextResponse.json({ error: "Invalid time range" }, { status: 400 });
  }
  const blk = addBlock(date, court, hour, duration, reason);
  return NextResponse.json({ block: blk, blocks: listBlocks() });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  removeBlock(id);
  return NextResponse.json({ blocks: listBlocks() });
}
