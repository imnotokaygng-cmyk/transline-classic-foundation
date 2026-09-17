import { DoorOpen, LoaderPinwheel, UserRound } from "lucide-react";

export type SeatState = "available" | "booked" | "selected" | "blocked" | "staff";

/**
 * Builds the passenger-seat rows for a coach.
 * Passenger capacity is kept separate from the two fixed staff seats at the front.
 *
 * - 4+ passenger seats: 2 + aisle + 2 layout, matching the reference coach.
 * - 1–3 passenger seats: 1 + aisle + 2 layout so small vehicles still fit naturally.
 * - The final row is allowed to be partial when the capacity does not divide evenly.
 */
export function buildSeatLayout(capacity: number): {
  rows: string[][];
  perRow: number;
  leftCount: number;
} {
  const total = Math.max(0, Math.floor(capacity));
  const perRow = total >= 4 ? 4 : 3;
  const leftCount = total >= 4 ? 2 : 1;

  const rows: string[][] = [];
  for (let i = 0; i < total; i += perRow) {
    rows.push(
      Array.from(
        { length: Math.min(perRow, total - i) },
        (_, j) => String(i + j + 1),
      ),
    );
  }

  return { rows, perRow, leftCount };
}

const seatClass: Record<SeatState, string> = {
  available: "bg-seat-available text-seat-available-foreground hover:brightness-105",
  booked: "bg-seat-booked text-seat-booked-foreground cursor-not-allowed",
  selected: "bg-seat-selected text-seat-selected-foreground",
  blocked: "bg-seat-blocked text-seat-blocked-foreground cursor-not-allowed",
  staff: "bg-primary text-primary-foreground cursor-not-allowed",
};

/** An armchair-shaped seat: two armrests, a padded back and the seat number. */
function Seat({
  seat,
  state,
  onSelect,
}: {
  seat: string;
  state: SeatState;
  onSelect?: ((seat: string) => void) | undefined;
}) {
  const interactive = (state === "available" || state === "selected") && !!onSelect;
  return (
    <button
      type="button"
      aria-label={`Seat ${seat} — ${state}`}
      aria-pressed={state === "selected"}
      disabled={!interactive}
      onClick={interactive ? () => onSelect?.(seat) : undefined}
      className={[
        "group relative flex h-11 w-12 flex-col items-center justify-end transition-transform",
        interactive ? "cursor-pointer hover:-translate-y-0.5" : "cursor-not-allowed",
        state === "selected" ? "drop-shadow-[0_0_0.35rem_hsl(var(--seat-selected)/0.7)]" : "",
      ].join(" ")}
    >
      {/* Backrest with the seat label */}
      <span className="relative z-10 -mb-1 flex h-5 w-9 items-center justify-center rounded-t-md border border-border/60 bg-card text-[9px] font-semibold text-foreground">
        {seat}
      </span>
      {/* Armrests + cushion */}
      <span
        className={[
          "flex h-6 w-full items-end justify-between rounded-md px-0 shadow-sm",
          seatClass[state],
        ].join(" ")}
      >
        <span className="h-6 w-2 rounded-l-md bg-current opacity-100" />
        <span className="mb-0 h-3 flex-1 rounded-sm bg-card/90" />
        <span className="h-6 w-2 rounded-r-md bg-current opacity-100" />
      </span>
    </button>
  );
}

export function SeatLegend() {
  const items: { label: string; state: SeatState }[] = [
    { label: "Available", state: "available" },
    { label: "Booked", state: "booked" },
    { label: "Selected", state: "selected" },
    { label: "Crew", state: "staff" },
    { label: "Unavailable", state: "blocked" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-2">
          <span className={`inline-block size-3.5 rounded ${seatClass[i.state].split(" ")[0]}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export function SeatMap({
  capacity,
  taken,
  blocked,
  selected,
  onSelect,
  plate,
}: {
  /** Passenger-seat capacity. STF1 and STF2 are fixed crew seats and are not counted here. */
  capacity: number;
  taken: Set<string>;
  blocked?: Set<string> | undefined;
  selected?: string | undefined;
  onSelect?: ((seat: string) => void) | undefined;
  plate?: string | null | undefined;
}) {
  const { rows, leftCount } = buildSeatLayout(capacity);

  const stateOf = (seat: string): SeatState =>
    selected === seat
      ? "selected"
      : taken.has(seat)
        ? "booked"
        : blocked?.has(seat)
          ? "blocked"
          : "available";

  return (
    <div className="space-y-4">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-[2.5rem] border-2 border-border bg-secondary/40 p-3 shadow-[var(--shadow-card)] sm:p-4">
        {/* Front of bus: driver is always on the right, with two fixed staff seats on the left. */}
        <div className="mb-4 rounded-t-[2rem] border-b-2 border-dashed border-border bg-card px-3 py-3 sm:px-4">
          <div className="grid grid-cols-[1fr_2.5rem_1fr] items-end gap-2">
            <div className="flex justify-center gap-2">
              <Seat seat="STF1" state="staff" />
              <Seat seat="STF2" state="staff" />
            </div>
            <div aria-hidden="true" />
            <div className="flex flex-col items-center justify-end gap-1 rounded-xl border border-border/70 bg-secondary/60 px-2 py-2 text-xs font-medium text-muted-foreground">
              <LoaderPinwheel className="size-7 text-primary" />
              <span>Driver</span>
              <span className="font-mono text-[9px] uppercase">{plate ?? "Coach"}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Staff</span>
            <span className="flex items-center gap-1">
              <DoorOpen className="size-4" /> Front door
            </span>
          </div>
        </div>

        {/* Passenger seating: 2 + aisle + 2, dynamically filled from the configured capacity. */}
        <div className="space-y-2">
          {rows.map((row, idx) => {
            const leftSeats = row.slice(0, leftCount);
            const rightSeats = row.slice(leftCount);

            return (
              <div key={idx} className="flex items-center justify-center gap-2">
                <div className="flex min-w-0 gap-2">
                  {leftSeats.map((seat) => (
                    <Seat key={seat} seat={seat} state={stateOf(seat)} onSelect={onSelect} />
                  ))}
                </div>

                <span className="flex min-h-11 w-8 shrink-0 items-center justify-center border-x border-dashed border-border/70 text-[9px] text-muted-foreground/70">
                  {String(idx + 1).padStart(2, "0")}
                </span>

                <div className="flex min-w-0 gap-2">
                  {rightSeats.map((seat) => (
                    <Seat key={seat} seat={seat} state={stateOf(seat)} onSelect={onSelect} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 rounded-b-[2rem] border-t-2 border-dashed border-border pt-3 text-[11px] text-muted-foreground">
          <UserRound className="size-4" /> Rear of bus
        </div>
      </div>

      <SeatLegend />
    </div>
  );
}
