import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Page, SectionCard } from "@/components/page-shell";
import { QueryState } from "@/components/query-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KES } from "@/lib/format";
import { stationReport } from "@/lib/stations.functions";

export const Route = createFileRoute("/_authenticated/admin/stations/reports")({
  head: () => ({
    meta: [
      { title: "Station Report | Transline Classic TMS" },
      { name: "description", content: "Tickets, parcels and revenue produced by each station." },
      { property: "og:title", content: "Station Report | Transline Classic TMS" },
      {
        property: "og:description",
        content: "Tickets, parcels and revenue produced by each station.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StationReportPage,
});

function StationReportPage() {
  const fetchReport = useServerFn(stationReport);
  const { data, isLoading, error } = useQuery({
    queryKey: ["station-report"],
    queryFn: () => fetchReport(),
  });
  const rows = data ?? [];

  const totals = rows.reduce(
    (acc, r) => ({
      bookings: acc.bookings + r.bookings,
      ticket: acc.ticket + r.ticket_revenue,
      parcels: acc.parcels + r.parcels,
      parcel: acc.parcel + r.parcel_revenue,
    }),
    { bookings: 0, ticket: 0, parcels: 0, parcel: 0 },
  );

  return (
    <Page
      title="Station Report"
      description="Tickets, parcels and revenue produced by each station."
    >
      <SectionCard title="Network totals">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Tickets sold", String(totals.bookings)],
            ["Ticket revenue", KES(totals.ticket)],
            ["Parcels handled", String(totals.parcels)],
            ["Parcel revenue", KES(totals.parcel)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="By station">
        <QueryState
          isLoading={isLoading}
          error={error}
          isEmpty={rows.length === 0}
          emptyMessage="No stations yet."
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Ticket revenue</TableHead>
                  <TableHead>Parcels</TableHead>
                  <TableHead>Parcel revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.station_id}>
                    <TableCell className="font-medium">
                      {r.station}{" "}
                      <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                    </TableCell>
                    <TableCell>{r.branch_name ?? "—"}</TableCell>
                    <TableCell>{r.staff_count}</TableCell>
                    <TableCell>{r.bookings}</TableCell>
                    <TableCell>{KES(r.ticket_revenue)}</TableCell>
                    <TableCell>{r.parcels}</TableCell>
                    <TableCell>{KES(r.parcel_revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </QueryState>
      </SectionCard>
    </Page>
  );
}
