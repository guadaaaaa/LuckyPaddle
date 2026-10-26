import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/paymongo";
import { markPaid } from "@/lib/store";
import { sendConfirmation } from "@/lib/email";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("paymongo-signature")))
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });

  const event = JSON.parse(raw);
  if (event?.data?.attributes?.type === "checkout_session.payment.paid") {
    const id = event.data.attributes.data?.attributes?.metadata?.booking_id as string | undefined;
    if (id) {
      const { booking, firstTime } = markPaid(id);
      if (booking && firstTime) await sendConfirmation(booking); // email only once
    }
  }
  return NextResponse.json({ received: true });
}
