"use client";
import { useCallback, useEffect, useState } from "react";
import Clover from "./Clover";
import { hourLabel, peso } from "@/lib/config";
import type { Booking, Status } from "@/lib/store";

interface ScheduleCell {
  hour: number;
  booking: Booking | null;
  past: boolean;
}

interface DashboardData {
  date: string;
  today: string;
  court: string;
  stats: {
    revenue: number;
    paidCount: number;
    upcomingCount: number;
    todayBookings: number;
    occupancy: number;
    activeHolds: number;
  };
  schedule: ScheduleCell[];
  bookings: Booking[];
}

const STATUS_STYLES: Record<Status, string> = {
  paid: "bg-leaf/15 text-court",
  pending: "bg-amber-400/20 text-amber-800",
  held: "bg-sky-400/20 text-sky-800",
};

const STATUS_LABELS: Record<Status, string> = {
  paid: "Paid",
  pending: "Paying",
  held: "On hold",
};

const prettyDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function AdminDashboard() {
  const [date, setDate] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (selected: string) => {
    try {
      const res = await fetch(`/api/admin/dashboard${selected ? `?date=${encodeURIComponent(selected)}` : ""}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load the dashboard.");
      setData(json);
      setDate((current) => current || json.date);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the dashboard.");
    }
  }, []);

  useEffect(() => { void load(date); }, [date, load]);
  useEffect(() => {
    const timer = setInterval(() => { void load(date); }, 15_000);
    return () => clearInterval(timer);
  }, [date, load]);

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const cards = data
    ? [
        { label: "Revenue", value: peso(data.stats.revenue), hint: "Paid bookings only" },
        { label: "Paid bookings", value: String(data.stats.paidCount), hint: `${data.stats.upcomingCount} upcoming` },
        { label: "Today", value: String(data.stats.todayBookings), hint: `${data.stats.activeHolds} active holds` },
        { label: "Occupancy today", value: `${data.stats.occupancy}%`, hint: `${data.stats.todayBookings} of 16 hours` },
      ]
    : [];

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16">
      <header className="sticky top-3 z-20 mt-3 flex items-center justify-between rounded-full px-5 py-3 glass">
        <div className="flex items-center gap-2">
          <Clover className="h-6 w-6 text-court" />
          <div>
            <div className="font-display text-lg font-bold leading-tight">Lucky Paddle</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pine/45">Admin</div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <a href="/" className="rounded-full px-3 py-2 text-sm text-pine/70 transition hover:bg-white/60 hover:text-pine">View site</a>
          <button onClick={signOut} className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white transition hover:bg-court">
            Sign out
          </button>
        </div>
      </header>

      <section className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold">Dashboard</h1>
          <p className="mt-1 text-pine/65">Bookings and court data for your private court.</p>
        </div>
        <div className="text-left sm:text-right">
          <label htmlFor="dashboard-date" className="text-xs font-semibold uppercase tracking-wider text-pine/45">Schedule date</label>
          <input
            id="dashboard-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-sm text-pine"
          />
        </div>
      </section>

      {error && <p role="alert" className="mt-5 rounded-2xl bg-red-500/10 p-4 text-sm text-red-700">{error}</p>}

      {!data ? (
        <div className="glass mt-6 rounded-3xl p-10 text-center text-pine/60">
          {error ? "Dashboard could not be loaded." : "Loading dashboard..."}
        </div>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="glass rounded-2xl p-4 sm:p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-pine/45">{card.label}</div>
                <div className="mt-2 font-display text-2xl font-bold sm:text-3xl">{card.value}</div>
                <div className="mt-1 text-xs text-pine/55">{card.hint}</div>
              </div>
            ))}
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_1.35fr]">
            <div className="glass rounded-3xl p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold">Court schedule</h2>
                  <p className="text-sm text-pine/55">{data.court} · {prettyDate(data.date)}</p>
                </div>
                <button
                  onClick={() => load(date)}
                  className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-pine/70 transition hover:bg-white"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-4 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
                {data.schedule.map((cell) => {
                  const booking = cell.booking;
                  return (
                    <div
                      key={cell.hour}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                        booking ? "border-white/80 bg-white/75" : "border-transparent bg-white/30"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`w-[4.5rem] shrink-0 font-display text-sm font-semibold ${cell.past && !booking ? "text-pine/30" : "text-pine/80"}`}>
                          {hourLabel(cell.hour)}
                        </span>
                        {booking ? (
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-medium">{booking.name ?? "Unnamed player"}</span>
                              <StatusBadge status={booking.status} />
                            </div>
                            <div className="truncate text-xs text-pine/55">
                              {booking.phone ?? "No phone"} · {booking.email ?? "No email"}
                            </div>
                          </div>
                        ) : (
                          <span className={`text-sm ${cell.past ? "text-pine/30" : "text-pine/55"}`}>
                            {cell.past ? "Passed" : "Open"}
                          </span>
                        )}
                      </div>
                      {booking && (
                        <div className="shrink-0 text-right">
                          <div className="font-display text-sm font-semibold">{peso(booking.amount)}</div>
                          <div className="text-[10px] uppercase tracking-wider text-pine/40">#{booking.id.slice(0, 6).toUpperCase()}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass rounded-3xl p-5 sm:p-6">
              <div>
                <h2 className="font-display text-xl font-semibold">All bookings</h2>
                <p className="text-sm text-pine/55">{data.bookings.length} live {data.bookings.length === 1 ? "record" : "records"} · newest first</p>
              </div>

              {data.bookings.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-white/40 p-8 text-center">
                  <Clover className="mx-auto h-8 w-8 text-leaf/60" />
                  <p className="mt-3 font-display font-semibold">No bookings yet</p>
                  <p className="mt-1 text-sm text-pine/55">New paid bookings and active holds will show up here.</p>
                </div>
              ) : (
                <div className="mt-4 max-h-[30rem] overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-[#f3fbf5]/95 text-[10px] uppercase tracking-wider text-pine/45 backdrop-blur">
                      <tr>
                        <th className="py-2 pr-3 font-semibold">Date</th>
                        <th className="py-2 pr-3 font-semibold">Time</th>
                        <th className="py-2 pr-3 font-semibold">Player</th>
                        <th className="hidden py-2 pr-3 font-semibold sm:table-cell">Contact</th>
                        <th className="py-2 pr-3 font-semibold">Status</th>
                        <th className="py-2 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.bookings.map((booking) => (
                        <tr key={booking.id} className="border-t border-pine/10 align-top">
                          <td className="whitespace-nowrap py-3 pr-3 text-pine/70">{prettyDate(booking.date)}</td>
                          <td className="whitespace-nowrap py-3 pr-3">{hourLabel(booking.hour)}</td>
                          <td className="py-3 pr-3">
                            <div className="font-medium">{booking.name ?? "Unnamed"}</div>
                            <div className="text-[10px] uppercase tracking-wider text-pine/40">#{booking.id.slice(0, 6).toUpperCase()}</div>
                          </td>
                          <td className="hidden py-3 pr-3 text-pine/65 sm:table-cell">
                            <div className="truncate">{booking.email ?? "—"}</div>
                            <div className="text-xs text-pine/45">{booking.phone ?? "—"}</div>
                          </td>
                          <td className="py-3 pr-3"><StatusBadge status={booking.status} /></td>
                          <td className="whitespace-nowrap py-3 text-right font-display font-semibold">{peso(booking.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <p className="mt-6 text-center text-xs text-pine/45">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", second: "2-digit" })} · Refreshes every 15 seconds` : "Loading..."}
          </p>
        </>
      )}
    </main>
  );
}
