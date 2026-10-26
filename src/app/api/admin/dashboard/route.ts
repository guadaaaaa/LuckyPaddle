import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { CLOSE_HOUR, COURTS, OPEN_HOUR } from "@/lib/config";
import { listBookings } from "@/lib/store";
import { manilaNow } from "@/lib/time";

export const dynamic = "force-dynamic";

const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = manilaNow();
  const requested = req.nextUrl.searchParams.get("date") ?? now.date;
  const date = isDate(requested) ? requested : now.date;

  const bookings = listBookings();
  const paid = bookings.filter((b) => b.status === "paid");
  const todayPaid = paid.filter((b) => b.date === now.date);
  const slotsPerDay = CLOSE_HOUR - OPEN_HOUR;

  const stats = {
    revenue: paid.reduce((sum, b) => sum + b.amount, 0),
    paidCount: paid.length,
    upcomingCount: paid.filter((b) => b.date > now.date || (b.date === now.date && b.hour > now.hour)).length,
    todayBookings: todayPaid.length,
    occupancy: Math.min(100, Math.round((todayPaid.length / slotsPerDay) * 100)),
    activeHolds: bookings.filter((b) => b.status !== "paid").length,
  };

  const schedule = Array.from({ length: slotsPerDay }, (_, index) => {
    const hour = OPEN_HOUR + index;
    return {
      hour,
      booking: bookings.find((b) => b.date === date && b.hour === hour) ?? null,
      past: date < now.date || (date === now.date && hour <= now.hour),
    };
  });

  return NextResponse.json({
    date,
    today: now.date,
    court: COURTS[0]?.name ?? "Court",
    stats,
    schedule,
    bookings,
  });
}
