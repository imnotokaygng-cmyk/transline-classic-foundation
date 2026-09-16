import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/clerk")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/staff" });
  },
});
