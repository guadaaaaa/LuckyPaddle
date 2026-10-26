"use client";
import { useCallback, useEffect, useState } from "react";
import Clover from "@/components/Clover";
import { CLOSE_HOUR, COURTS, HOLD_MINUTES, OPEN_HOUR, PRICE_PER_HOUR, courtName, hourLabel, peso } from "@/lib/config";

type Cell = "held" | "booked";
type Status = Record<number, Record<number, Cell>>;
interface Hold { id: string; expiresAt: number; date: string; court: number; hour: number }

const HOURS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DAYS = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });

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

  const load = useCallback(async () => {
    const r = await fetch(`/api/availability?date=${date}`, { cache: "no-store" });
    const j = await r.json();
    setStatus(j.status); setNow(j.now);
  }, [date]);

  useEffect(() => { load(); const t = setInterval(load, 10_000); return () => clearInterval(t); }, [load]);

  // Countdown for the 10-minute hold
  useEffect(() => {
    if (!hold) return;
    const tick = () => {
      const s = Math.max(0, Math.round((hold.expiresAt - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { setHold(null); setError("Your 10-minute hold ended. Pick a time again."); load(); }
    };
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t);
  }, [hold, load]);

  // Free the slot if the tab is closed
  useEffect(() => {
    const free = () => hold && navigator.sendBeacon(`/api/hold?id=${hold.id}&_method=DELETE`);
    window.addEventListener("pagehide", free); return () => window.removeEventListener("pagehide", free);
  }, [hold]);

  const past = (h: number) => date < now.date || (date === now.date && h <= now.hour);

  async function pick(hour: number) {
    setError("");
    const r = await fetch("/api/hold", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, court, hour, holdId: hold?.id }),
    });
    const j = await r.json();
    if (!r.ok) { setHold(null); setError(j.error); load(); return; }
    setHold({ id: j.id, expiresAt: j.expiresAt, date, court, hour });
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
      body: JSON.stringify({ holdId: hold.id, ...form }),
    });
    const j = await r.json();
    if (!r.ok) { setBusy(false); setError(j.error); if (r.status === 410) setHold(null); return; }
    window.location.href = j.url;
  }

  const mine = (h: number) => hold?.date === date && hold.court === court && hold.hour === h;
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Date">
          {DAYS.map((d) => {
            const v = iso(d), on = v === date;
            return (
              <button key={v} onClick={() => setDate(v)} aria-pressed={on}
                className={`min-w-[64px] rounded-2xl px-3 py-2 text-center transition ${on ? "bg-pine text-white shadow-lg" : "bg-white/60 hover:bg-white"}`}>
                <div className="text-xs opacity-70">{d.toLocaleDateString("en-PH", { weekday: "short" })}</div>
                <div className="font-display text-xl font-semibold">{d.getDate()}</div>
              </button>
            );
          })}
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
              <span className="flex items-center gap-2 rounded-full bg-court px-4 py-2 text-sm font-medium text-white">
                <Clover className="h-4 w-4" />
                {COURTS[0].name}
              </span>
              <span className="text-sm text-pine/60">Booked by the hour</span>
            </>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {HOURS.map((h) => {
            const s = status[court]?.[h];
            const disabled = past(h) || (!!s && !mine(h));
            const sel = mine(h);
            return (
              <button key={h} disabled={disabled} onClick={() => pick(h)}
                className={`rounded-2xl border px-3 py-3 text-left transition
                  ${sel ? "border-ball bg-ball text-pine shadow-lg ring-2 ring-pine"
                    : disabled ? "cursor-not-allowed border-transparent bg-white/25 text-pine/40"
                    : "border-white/70 bg-white/70 hover:-translate-y-0.5 hover:bg-white"}`}>
                <div className="font-display font-semibold">{hourLabel(h)}</div>
                <div className="text-xs">
                  {sel ? "Held for you" : past(h) ? "Passed" : s === "booked" ? "Booked" : s === "held" ? "On hold" : peso(PRICE_PER_HOUR)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="glass-dark h-fit rounded-3xl p-6 text-white lg:sticky lg:top-24">
        <h3 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Clover className="h-6 w-6 text-ball" />
          Your lucky booking
        </h3>
        {!hold ? (
          <p className="mt-3 text-white/75">Choose a court and time. We hold it for you for {HOLD_MINUTES} minutes while you check out.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-sm text-white/70">{courtName(hold.court)} · {hold.date}</div>
              <div className="font-display text-xl">{hourLabel(hold.hour)} – {hourLabel(hold.hour + 1)}</div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Held for you</span>
                <span className="rounded-full bg-ball px-3 py-1 font-semibold tabular-nums text-pine" role="timer">{mm}:{ss}</span>
              </div>
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
              {busy ? "Opening PayMongo…" : `Pay ${peso(PRICE_PER_HOUR)} with PayMongo`}
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
