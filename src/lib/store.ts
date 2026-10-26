import { COURTS, HOLD_MINUTES, OPEN_HOUR, CLOSE_HOUR, PRICE_PER_HOUR } from "./config";

export type Status = "held" | "pending" | "paid";
export interface Booking {
  id: string; date: string; court: number; hour: number; amount: number;
  status: Status; expiresAt: number; createdAt: number; name?: string; email?: string; phone?: string;
}

/**
 * IN-MEMORY STORE (placeholder). Works for `npm run dev`, but Vercel serverless
 * functions do not share memory. Before going live, replace these functions with
 * a database (Upstash Redis, Vercel KV, Supabase, Neon...). Keep the same signatures.
 */
const g = globalThis as unknown as { __bookings?: Map<string, Booking> };
const db = (g.__bookings ??= new Map<string, Booking>());

const alive = (b: Booking) => b.status === "paid" || b.expiresAt > Date.now();
const sweep = () => { for (const [id, b] of db) if (!alive(b)) db.delete(id); };

export function slotTaken(date: string, court: number, hour: number) {
  sweep();
  return [...db.values()].some((b) => b.date === date && b.court === court && b.hour === hour);
}

export function dayStatus(date: string) {
  sweep();
  const out: Record<number, Record<number, "held" | "booked">> = {};
  for (const b of db.values()) {
    if (b.date !== date) continue;
    (out[b.court] ??= {})[b.hour] = b.status === "paid" ? "booked" : "held";
  }
  return out;
}

export function createHold(date: string, court: number, hour: number): Booking | null {
  if (slotTaken(date, court, hour)) return null;
  const b: Booking = {
    id: crypto.randomUUID(), date, court, hour, amount: PRICE_PER_HOUR,
    status: "held", createdAt: Date.now(), expiresAt: Date.now() + HOLD_MINUTES * 60_000,
  };
  db.set(b.id, b);
  return b;
}

export const getBooking = (id: string) => { sweep(); return db.get(id); };

/** All live bookings, newest first. Used by the admin dashboard. */
export function listBookings() {
  sweep();
  return [...db.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || b.hour - a.hour || b.createdAt - a.createdAt,
  );
}

export function releaseHold(id: string) { const b = db.get(id); if (b?.status === "held") db.delete(id); }

/** Move a hold into the payment step and give the customer extra time to pay. */
export function startPayment(id: string, info: { name: string; email: string; phone: string }) {
  const b = getBooking(id);
  if (!b || b.status !== "held") return null;
  Object.assign(b, info, { status: "pending" as Status, expiresAt: Date.now() + 30 * 60_000 });
  return b;
}

export function markPaid(id: string) {
  const b = db.get(id);
  if (!b) return { booking: null, firstTime: false };
  const firstTime = b.status !== "paid";
  b.status = "paid";
  return { booking: b, firstTime };
}

export const isValidSlot = (date: string, court: number, hour: number) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) && COURTS.some((c) => c.id === court) && hour >= OPEN_HOUR && hour < CLOSE_HOUR;
