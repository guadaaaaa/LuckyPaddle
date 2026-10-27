import { NextRequest, NextResponse } from "next/server";
import { createHold, getBooking, isValidSlot, releaseHold, isBlocked } from "@/lib/store";
import { manilaNow } from "@/lib/time";
import { CLOSE_HOUR } from "@/lib/config";

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get("_method") === "DELETE") return DELETE(req); // from sendBeacon
  const { date, court, hour, holdId, duration: dur } = await req.json();
  const duration = dur ?? 1;
  if (!isValidSlot(date, court, hour)) return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
  if (!Number.isInteger(duration) || duration < 1 || hour + duration > CLOSE_HOUR)
    return NextResponse.json({ error: "Invalid time range. Pick a start and end within opening hours." }, { status: 400 });
  if (isBlocked(date, court, hour, duration)) return NextResponse.json({ error: "That time is blocked by admin." }, { status: 409 });
  const now = manilaNow();
  if (date < now.date || (date === now.date && hour <= now.hour))
    return NextResponse.json({ error: "That time has already passed." }, { status: 400 });

  if (holdId) releaseHold(holdId); // swapping selection frees the previous slot
  const hold = createHold(date, court, hour, duration);
  if (!hold) return NextResponse.json({ error: "Someone just took that slot. Pick another." }, { status: 409 });
  return NextResponse.json({ id: hold.id, expiresAt: hold.expiresAt, amount: hold.amount });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id && getBooking(id)) releaseHold(id);
  return NextResponse.json({ ok: true });
}
