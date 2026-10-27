"use client";
import { useCallback, useEffect, useState } from "react";
import Clover from "@/components/Clover";
import { CLOSE_HOUR, COURTS, HOLD_MINUTES, OPEN_HOUR, PRICE_PER_HOUR, courtName, hourLabel, peso } from "@/lib/config";

type Cell = "held" | "booked";
type Status = Record<number, Record<number, Cell>>;
interface Hold { id: string; expiresAt: number; date: string; court: number; hour: number; duration?: number; amount?: number }

const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const END_HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + 1 + i);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DAYS = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });

export default function Booking() {
  const [date, setDate] = useState(iso(DAYS[0]));
  const [court, setCourt] = useState(1);
  const [status, setStatus] = useState<Status>({});
  const [now, setNow] = useState({ date: "", hour: 0 });
  const [hold, setHold] = useState<Hold | null>(null);
  const [left, setLeft] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fromHour, setFromHour] = useState(OPEN_HOUR);
  const [toHour, setToHour] = useState(OPEN_HOUR + 1);
  const [addPaddles, setAddPaddles] = useState(0);
  const [addBalls, setAddBalls] = useState(0);

  const load = useCallback(async () => {
    const r = await fetch(`/api/availability?date=${date}`, { cache: "no-store" });
    const j = await r.json();
    setStatus(j.status); setNow(j.now);
  }, [date]);

  useEffect(() => { load(); const t = setInterval(load, 10_000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    if (!hold) return;
    const tick = () => {
      const s = Math.max(0, Math.round((hold.expiresAt - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { setHold(null); setError("Your 10-minute hold ended. Pick a time again."); load(); }
    };
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [hold, load]);

  useEffect(() => {
    const free = () => hold && navigator.sendBeacon(`/api/hold?id=${hold.id}&_method=DELETE`);
    window.addEventListener("pagehide", free); return () => window.removeEventListener("pagehide", free);
  }, [hold]);

  const past = (h: number) => date < now.date || (date === now.date && h <= now.hour);

  function changeFrom(h: number) {
    setFromHour(h);
    if (toHour <= h) setToHour(Math.min(h + 1, CLOSE_HOUR));
  }
  function changeTo(h: number) {
    setToHour(h);
    if (fromHour >= h) setFromHour(Math.max(OPEN_HOUR, h - 1));
  }

  async function bookRange() {
    setError("");
    if (toHour <= fromHour) { setError("End time must be after the start time."); return; }
    if (past(fromHour)) { setError("That start time has already passed. Pick a later time."); return; }
    const r = await fetch("/api/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, court, hour: fromHour, holdId: hold?.id, duration: toHour - fromHour }),
    });
    const j = await r.json();
    if (!r.ok) { setHold(null); setError(j.error ?? "Could not book."); load(); return; }
    setHold({ id: j.id, expiresAt: j.expiresAt, date, court, hour: fromHour, duration: toHour - fromHour, amount: j.amount });
    load();
  }

  async function release() {
    if (hold) await fetch(`/api/hold?id=${hold.id}`, { method: "DELETE" });
    setHold(null); load();
  }

  async function pay() {
    if (!hold) return;
    setBusy(true); setError("");
    const r = await fetch("/api/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdId: hold.id, ...form, paddles: addPaddles, balls: addBalls }),
    });
    const j = await r.json();
    if (!r.ok) { setBusy(false); setError(j.error); if (r.status === 410) setHold(null); return; }
    window.location.href = j.url;
  }

  const PADDLE_RENT = 100;
  const BALLS_PRICE = 100;
  const inHold = (h: number) => !!hold && hold.date === date && hold.court === court && h >= hold.hour && h < hold.hour + (hold.duration ?? 1);
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  const duration = toHour - fromHour;
  const extras = (addPaddles * PADDLE_RENT) + (addBalls * BALLS_PRICE);
  const total = (hold?.amount ?? 0) + extras;
  const getHighlight = (h: number) => {
    if (h >= 8 && h < 12) return "bg-blue-50/80";
    if (h >= 12 && h < 15) return "bg-yellow-50/80";
    if (h >= 15 && h < 25) return "bg-red-50/80";
    return "";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <input type="date" value={date} min={iso(DAYS[0])} max={iso(DAYS[DAYS.length - 1])} onChange={(e) => setDate(e.target.value)}
            className="rounded-2xl border border-white/80 bg-white/70 px-4 py-2 text-sm font-medium text-pine shadow-sm" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {COURTS.length > 1 ? (
            COURTS.map((c) => (
              <button key={c.id} onClick={() => setCourt(c.id)} aria-pressed={court === c.id}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${court === c.id ? "bg-court text-white" : "bg-white/60 hover:bg-white"}`}>
                {c.name}
              </button>
            ))
          ) : (
            <>
              <span className="flex items-center gap-2 rounded-full bg-court px-4 py-2 text-sm font-medium text-white shadow-[0_0_0_4px_rgba(59,130,246,0.15)]">
                <Clover className="h-4 w-4" />
                {COURTS[0].name}
              </span>
              <span className="text-sm text-pine/60">Available 8:00 AM – 1:00 AM</span>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/70 bg-gradient-to-r from-blue-50/80 via-white/70 to-red-50/80 p-3 shadow-[0_10px_60px_-30px_rgba(37,99,235,0.9)]">
          <label className="flex flex-col gap-1 text-xs font-medium text-pine/70">
            From
            <select value={fromHour} onChange={(e) => changeFrom(Number(e.target.value))}
              className="rounded-xl border border-white bg-white px-3 py-2 text-base font-semibold text-pine outline-none focus:ring-2 focus:ring-court">
              {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-pine/70">
            To
            <select value={toHour} onChange={(e) => changeTo(Number(e.target.value))}
              className="rounded-xl border border-white bg-white px-3 py-2 text-base font-semibold text-pine outline-none focus:ring-2 focus:ring-court">
              {END_HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
          </label>
          <button onClick={bookRange}
            className="rounded-xl bg-court px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-pine">
            Hold {hourLabel(fromHour)} – {hourLabel(toHour)}
          </button>
          <span className="pb-1 text-xs text-pine/60">{duration} hour{duration > 1 ? "s" : ""}</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {HOURS.map((h) => {
            const s = status[court]?.[h];
            const disabled = past(h) || (!!s && !inHold(h));
            const sel = inHold(h);
            const hl = getHighlight(h);
            return (
              <button key={h} disabled={disabled} onClick={() => changeFrom(h)}
                className={`rounded-2xl border px-3 py-3 text-left transition
                  ${sel ? "border-ball bg-ball text-pine shadow-lg ring-2 ring-pine"
                    : disabled ? "cursor-not-allowed border-transparent bg-white/25 text-pine/40"
                    : `border-white/70 ${hl || "bg-white/70"} hover:-translate-y-0.5 hover:bg-white`}`}>
                <div className="font-display font-semibold">{hourLabel(h)}</div>
                <div className="text-xs">
                  {sel ? "Selected" : past(h) ? "Passed" : s === "booked" ? "Booked" : s === "held" ? "On hold" : peso(h < 17 ? 500 : 600)}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-pine/70">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-400"></span> 8AM–5PM ₱500</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400"></span> 5PM–1AM ₱600</span>
        </div>
      </div>

      <aside className="glass-dark h-fit rounded-3xl p-6 text-white lg:sticky lg:top-24">
        <h3 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Clover className="h-6 w-6 text-ball" />
          Your lucky booking
        </h3>
        {!hold ? (
          <p className="mt-3 text-white/75">Available 8:00 AM – 1:00 AM. Choose a start and end time, then hold it for {HOLD_MINUTES} minutes while you check out.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-sm text-white/70">{courtName(hold.court)} · {hold.date}</div>
              <div className="font-display text-xl">{hourLabel(hold.hour)} – {hourLabel(hold.hour + (hold.duration ?? 1))}</div>
              <div className="text-xs text-white/60">{(hold.duration ?? 1)} hour{(hold.duration ?? 1) > 1 ? "s" : ""} · {peso(hold.amount ?? PRICE_PER_HOUR)}</div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Held for you</span>
                <span className="rounded-full bg-ball px-3 py-1 font-semibold tabular-nums text-pine" role="timer">{mm}:{ss}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Add-ons</span>
                <span className="text-xs text-white/60">Optional</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-sm">Rent a paddle</div>
                  <div className="text-xs text-white/60">{peso(PADDLE_RENT)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAddPaddles(Math.max(0, addPaddles - 1))} className="rounded-full bg-white/10 px-2 py-1 text-xs">-</button>
                  <span className="w-6 text-center text-sm">{addPaddles}</span>
                  <button onClick={() => setAddPaddles(Math.min(4, addPaddles + 1))} className="rounded-full bg-white/10 px-2 py-1 text-xs">+</button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <div className="text-sm">Buy balls</div>
                  <div className="text-xs text-white/60">{peso(BALLS_PRICE)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAddBalls(Math.max(0, addBalls - 1))} className="rounded-full bg-white/10 px-2 py-1 text-xs">-</button>
                  <span className="w-6 text-center text-sm">{addBalls}</span>
                  <button onClick={() => setAddBalls(Math.min(10, addBalls + 1))} className="rounded-full bg-white/10 px-2 py-1 text-xs">+</button>
                </div>
              </div>
              {(extras > 0) && <div className="mt-3 text-xs text-white/70">Extras: {peso(extras)}</div>}
            </div>
            {(["name", "email", "phone"] as const).map((k) => (
              <input key={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                type={k === "email" ? "email" : k === "phone" ? "tel" : "text"}
                placeholder={k === "name" ? "Full name" : k === "email" ? "Email for your confirmation" : "Mobile number"}
                aria-label={k}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder:text-white/50" />
            ))}
            <button onClick={pay} disabled={busy}
              className="w-full rounded-xl bg-ball py-3.5 font-display text-lg font-semibold text-pine transition hover:brightness-105 disabled:opacity-60">
              {busy ? "Opening PayMongo…" : `Pay ${peso(total)} with PayMongo`}
            </button>
            <p className="text-xs text-white/60">GCash, Maya, GrabPay and cards. No cash payments.</p>
            <button onClick={release} className="w-full text-sm text-white/70 underline">Release this slot</button>
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-500/20 p-3 text-sm text-red-100">{error}</p>}
      </aside>
    </div>
  );
}
