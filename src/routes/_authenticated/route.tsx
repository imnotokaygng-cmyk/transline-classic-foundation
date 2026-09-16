import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { roleTitle, type StaffProfile } from "@/lib/session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      if (typeof window !== "undefined") {
        // TanStack Router's location.search is the parsed search object.
        // Use searchStr here because sessionStorage requires a primitive string.
        window.sessionStorage.setItem(
          "transline:redirect-after-auth",
          `${location.pathname}${location.searchStr}${location.hash}`,
        );
      }
      throw redirect({ to: "/auth" });
    }

    // Resolve the profile with the browser client. TanStack Start server functions
    // do not automatically receive Supabase's browser session bearer token.
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, branch_id, is_active, branches(name)")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Unable to load staff profile: ${profileError.message}`);
    }

    const role = ["admin", "super_admin", "administrator"].includes(String(profileRow?.role))
      ? "admin"
      : "clerk";
    const isActive = profileRow?.is_active ?? true;
    const branchId = profileRow?.branch_id ?? null;
    if (!isActive) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth/disabled" });
    }
    if (role === "clerk" && !branchId) throw redirect({ to: "/auth/pending" });

    const adminOnlyPrefixes = [
      "/admin",
      "/finance",
      "/fleet",
      "/routes",
      "/staff",
      "/settings/system",
    ];
    if (role === "clerk" && adminOnlyPrefixes.some((p) => location.pathname.startsWith(p))) {
      throw redirect({ to: "/dashboard" });
    }

    const profile: StaffProfile = {
      id: data.user.id,
      full_name: profileRow?.full_name ?? null,
      email: profileRow?.email ?? data.user.email ?? null,
      role,
      branch_id: branchId,
      branch_name:
        (profileRow as { branches?: { name?: string } | null } | null)?.branches?.name ?? null,
      is_active: isActive,
    };

    return { user: data.user, profile };
  },
  component: AppLayout,
});

function AppLayout() {
  const { user, profile } = Route.useRouteContext();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar role={profile.role} />
        <SidebarInset className="min-w-0">
          <AppTopbar
            email={profile.email ?? user.email ?? "staff@translineclassic.co.ke"}
            role={roleTitle(profile.role)}
            branch={profile.branch_name}
          />
          <Outlet />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
