import { CircleUserRound, DoorOpen } from "lucide-react";
import { buildBusLayout } from "@/lib/seat-layout";
import { cn } from "@/lib/utils";

interface SeatMapProps {
  capacity: number;
  taken: string[];
  reserved?: string[];
  selected: string | null;
  onSelect: (seat: string) => void;
}

function LegendDot({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={cn("h-4 w-4 rounded-md border-2", className)} />
      {label}
    </span>
  );
}

function BusSeat({
  number,
  disabled,
  reserved,
  selected,
}: {
  number: string;
  disabled: boolean;
  reserved: boolean;
  selected: boolean;
}) {
  const fill = selected
    ? "fill-primary"
    : reserved
      ? "fill-accent"
      : disabled
        ? "fill-muted-foreground/55"
        : "fill-card";

  const arm = selected
    ? "fill-primary-foreground/80"
    : reserved
      ? "fill-accent-foreground/80"
      : disabled
        ? "fill-muted-foreground/70"
        : "fill-primary";

  const stroke = selected
    ? "stroke-primary"
    : reserved
      ? "stroke-accent"
      : disabled
        ? "stroke-muted-foreground/40"
        : "stroke-primary";

  const detail = selected
    ? "fill-primary-foreground/20"
    : reserved
      ? "fill-accent-foreground/20"
      : disabled
        ? "fill-background/15"
        : "fill-primary/10";

  return (
    <span className="relative flex h-[62px] w-[62px] items-center justify-center sm:h-[68px] sm:w-[68px]">
      <svg
        viewBox="0 0 72 72"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        {/* Backrest */}
        <path
          d="M19 7h34a6 6 0 0 1 6 6v23H13V13a6 6 0 0 1 6-6Z"
          className={cn(fill, stroke)}
          strokeWidth="2"
        />

        {/* Backrest inner padding */}
        <path
          d="M21 12h30a3 3 0 0 1 3 3v15H18V15a3 3 0 0 1 3-3Z"
          className={detail}
        />

        {/* Seat cushion */}
        <path
          d="M16 34h40a7 7 0 0 1 7 7v8H9v-8a7 7 0 0 1 7-7Z"
          className={cn(fill, stroke)}
          strokeWidth="2"
        />

        {/* Cushion detail */}
        <path
          d="M17 39h38a3 3 0 0 1 3 3v3H14v-3a3 3 0 0 1 3-3Z"
          className={detail}
        />

        {/* Left armrest */}
        <path
          d="M8 28h8v25H9a4 4 0 0 1-4-4V32a4 4 0 0 1 3-4Z"
          className={arm}
        />

        {/* Right armrest */}
        <path
          d="M56 28h8a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4h-7V28Z"
          className={arm}
        />

        {/* Armrest highlights */}
        <path
          d="M9 32h3v16H9Zm51 0h3v16h-3Z"
          className="fill-background/60"
        />

        {/* Cushion seam */}
        <path
          d="M18 47h36"
          className="stroke-background/30"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      <span
        className={cn(
          "relative z-10 mt-1 text-[10px] font-bold leading-none",
          selected || reserved
            ? "text-primary-foreground"
            : "text-foreground",
          disabled &&
            !selected &&
            !reserved &&
            "text-background",
        )}
      >
        {number}
      </span>
    </span>
  );
}

export function SeatMap({
  capacity,
  taken,
  reserved = [],
  selected,
  onSelect,
}: SeatMapProps) {
  const layout = buildBusLayout(capacity);

  const takenSet = new Set(taken);
  const reservedSet = new Set(reserved);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <LegendDot
          className="border-primary/70 bg-card"
          label="Available"
        />

        <LegendDot
          className="border-muted-foreground/40 bg-muted"
          label="Booked"
        />

        <LegendDot
          className="border-primary bg-primary"
          label="Selected"
        />

        <LegendDot
          className="border-accent bg-accent"
          label="Reserved"
        />
      </div>

      <div className="mx-auto w-full max-w-sm rounded-[2.2rem] border-4 border-foreground/15 bg-secondary p-3 shadow-sm sm:max-w-md">
        {/* Driver / door area */}
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-card px-3 py-2">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CircleUserRound className="h-5 w-5 text-primary" />
            Driver
          </span>

          <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Door
            <DoorOpen className="h-5 w-5 text-primary" />
          </span>
        </div>

        {/* Seats */}
        <div className="space-y-1.5">
          {layout.rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="grid items-center gap-1"
              style={{
                gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
              }}
            >
              {row.map((cell, cellIndex) => {
                if (cell.kind === "aisle") {
                  return (
                    <div
                      key={cellIndex}
                      className="min-h-[62px] sm:min-h-[68px]"
                      aria-hidden
                    />
                  );
                }

                if (cell.kind === "empty") {
                  return (
                    <div
                      key={cellIndex}
                      className="min-h-[62px] sm:min-h-[68px]"
                      aria-hidden
                    />
                  );
                }

                const isTaken = takenSet.has(cell.number);
                const isReserved = reservedSet.has(cell.number);
                const isSelected = selected === cell.number;
                const disabled = isTaken || isReserved;

                return (
                  <button
                    key={cellIndex}
                    type="button"
                    disabled={disabled}
                    aria-label={`Seat ${cell.number}${
                      disabled ? " unavailable" : ""
                    }`}
                    aria-pressed={isSelected}
                    onClick={() => onSelect(cell.number)}
                    className={cn(
                      "flex min-w-0 items-center justify-center rounded-xl outline-none transition-transform",
                      "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      !disabled && "hover:scale-105 active:scale-95",
                      disabled && "cursor-not-allowed",
                    )}
                  >
                    <BusSeat
                      number={cell.number}
                      disabled={disabled}
                      reserved={isReserved}
                      selected={isSelected}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
  
