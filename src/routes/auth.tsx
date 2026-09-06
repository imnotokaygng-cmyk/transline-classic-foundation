import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bus, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Sign In | Transline Classic TMS" },
      {
        name: "description",
        content:
          "Secure staff sign-in for the Transline Classic transport management system — bookings, parcels, fleet and finance.",
      },
      { property: "og:title", content: "Staff Sign In | Transline Classic TMS" },
      {
        property: "og:description",
        content: "Secure staff sign-in for the Transline Classic transport management system.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function redirectExistingSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session || !active) return;

        if (active) navigate({ to: "/dashboard", replace: true });
      } catch (error) {
        console.error("[v0] Existing session redirect failed:", error);
        if (active) await supabase.auth.signOut().catch(() => undefined);
      }
    }

    void redirectExistingSession();
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("email not confirmed")) {
          toast.error("Confirm your email before signing in.");
        } else if (message.includes("rate limit") || message.includes("too many")) {
          toast.error("Too many attempts. Please wait a moment and try again.");
        } else {
          toast.error("Invalid email or password.");
        }
        return;
      }

      // The authenticated route resolves the profile with the active browser session.
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      console.error("[v0] Login failed:", error);
      toast.error("We could not sign you in. Check your email and password and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo:
            import.meta.env["NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL"] ??
            `${window.location.origin}/auth/callback`,
          data: { full_name: fullName.trim() },
        },
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        toast.success("Account created. Check your email to confirm before signing in.");
      }
    } catch (error) {
      console.error("[v0] Account creation failed:", error);
      toast.error("We could not create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      toast.error("Enter your email first, then tap forgot password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset link sent to your email.");
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section
        className="relative hidden flex-col justify-between p-10 text-primary-foreground lg:flex"
        style={{ background: "var(--gradient-brand)" }}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-foreground/15 text-lg font-bold">
            TC
          </span>
          <div>
            <p className="text-lg font-semibold">Transline Classic</p>
            <p className="text-sm opacity-80">Transport Management System</p>
          </div>
        </div>

        <div className="max-w-md space-y-5">
          <h2 className="text-3xl font-semibold leading-tight">
            One platform for tickets, parcels, fleet and finance.
          </h2>
          <p className="text-sm opacity-85">
            Manage every branch from Nairobi to Kisii, Oyugis, Kisumu, Kericho and Nakuru — bookings,
            manifests, dispatch, parcels and daily reconciliation in KES.
          </p>
          <ul className="space-y-3 text-sm">
            {["Role-based access for every department", "Real-time branch and trip visibility", "Audit-ready financial records"].map(
              (item) => (
                <li key={item} className="flex items-center gap-2">
                  <ShieldCheck className="size-4" /> {item}
                </li>
              ),
            )}
          </ul>
        </div>

        <p className="text-xs opacity-70">Demo environment — sample operational data.</p>
      </section>

      <section className="flex items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              TC
            </span>
            <div>
              <p className="font-semibold">Transline Classic</p>
              <p className="text-xs text-muted-foreground">Transport Management System</p>
            </div>
          </div>

          <Card style={{ boxShadow: "var(--shadow-elevated)" }}>
            <CardContent className="pt-6">
              <div className="mb-6 space-y-1">
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                  <Bus className="size-5 text-primary" /> Staff portal
                </h1>
                <p className="text-sm text-muted-foreground">Sign in to access the operations dashboard.</p>
              </div>

              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email / username</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="agent@translineclassic.co.ke"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 size-4 animate-spin" />} Sign in
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full name</Label>
                      <Input
                        id="fullName"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Wanjiku"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupEmail">Work email</Label>
                      <Input
                        id="signupEmail"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="agent@translineclassic.co.ke"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupPassword">Password</Label>
                      <Input
                        id="signupPassword"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 size-4 animate-spin" />} Create staff account
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      New accounts start with the Branch Staff role. An administrator can upgrade access later.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
