import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Plus } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Page, SectionCard } from "@/components/page-shell";
import { listStaff, resetStaffPassword, updateStaff } from "@/lib/staff.functions";
import { useStaffSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/admin/staff/")({
  beforeLoad: ({ context }) => {
    if (context.profile.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Staff & Clerks | Transline Classic TMS" },
      { name: "description", content: "Manage clerk accounts, branches and access status." },
      { property: "og:title", content: "Staff & Clerks | Transline Classic TMS" },
      { property: "og:description", content: "Manage clerk accounts, branches and access status." },
    ],
  }),
  component: StaffIndexPage,
});

function StaffIndexPage() {
  const { isAdmin } = useStaffSession();
  const queryClient = useQueryClient();
  const fetchStaff = useServerFn(listStaff);
  const patchStaff = useServerFn(updateStaff);
  const resetPassword = useServerFn(resetStaffPassword);

  const [resetFor, setResetFor] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetchStaff(),
    enabled: isAdmin,
  });

  const toggle = useMutation({
    mutationFn: (vars: { id: string; is_active: boolean }) => patchStaff({ data: vars }),
    onSuccess: () => {
      toast.success("Staff account updated");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: (vars: { id: string; password: string }) => resetPassword({ data: vars }),
    onSuccess: () => {
      toast.success("Password reset");
      setResetFor(null);
      setNewPassword("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <Page title="Staff" description="Main admin only.">
        <SectionCard title="Restricted">
          <p className="text-sm text-muted-foreground">
            Only the main admin can manage staff accounts.
          </p>
        </SectionCard>
      </Page>
    );
  }

  return (
    <Page title="Staff & Clerks" description="Manage clerk accounts, branches and access status.">
      <SectionCard
        title="Staff accounts"
        action={
          <Button asChild size="sm">
            <Link to="/admin/staff/new">
              <Plus className="mr-1 size-4" /> Add Clerk
            </Link>
          </Button>
        }
      >
        {isLoading && <p className="text-sm text-muted-foreground">Loading staff…</p>}
        {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
        {data && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.full_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{row.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={row.role === "admin" ? "default" : "secondary"}>
                        {row.role === "admin" ? "Main Admin" : "Clerk"}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.branch_name ?? "—"}</TableCell>
                    <TableCell>{row.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={row.is_active}
                        onCheckedChange={(v) => toggle.mutate({ id: row.id, is_active: v })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setResetFor({ id: row.id, name: row.full_name ?? row.email ?? "staff" })
                          }
                        >
                          <KeyRound className="mr-1 size-3.5" /> Reset
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <Link to="/admin/staff/$id" params={{ id: row.id }}>
                            Edit
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <Dialog open={!!resetFor} onOpenChange={(o) => !o && setResetFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password — {resetFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <DialogFooter>
            <Button
              disabled={newPassword.length < 8 || reset.isPending}
              onClick={() => resetFor && reset.mutate({ id: resetFor.id, password: newPassword })}
            >
              {reset.isPending ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
