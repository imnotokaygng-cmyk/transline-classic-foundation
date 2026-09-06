import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Page, SectionCard } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/parcels/tracking")({
  head: () => ({
    meta: [
      { title: "Parcel Tracking | Transline Classic TMS" },
      { name: "description", content: "Track a parcel using its code." },
    ],
  }),
  component: ParcelsTrackingPage,
});

function ParcelsTrackingPage() {
  const [code, setCode] = useState("");
  const [searchedCode, setSearchedCode] = useState("");
  const parcel = useQuery({
    queryKey: ["parcel-tracking", searchedCode],
    enabled: searchedCode.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcels")
        .select(
          "id, tracking_code, sender_name, receiver_name, status, created_at, origin:origin_branch_id(name), destination:destination_branch_id(name)",
        )
        .eq("tracking_code", searchedCode)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  return (
    <Page title="Parcel Tracking" description="Track a parcel using its code.">
      <SectionCard title="Track a parcel">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setSearchedCode(code.trim());
          }}
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter tracking code"
            aria-label="Tracking code"
          />
          <Button type="submit" disabled={!code.trim()}>
            Track
          </Button>
        </form>
        {parcel.isLoading && (
          <p className="mt-4 text-sm text-muted-foreground">Looking up parcel…</p>
        )}
        {parcel.data && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-mono text-sm">{parcel.data.tracking_code}</p>
                <p className="text-sm text-muted-foreground">
                  {parcel.data.sender_name} → {parcel.data.receiver_name}
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {parcel.data.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {(parcel.data.origin as { name?: string } | null)?.name ?? "—"} to{" "}
              {(parcel.data.destination as { name?: string } | null)?.name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              Booked{" "}
              {parcel.data.created_at
                ? new Date(parcel.data.created_at).toLocaleString()
                : "—"}
            </p>
          </div>
        )}
        {searchedCode && !parcel.isLoading && !parcel.data && (
          <p className="mt-4 text-sm text-muted-foreground">
            No parcel found for that tracking code.
          </p>
        )}
      </SectionCard>
    </Page>
  );
}
