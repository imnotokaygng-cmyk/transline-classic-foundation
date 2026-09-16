import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  // The parent authenticated route already resolved the Supabase session and
  // the caller's staff profile. Reuse that trusted route context here instead
  // of making a second server-function request during every Admin navigation.
  beforeLoad: ({ context }) => {
    if (!context.profile.is_active) throw redirect({ to: "/auth/disabled" });
    if (context.profile.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  component: () => <Outlet />,
});
