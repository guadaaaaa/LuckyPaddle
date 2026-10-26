import { NextRequest, NextResponse } from "next/server";
import { dayStatus } from "@/lib/store";
import { manilaNow } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? manilaNow().date;
  return NextResponse.json({ date, status: dayStatus(date), now: manilaNow() });
}
