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
      <span
        className={cn(
          "h-4 w-4 rounded-md border-2",
          className
        )}
      />
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
  const seatFill = selected
    ? "fill-primary"
    : reserved
      ? "fill-accent"
      : disabled
        ? "fill-muted-foreground/55"
        : "fill-card";

  const armFill = selected
    ? "fill-primary-foreground/80"
    : reserved
      ? "fill-accent-foreground/80"
      : disabled
        ? "fill-muted-foreground/70"
        : "fill-primary";

  const seatStroke = selected
    ? "stroke-primary"
    : reserved
      ? "stroke-accent"
      : disabled
        ? "stroke-muted-foreground/40"
        : "stroke-primary";

  return (
    <span className="relative flex h-[58px] w-[58px] items-center justify-center sm:h-[62px] sm:w-[62px]">
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        {/* Backrest */}
        <path
          d="M17 8h30a5 5 0 0 1 5 5v20H12V13a5 5 0 0 1 5-5Z"
          className={cn(seatFill, seatStroke)}
          strokeWidth="2"
        />

        {/* Seat cushion */}
        <path
          d="M16 31h32a7 7 0 0 1 7 7v7H9v-7a7 7 0 0 1 7-7Z"
          className={cn(seatFill, seatStroke)}
          strokeWidth="2"
        />

        {/* Left armrest */}
        <path
          d="M8 26h7v22H8a3 3 0 0 1-3-3V29a3 3 0 0 1 3-3Z"
          className={armFill}
        />

        {/* Right armrest */}
        <path
          d="M49 26h7a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3h-7V26Z"
          className={armFill}
        />

        {/* Armrest highlights */}
        <path
          d="M10 29h3v15h-3Zm41 0h3v15h-3Z"
          className="fill-background/70"
        />
      </svg>

      <span
        className={cn(
          "relative z-10 mt-1 text-[10px] font-bold leading-none",
          (selected || reserved) && "text-primary-foreground",
          disabled &&
            !selected &&
            !reserved &&
            "text-background"
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
      {/* Legend */}
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

      {/* Bus */}
      <div className="mx-auto w-full max-w-sm rounded-[2.2rem] border-4 border-foreground/15 bg-secondary p-3 shadow-sm sm:max-w-md">

        {/* Driver / Door */}
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
                      className="min-h-[58px]"
                      aria-hidden
                    />
                  );
                }

                if (cell.kind === "empty") {
                  return (
                    <div
                      key={cellIndex}
                      className="min-h-[58px]"
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
                      !disabled &&
                        "hover:scale-105 active:scale-95",
                      disabled && "cursor-not-allowed"
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
