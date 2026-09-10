import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { Page, SectionCard } from "@/components/page-shell";
import { QueryState } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  assignStaffStation,
  createStation,
  deleteStation,
  listStations,
  listStationStaff,
  setStationActive,
} from "@/lib/stations.functions";

const NONE = "__none__";

export const Route = createFileRoute("/_authenticated/admin/stations/")({
  head: () => ({
    meta: [
      { title: "Stations | Transline Classic TMS" },
      { name: "description", content: "Add stations, remove them and assign clerks to a station." },
      { property: "og:title", content: "Stations | Transline Classic TMS" },
      {
        property: "og:description",
        content: "Add stations, remove them and assign clerks to a station.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StationsPage,
});

function StationsPage() {
  const queryClient = useQueryClient();
  const fetchStations = useServerFn(listStations);
  const fetchStaff = useServerFn(listStationStaff);
  const addStation = useServerFn(createStation);
  const toggleStation = useServerFn(setStationActive);
  const removeStation = useServerFn(deleteStation);
  const assignStation = useServerFn(assignStaffStation);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [town, setTown] = useState("");
  const [branchId, setBranchId] = useState("");

  const stations = useQuery({ queryKey: ["stations"], queryFn: () => fetchStations() });
  const staff = useQuery({ queryKey: ["station-staff"], queryFn: () => fetchStaff() });
  const branches = useQuery({
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

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["stations"] }),
      queryClient.invalidateQueries({ queryKey: ["station-staff"] }),
      queryClient.invalidateQueries({ queryKey: ["station-report"] }),
      queryClient.invalidateQueries({ queryKey: ["staff"] }),
    ]);
  };

  const create = useMutation({
    mutationFn: () =>
      addStation({
        data: {
          name: name.trim(),
          code: code.trim(),
          town: town.trim() || undefined,
          branch_id: branchId || null,
        },
      }),
    onSuccess: async () => {
      toast.success("Station added");
      setName("");
      setCode("");
      setTown("");
      setBranchId("");
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => toggleStation({ data: v }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeStation({ data: { id } }),
    onSuccess: async () => {
      toast.success("Station deleted");
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: (v: { staff_id: string; station_id: string | null }) => assignStation({ data: v }),
    onSuccess: async () => {
      toast.success("Station assignment saved");
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = stations.data ?? [];
  const staffRows = staff.data ?? [];

  return (
    <Page
      title="Stations"
      description="Booking stations across the network. Clerks can be assigned to a station."
    >
      <SectionCard title="Add a station">
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length < 2 || code.trim().length < 2) {
              toast.error("Enter a station name and a short code.");
              return;
            }
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Station name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kisii Main Station"
            />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="KSI-01" />
          </div>
          <div className="space-y-2">
            <Label>Town</Label>
            <Input value={town} onChange={(e) => setTown(e.target.value)} placeholder="Kisii" />
          </div>
          <div className="space-y-2">
            <Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {(branches.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Saving…" : "Add station"}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="All stations">
        <QueryState
          isLoading={stations.isLoading}
          error={stations.error}
          isEmpty={rows.length === 0}
          emptyMessage="No stations yet."
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Town</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell>{s.town ?? "—"}</TableCell>
                    <TableCell>{s.branch_name ?? "—"}</TableCell>
                    <TableCell>{staffRows.filter((p) => p.station_id === s.id).length}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate({ id: s.id, is_active: !s.is_active })}
                        >
                          {s.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" aria-label={`Delete ${s.name}`}>
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {s.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This removes the station permanently. Any staff working from it will
                                no longer have a station assigned.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove.mutate(s.id)}>
                                Delete station
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </QueryState>
      </SectionCard>

      <SectionCard title="Assign a station to a clerk">
        <QueryState
          isLoading={staff.isLoading}
          error={staff.error}
          isEmpty={staffRows.length === 0}
          emptyMessage="No active staff yet."
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="w-64">Station</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffRows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className="font-medium">{p.full_name ?? "Unnamed"}</span>
                      <span className="block text-xs text-muted-foreground">{p.email ?? "—"}</span>
                    </TableCell>
                    <TableCell className="capitalize">{p.role}</TableCell>
                    <TableCell>{p.branch_name ?? "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={p.station_id ?? NONE}
                        disabled={assign.isPending}
                        onValueChange={(v) =>
                          assign.mutate({ staff_id: p.id, station_id: v === NONE ? null : v })
                        }
                      >
                        <SelectTrigger aria-label={`Station for ${p.full_name ?? "staff"}`}>
                          <SelectValue placeholder="No station" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>No station</SelectItem>
                          {rows
                            .filter((s) => s.is_active)
                            .map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name} ({s.code})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
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
