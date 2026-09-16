import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/stations")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/stations" });
  },
});
