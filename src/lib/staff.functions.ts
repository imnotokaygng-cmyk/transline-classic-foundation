import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAdmin } from "@/lib/authz.middleware";

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "id, full_name, email, phone, role, is_active, branch_id, station_id, created_at, branches(name), stations(name)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      full_name: r.full_name ?? null,
      email: r.email ?? null,
      phone: r.phone ?? null,
      role: r.role as "admin" | "clerk",
      is_active: r.is_active,
      branch_id: r.branch_id ?? null,
      station_id: (r as { station_id?: string | null }).station_id ?? null,
      station_name: (r as { stations?: { name?: string } | null }).stations?.name ?? null,
      branch_name: (r as { branches?: { name?: string } | null }).branches?.name ?? null,
    }));
  });

export const createClerk = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) =>
    z
      .object({
        full_name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        phone: z.string().optional(),
        branch_id: z.string().uuid().nullable().optional(),
        station_id: z.string().uuid().nullable().optional(),
        role: z.enum(["admin", "clerk"]).default("clerk"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.role === "clerk" && !data.branch_id) {
      throw new Error("A clerk must be assigned to a branch");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");

    const { error: upErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: created.user.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone ?? null,
        branch_id: data.branch_id ?? null,
        station_id: data.station_id ?? null,
        role: data.role,
        is_active: true,
      },
      { onConflict: "id" },
    );
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "create_staff",
      entity_type: "profile",
      entity_id: created.user.id,
      details: { email: data.email, role: data.role, branch_id: data.branch_id },
    });

    return { id: created.user.id };
  });

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: z.string().min(2).optional(),
        phone: z.string().nullable().optional(),
        branch_id: z.string().uuid().nullable().optional(),
        station_id: z.string().uuid().nullable().optional(),
        role: z.enum(["admin", "clerk"]).optional(),
        is_active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.id === context.userId && (data.is_active === false || data.role === "clerk")) {
      throw new Error("You cannot remove your own administrator access");
    }

    const patch: {
      full_name?: string;
      phone?: string | null;
      branch_id?: string | null;
      station_id?: string | null;
      role?: "admin" | "clerk";
      is_active?: boolean;
    } = {};
    if (data.full_name !== undefined) patch.full_name = data.full_name;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.branch_id !== undefined) patch.branch_id = data.branch_id;
    if (data.station_id !== undefined) patch.station_id = data.station_id;
    if (data.role !== undefined) patch.role = data.role;
    if (data.is_active !== undefined) patch.is_active = data.is_active;

    // A clerk must always belong to a branch.
    if (patch.role === "clerk" && patch.branch_id === null) {
      throw new Error("A clerk must be assigned to a branch");
    }

    const { error } = await context.supabase.from("profiles").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), password: z.string().min(8) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "reset_staff_password",
      entity_type: "profile",
      entity_id: data.id,
    });
    return { ok: true };
  });
