import { NextRequest, NextResponse } from "next/server";
import { dayStatus, listBlocks } from "@/lib/store";
import { manilaNow } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? manilaNow().date;
  const status = dayStatus(date);
  const blocks = listBlocks().filter((b) => b.date === date);
  for (const blk of blocks) {
    const c = (status[blk.court] ??= {});
    for (let i = 0; i < blk.duration; i++) {
      const h = blk.hour + i;
      c[h] = "booked" as const;
    }
  }
  return NextResponse.json({ date, status, now: manilaNow(), blocks });
}
