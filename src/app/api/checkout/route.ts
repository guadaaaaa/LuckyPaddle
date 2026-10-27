import { NextRequest, NextResponse } from "next/server";
import { getBooking, markPaid, startPayment } from "@/lib/store";
import { createCheckoutSession, paymongoConfigured } from "@/lib/paymongo";
import { sendConfirmation } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { holdId, name, email, phone, paddles, balls } = await req.json();
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email ?? "") || !phone?.trim())
    return NextResponse.json({ error: "Enter your name, a valid email and phone number." }, { status: 400 });

  const hold = getBooking(holdId);
  if (!hold || hold.status !== "held")
    return NextResponse.json({ error: "Your 10-minute hold has expired. Pick the slot again." }, { status: 410 });

  const { getInventory } = await import("@/lib/store");
  const inv = getInventory();
  if ((Number(paddles) || 0) > inv.paddles || (Number(balls) || 0) > inv.balls) {
    return NextResponse.json({ error: "Not enough paddles or balls in stock." }, { status: 409 });
  }
  const extra = (Number(paddles) || 0) * 100 + (Number(balls) || 0) * 100;
  if (extra > 0) {
    hold.amount += extra;
    hold.paddles = Number(paddles) || 0;
    hold.balls = Number(balls) || 0;
  }

  const b = startPayment(holdId, { name: name.trim(), email: email.trim(), phone: phone.trim() })!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  // Placeholder mode: no PayMongo key yet, so pretend the payment succeeded.
  if (!paymongoConfigured()) {
    const { booking } = markPaid(b.id);
    if (booking) await sendConfirmation(booking);
    return NextResponse.json({ url: `${appUrl}/success?id=${b.id}&mock=1` });
  }
  try {
    return NextResponse.json({ url: await createCheckoutSession(b, appUrl) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
