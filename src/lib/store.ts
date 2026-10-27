import { COURTS, HOLD_MINUTES, OPEN_HOUR, CLOSE_HOUR } from "./config";
import { redis } from "./redis";

export type Block = { id: string; date: string; court: number; hour: number; duration: number; reason?: string; createdAt: number };
export type Inventory = { paddles: number; balls: number };

export type Status = "held" | "pending" | "paid";
export type RateTier = { maxHours: number; price: number };
export type TimeRate = { start: number; end: number; price: number };

export const DEFAULT_TIME_RATES: TimeRate[] = [
  { start: 8, end: 17, price: 500 }, // 8:00 AM - 5:00 PM
  { start: 17, end: 25, price: 600 }, // 5:00 PM - 1:00 AM
];

export const DEFAULT_RATES: RateTier[] = [
  { maxHours: 24, price: 500 },
];

// Keep exports for backward compatibility
export let TIME_RATES: TimeRate[] = [...DEFAULT_TIME_RATES];
export let RATES: RateTier[] = [...DEFAULT_RATES];

let timeRatesCache: TimeRate[] | null = null;
let ratesCache: RateTier[] | null = null;

export async function getTimeRates(): Promise<TimeRate[]> {
  if (timeRatesCache) {
    TIME_RATES = timeRatesCache;
    return timeRatesCache;
  }
  try {
    if (redis && typeof (redis as any).get === "function") {
      const saved = await redis.get<TimeRate[]>("lp:timeRates");
      if (saved && Array.isArray(saved) && saved.length > 0) {
        timeRatesCache = [...saved].sort((a, b) => a.start - b.start);
      } else {
        timeRatesCache = [...DEFAULT_TIME_RATES];
      }
    } else {
      timeRatesCache = [...DEFAULT_TIME_RATES];
    }
  } catch {
    timeRatesCache = [...DEFAULT_TIME_RATES];
  }
  TIME_RATES = timeRatesCache;
  return timeRatesCache;
}

export async function setTimeRates(rates: TimeRate[]): Promise<TimeRate[]> {
  const sorted = [...rates].sort((a, b) => a.start - b.start);
  timeRatesCache = sorted;
  TIME_RATES = sorted;
  try {
    if (redis && typeof (redis as any).set === "function") {
      await redis.set("lp:timeRates", sorted);
    }
  } catch {}
  return sorted;
}

export async function getRates(): Promise<RateTier[]> {
  if (ratesCache) {
    RATES = ratesCache;
    return ratesCache;
  }
  try {
    if (redis && typeof (redis as any).get === "function") {
      const saved = await redis.get<RateTier[]>("lp:rates");
      if (saved && Array.isArray(saved) && saved.length > 0) {
        ratesCache = [...saved].sort((a, b) => a.maxHours - b.maxHours);
      } else {
        ratesCache = [...DEFAULT_RATES];
      }
    } else {
      ratesCache = [...DEFAULT_RATES];
    }
  } catch {
    ratesCache = [...DEFAULT_RATES];
  }
  RATES = ratesCache;
  return ratesCache;
}

export async function setRates(rates: RateTier[]): Promise<RateTier[]> {
  const sorted = [...rates].sort((a, b) => a.maxHours - b.maxHours);
  ratesCache = sorted;
  RATES = sorted;
  try {
    if (redis && typeof (redis as any).set === "function") {
      await redis.set("lp:rates", sorted);
    }
  } catch {}
  return sorted;
}

function getRateForHour(h: number): number {
  const rates = timeRatesCache ?? TIME_RATES ?? DEFAULT_TIME_RATES;
  for (const w of rates) {
    if (h >= w.start && h < w.end) return w.price;
  }
  return 600;
}

export function getPriceForRange(fromHour: number, toHour: number): number {
  let total = 0;
  for (let h = fromHour; h < toHour; h++) {
    if (h < 0) continue;
    total += getRateForHour(h);
  }
  return total;
}

export function getPrice(duration: number): number {
  return getPriceForRange(0, duration);
}

export interface Booking {
  id: string; date: string; court: number; hour: number; amount: number;
  status: Status; expiresAt: number; createdAt: number; duration?: number;
  name?: string; email?: string; phone?: string;
  paddles?: number;
  balls?: number;
}

/**
 * IN-MEMORY STORE (placeholder). Works for `npm run dev`, but Vercel serverless
 * functions do not share memory. Before going live, replace these functions with
 * a database (Upstash Redis, Vercel KV, Supabase, Neon...). Keep the same signatures.
 */
const g = globalThis as unknown as { __bookings?: Map<string, Booking>; __blocks?: Block[]; __inventory?: Inventory };
const db = (g.__bookings ??= new Map<string, Booking>());
const blocks = (g.__blocks ??= []);
if (!g.__inventory) g.__inventory = { paddles: 4, balls: 10 };
const inventory = g.__inventory;

const alive = (b: Booking) => b.status === "paid" || b.expiresAt > Date.now();
const sweep = () => { for (const [id, b] of db) if (!alive(b)) db.delete(id); };

export function slotTaken(date: string, court: number, hour: number, duration: number = 1) {
  sweep();
  if (isBlocked(date, court, hour, duration)) return true;
  return [...db.values()].some((b) => b.date === date && b.court === court && b.hour < hour + duration && b.hour + (b.duration ?? 1) > hour);
}

export function dayStatus(date: string) {
  sweep();
  const out: Record<number, Record<number, "held" | "booked">> = {};
  for (const b of db.values()) {
    if (b.date !== date) continue;
    const cell = b.status === "paid" ? "booked" : "held";
    const span = b.duration ?? 1;
    for (let i = 0; i < span; i++) {
      const h = b.hour + i;
      if (h >= CLOSE_HOUR) break;
      const court = (out[b.court] ??= {});
      if (court[h] !== "booked") court[h] = cell;
    }
  }
  return out;
}

export function createHold(date: string, court: number, hour: number, duration: number = 1): Booking | null {
  if (slotTaken(date, court, hour, duration)) return null;
  const amount = getPriceForRange(hour, hour + duration);
  const b: Booking = {
    id: crypto.randomUUID(), date, court, hour, amount,
    status: "held", createdAt: Date.now(), expiresAt: Date.now() + HOLD_MINUTES * 60_000,
    duration,
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

export function isBlocked(date: string, court: number, hour: number, duration: number = 1) {
  return blocks.some((blk) => blk.date === date && blk.court === court && hour < blk.hour + blk.duration && hour + duration > blk.hour);
}

export function listBlocks() {
  return [...blocks].sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour);
}

export function addBlock(date: string, court: number, hour: number, duration: number = 1, reason?: string) {
  const id = crypto.randomUUID();
  blocks.push({ id, date, court, hour, duration, reason, createdAt: Date.now() });
  return blocks[blocks.length - 1];
}

export function removeBlock(id: string) {
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx >= 0) blocks.splice(idx, 1);
  return idx >= 0;
}

export function getInventory() {
  return { paddles: inventory.paddles, balls: inventory.balls };
}

export function setInventory(next: Partial<Inventory>) {
  if (typeof next.paddles === "number" && next.paddles >= 0) inventory.paddles = Math.floor(next.paddles);
  if (typeof next.balls === "number" && next.balls >= 0) inventory.balls = Math.floor(next.balls);
  return getInventory();
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
