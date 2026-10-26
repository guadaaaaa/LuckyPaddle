import { BRAND, courtName, hourLabel, peso } from "./config";
import type { Booking } from "./store";

/** Sends the confirmation email through Resend. Without a key it just logs (placeholder). */
export async function sendConfirmation(b: Booking) {
  if (!b.email) return;
  const html = `<div style="font-family:system-ui;max-width:480px;margin:auto;padding:24px;background:#f1fbf4;border-radius:16px">
    <h2 style="color:#0b3d2a;margin:0 0 8px">You're booked, ${b.name ?? "player"}!</h2>
    <p style="color:#14532d">Your payment was received. See you on court!</p>
    <table style="width:100%;color:#0b3d2a;font-size:15px">
      <tr><td>Court</td><td align="right"><b>${courtName(b.court)}</b></td></tr>
      <tr><td>Date</td><td align="right"><b>${b.date}</b></td></tr>
      <tr><td>Time</td><td align="right"><b>${hourLabel(b.hour)} – ${hourLabel(b.hour + 1)}</b></td></tr>
      <tr><td>Paid</td><td align="right"><b>${peso(b.amount)}</b></td></tr>
      <tr><td>Reference</td><td align="right">${b.id.slice(0, 8).toUpperCase()}</td></tr>
    </table>
    <p style="color:#166534;font-size:13px">Please arrive 10 minutes early. Good luck on court! — ${BRAND}</p></div>`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[email placeholder] would send confirmation to ${b.email}`);
    return;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? `${BRAND} <onboarding@resend.dev>`,
      to: [b.email], subject: `Booking confirmed · ${courtName(b.court)}, ${b.date} ${hourLabel(b.hour)}`, html,
    }),
  });
}
