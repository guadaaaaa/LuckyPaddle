import Link from "next/link";
import Clover from "@/components/Clover";
import { getBooking } from "@/lib/store";
import { courtName, hourLabel, peso } from "@/lib/config";

export const dynamic = "force-dynamic";

export default function Success({ searchParams }: { searchParams: { id?: string; mock?: string } }) {
  const b = searchParams.id ? getBooking(searchParams.id) : undefined;
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-5">
      <div className="glass w-full rounded-3xl p-8 text-center">
        <Clover className="mx-auto h-10 w-10 text-leaf" />
        <h1 className="mt-3 font-display text-4xl font-bold">You&apos;re booked — lucky you!</h1>
        <p className="mt-3 text-pine/75">We&apos;ve emailed your confirmation. Payment confirmations can take a few seconds to arrive.</p>
        {b && (
          <div className="mt-6 rounded-2xl bg-white/70 p-5 text-left">
            <div>{courtName(b.court)} · {b.date}</div>
            <div className="font-display text-xl">{hourLabel(b.hour)} – {hourLabel(b.hour + 1)}</div>
            <div className="mt-1 text-sm text-pine/70">{peso(b.amount)} · Ref {b.id.slice(0, 8).toUpperCase()}</div>
          </div>
        )}
        {searchParams.mock && <p className="mt-4 text-xs text-pine/60">Test mode: no real payment was made (PayMongo key not set).</p>}
        <Link href="/" className="mt-6 inline-block rounded-full bg-pine px-6 py-3 font-medium text-white">Back to Lucky Paddle</Link>
      </div>
    </main>
  );
}
