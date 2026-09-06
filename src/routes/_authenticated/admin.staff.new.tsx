import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Page, SectionCard } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { createClerk } from "@/lib/staff.functions";

const NONE = "__none__";
export const Route = createFileRoute("/_authenticated/admin/staff/new")({
  head: () => ({
    meta: [
      { title: "Add Clerk | Transline Classic TMS" },
      { name: "description", content: "Create a clerk account and assign a branch." },
      { property: "og:title", content: "Add Clerk | Transline Classic TMS" },
      { property: "og:description", content: "Create a clerk account and assign a branch." },
    ],
  }),
  component: StaffNewPage,
});

function StaffNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addClerk = useServerFn(createClerk);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState("");
  const [stationId, setStationId] = useState("");
  const [role, setRole] = useState<"admin" | "clerk">("clerk");

  const { data: stations } = useQuery({
    queryKey: ["stations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stations")
        .select("id, name, code, branch_id")
        .eq("is_active", true)
        .order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, town")
        .order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: () =>
      addClerk({
        data: {
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          branch_id: branchId || null,
          station_id: stationId && stationId !== NONE ? stationId : null,
          role,
        },
      }),
    onSuccess: async () => {
      toast.success("Staff account created");
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
      navigate({ to: "/admin/staff" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Page title="Add Clerk" description="Create a clerk account and assign a branch.">
      <SectionCard title="Staff details">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (
              !fullName.trim() ||
              !email.trim() ||
              password.length < 8 ||
              (role === "clerk" && !branchId)
            ) {
              toast.error("Fill in name, email, branch and a password of 8+ characters.");
              return;
            }
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-2">
            <Label>Work email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Work email"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254…" />
          </div>
          <div className="space-y-2">
            <Label>Temporary password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="space-y-2">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {(branches ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                    {b.town ? ` — ${b.town}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Station</Label>
            <Select value={stationId} onValueChange={setStationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select station" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No station</SelectItem>
                {(stations ?? [])
                  .filter((s) => !branchId || s.branch_id === branchId)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "clerk")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clerk">Clerk</SelectItem>
                <SelectItem value="admin">Main Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {create.error ? (
            <p className="sm:col-span-2 text-sm text-destructive">
              {(create.error as Error).message}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create staff account"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </Page>
  );
}
