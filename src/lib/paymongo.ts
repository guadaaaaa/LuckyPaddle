import { createHmac, timingSafeEqual } from "crypto";
import { BRAND, hourLabel } from "./config";
import type { Booking } from "./store";

export const paymongoConfigured = () => Boolean(process.env.PAYMONGO_SECRET_KEY);

/** Creates a PayMongo Checkout Session (hosted page: GCash, Maya, cards, GrabPay). */
export async function createCheckoutSession(b: Booking, appUrl: string): Promise<string> {
  const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString("base64"),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [{
            currency: "PHP", amount: b.amount * 100, quantity: 1,
            name: `${BRAND} · Court ${b.court} · ${b.date} ${hourLabel(b.hour)}`,
          }],
          payment_method_types: ["gcash", "paymaya", "card", "grab_pay"],
          description: `${BRAND} court booking`,
          send_email_receipt: true,
          show_description: true,
          success_url: `${appUrl}/success?id=${b.id}`,
          cancel_url: `${appUrl}/?cancelled=1`,
          metadata: { booking_id: b.id },
        },
      },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.errors?.[0]?.detail ?? "PayMongo error");
  return json.data.attributes.checkout_url as string;
}

/** Verifies the `Paymongo-Signature` header (t=..., te=test sig, li=live sig). */
export function verifyWebhook(raw: string, header: string | null) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret) return true; // placeholder mode: skip verification
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const expected = createHmac("sha256", secret).update(`${parts.t}.${raw}`).digest("hex");
  const given = parts.li || parts.te || "";
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
