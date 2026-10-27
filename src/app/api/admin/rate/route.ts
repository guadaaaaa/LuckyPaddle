import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getRates, getTimeRates, setRates, setTimeRates } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [rates, timeRates] = await Promise.all([getRates(), getTimeRates()]);
  return NextResponse.json({ rates, timeRates });
}

export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (Array.isArray(body.timeRates)) {
    const cleaned = body.timeRates
      .map((t: any) => ({ start: Number(t.start), end: Number(t.end), price: Number(t.price) }))
      .filter((t: any) => Number.isFinite(t.start) && Number.isFinite(t.end) && Number.isFinite(t.price) && t.price >= 0);
    const timeRates = await setTimeRates(cleaned);
    const rates = await getRates();
    return NextResponse.json({ rates, timeRates });
  }
  const { maxHours, price } = body;
  if (typeof maxHours !== "number" || typeof price !== "number" || maxHours < 1 || price < 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const current = await getRates();
  const next = [...current];
  const index = next.findIndex((t) => t.maxHours === maxHours);
  if (index >= 0) next[index] = { maxHours, price };
  else next.push({ maxHours, price });
  const rates = await setRates(next);
  const timeRates = await getTimeRates();
  return NextResponse.json({ rates, timeRates });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const maxHours = Number(req.nextUrl.searchParams.get("maxHours"));
  const current = await getRates();
  const next = current.filter((t) => t.maxHours !== maxHours);
  const rates = await setRates(next);
  const timeRates = await getTimeRates();
  return NextResponse.json({ rates, timeRates });
}

