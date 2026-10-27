import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { RATES, TIME_RATES } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ rates: RATES, timeRates: TIME_RATES });
}

export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (Array.isArray(body.timeRates)) {
    TIME_RATES.length = 0;
    for (const t of body.timeRates) {
      const start = Number(t.start), end = Number(t.end), price = Number(t.price);
      if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(price) || price < 0) continue;
      TIME_RATES.push({ start, end, price });
    }
    TIME_RATES.sort((a, b) => a.start - b.start);
    return NextResponse.json({ rates: RATES, timeRates: TIME_RATES });
  }
  const { maxHours, price } = body;
  if (typeof maxHours !== "number" || typeof price !== "number" || maxHours < 1 || price < 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const index = RATES.findIndex((t) => t.maxHours === maxHours);
  if (index >= 0) RATES[index].price = price;
  else RATES.push({ maxHours, price });
  RATES.sort((a, b) => a.maxHours - b.maxHours);
  return NextResponse.json({ rates: RATES, timeRates: TIME_RATES });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const maxHours = Number(req.nextUrl.searchParams.get("maxHours"));
  const index = RATES.findIndex((t) => t.maxHours === maxHours);
  if (index >= 0) RATES.splice(index, 1);
  return NextResponse.json({ rates: RATES, timeRates: TIME_RATES });
}

