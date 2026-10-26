import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { RATES, getPrice } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ rates: RATES });
}

export async function POST(req: NextRequest) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { maxHours, price } = await req.json().catch(() => ({}));
  if (typeof maxHours !== "number" || typeof price !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  // update or add tier
  const index = RATES.findIndex((t) => t.maxHours === maxHours);
  if (index >= 0) RATES[index].price = price;
  else RATES.push({ maxHours, price });
  // keep sorted by maxHours
  RATES.sort((a, b) => a.maxHours - b.maxHours);
  return NextResponse.json({ rates: RATES });
}