import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAdmin, requireAdminOrClerk } from "@/lib/authz.middleware";

export type Station = {
  id: string;
  name: string;
  code: string;
  town: string | null;
  branch_id: string | null;
  branch_name: string | null;
  is_active: boolean;
};

export const listStations = createServerFn({ method: "GET" })
  .middleware([requireAdminOrClerk])
  .handler(async ({ context }): Promise<Station[]> => {
    const { data, error } = await context.supabase
      .from("stations")
      .select("id, name, code, town, branch_id, is_active, branches(name)")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      town: s.town ?? null,
      branch_id: s.branch_id ?? null,
      branch_name: (s as { branches?: { name?: string } | null }).branches?.name ?? null,
      is_active: s.is_active,
    }));
  });

export const createStation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().min(2),
        code: z.string().min(2).max(20),
        town: z.string().optional(),
        branch_id: z.string().uuid().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stations").insert({
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      town: data.town?.trim() || null,
      branch_id: data.branch_id ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setStationActive = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("stations")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Permanently remove a station. Staff assigned to it are detached first. */
export const deleteStation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error: clearErr } = await context.supabase
      .from("profiles")
      .update({ station_id: null })
      .eq("station_id", data.id);
    if (clearErr) throw new Error(clearErr.message);

    const { error } = await context.supabase.from("stations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type StationStaff = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "admin" | "clerk";
  branch_name: string | null;
  station_id: string | null;
};

/** Staff list used by the "assign a station" panel. */
export const listStationStaff = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<StationStaff[]> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, role, station_id, is_active, branches(name)")
      .eq("is_active", true)
      .order("full_name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name ?? null,
      email: p.email ?? null,
      role: String(p.role) === "admin" ? "admin" : "clerk",
      branch_name: (p as { branches?: { name?: string } | null }).branches?.name ?? null,
      station_id: (p as { station_id?: string | null }).station_id ?? null,
    }));
  });

/** Assign (or clear) the station a staff member works from. */
export const assignStaffStation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) =>
    z
      .object({ staff_id: z.string().uuid(), station_id: z.string().uuid().nullable() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ station_id: data.station_id })
      .eq("id", data.staff_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type StationReportRow = {
  station_id: string;
  station: string;
  code: string;
  branch_name: string | null;
  staff_count: number;
  bookings: number;
  ticket_revenue: number;
  parcels: number;
  parcel_revenue: number;
};

/**
 * Station report — activity is attributed to the station its staff belong to.
 */
export const stationReport = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<StationReportRow[]> => {
    const [stationsRes, staffRes, bookingsRes, parcelsRes] = await Promise.all([
      context.supabase
        .from("stations")
        .select("id, name, code, branch_id, branches(name)")
        .order("name"),
      context.supabase.from("profiles").select("id, station_id"),
      context.supabase
        .from("bookings")
        .select("booked_by, fare_amount, payment_status")
        .is("deleted_at", null),
      context.supabase.from("parcels").select("booked_by, fare_amount"),
    ]);

    for (const r of [stationsRes, staffRes, bookingsRes, parcelsRes]) {
      if (r.error) throw new Error(r.error.message);
    }

    const stationOfStaff = new Map<string, string>();
    for (const p of staffRes.data ?? []) {
      const sid = (p as { station_id?: string | null }).station_id;
      if (sid) stationOfStaff.set(p.id, sid);
    }

    const rows: StationReportRow[] = (stationsRes.data ?? []).map((s) => ({
      station_id: s.id,
      station: s.name,
      code: s.code,
      branch_name: (s as { branches?: { name?: string } | null }).branches?.name ?? null,
      staff_count: 0,
      bookings: 0,
      ticket_revenue: 0,
      parcels: 0,
      parcel_revenue: 0,
    }));
    const byId = new Map(rows.map((r) => [r.station_id, r]));

    for (const sid of stationOfStaff.values()) {
      const row = byId.get(sid);
      if (row) row.staff_count += 1;
    }
    for (const b of bookingsRes.data ?? []) {
      const sid = b.booked_by ? stationOfStaff.get(b.booked_by) : undefined;
      const row = sid ? byId.get(sid) : undefined;
      if (!row) continue;
      row.bookings += 1;
      if (b.payment_status === "paid") row.ticket_revenue += Number(b.fare_amount ?? 0);
    }
    for (const p of parcelsRes.data ?? []) {
      const sid = p.booked_by ? stationOfStaff.get(p.booked_by) : undefined;
      const row = sid ? byId.get(sid) : undefined;
      if (!row) continue;
      row.parcels += 1;
      row.parcel_revenue += Number(p.fare_amount ?? 0);
    }

    return rows;
  });
