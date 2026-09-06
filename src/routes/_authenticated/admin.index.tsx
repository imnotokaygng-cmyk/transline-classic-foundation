import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Building2,
  Bus,
  CalendarClock,
  Map,
  Package,
  Scale,
  Settings,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";

import { Page, SectionCard } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Console | Transline Classic TMS" },
      {
        name: "description",
        content:
          "Main Admin console for Transline Classic — staff, branches, fleet, finance and company-wide reports.",
      },
      { property: "og:title", content: "Admin Console | Transline Classic TMS" },
      {
        property: "og:description",
        content: "Company-wide control of staff, branches, fleet, finance and reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminHome,
});

const tiles = [
  { title: "Staff & Clerks", to: "/admin/staff", icon: Users, text: "Add, edit, deactivate and reset clerk accounts." },
  { title: "Stations", to: "/admin/stations", icon: Building2, text: "Add or delete stations and assign clerks to them." },
  { title: "Station Report", to: "/admin/stations/reports", icon: BarChart3, text: "Tickets, parcels and revenue per station." },
  { title: "Bookings", to: "/bookings", icon: Ticket, text: "All ticket sales across every branch." },
  { title: "Trips", to: "/trips", icon: CalendarClock, text: "Schedules, dispatch and manifests." },
  { title: "Parcels", to: "/parcels", icon: Package, text: "Parcel bookings, loading sheets and tracking." },
  { title: "Fleet", to: "/fleet", icon: Bus, text: "Buses, capacity and status." },
  { title: "Routes", to: "/routes", icon: Map, text: "Routes and fares." },
  { title: "Finance", to: "/finance", icon: Wallet, text: "Cash, banking, mobile money and expenses." },
  { title: "Reports", to: "/reports", icon: BarChart3, text: "Company-wide revenue and branch performance." },
  { title: "Reconciliation", to: "/reconciliation", icon: Scale, text: "Daily branch reconciliation." },
  { title: "Settings", to: "/settings", icon: Settings, text: "System and profile settings." },
] as const;

function AdminHome() {
  return (
    <Page title="Admin Console" description="Full company-wide control for the Main Admin.">
      <SectionCard title="Manage the business">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tiles.map((tile) => (
            <Link
              key={tile.title}
              to={tile.to}
              className="flex items-start gap-3 rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-sm"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <tile.icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{tile.title}</span>
                <span className="block text-sm text-muted-foreground">{tile.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </SectionCard>
    </Page>
  );
}
