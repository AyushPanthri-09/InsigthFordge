import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { KeyRound, Mail, Sparkles, ArrowRight, Shield } from "lucide-react";
import { Brand } from "@/components/insightforge/Brand";
import { authService } from "@/services/auth";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning("Missing Fields", {
        description: "Please enter both email and password.",
      });
      return;
    }

    setLoading(true);
    try {
      const user = await authService.login(email, password);
      toast.success("Welcome back!", {
        description: `Logged in as ${user.email} (${user.role})`,
      });
      // Redirect to dashboard
      router.navigate({ to: "/dashboard" });
    } catch (err: any) {
      console.error(err);
      toast.error("Authentication Failed", {
        description: err.message || "Invalid credentials.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <Toaster richColors closeButton position="top-center" />

      {/* Dynamic neon orbs */}
      <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute -right-32 bottom-10 h-72 w-72 rounded-full bg-info/20 blur-[120px]" />

      <div className="relative w-full max-w-[440px] space-y-6">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center">
          <Brand />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-4 flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary"
          >
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            Enterprise Decision Engine
          </motion.div>
        </div>

        {/* Card wrapper */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-2xl border border-white/10 bg-surface/60 p-8 shadow-2xl backdrop-blur-xl"
          style={{
            boxShadow:
              "0 0 40px -10px oklch(0.85 0.19 95 / 8%), 0 16px 40px -20px oklch(0 0 0 / 80%)",
          }}
        >
          <div className="mb-6 space-y-1.5">
            <h1 className="font-display text-2xl font-bold tracking-tight">Access platform</h1>
            <p className="text-sm text-muted-foreground">
              Sign in with your enterprise credentials
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground/60">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-white/8 bg-background/50 py-3 pl-10 pr-4 text-sm font-medium transition-all duration-200 focus:border-primary focus:bg-background/80 focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground/60">
                  <KeyRound className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/8 bg-background/50 py-3 pl-10 pr-4 text-sm font-medium transition-all duration-200 focus:border-primary focus:bg-background/80 focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:opacity-90 active:scale-[0.98] transition-all disabled:pointer-events-none disabled:opacity-50"
              style={{
                boxShadow: "0 4px 20px -4px oklch(0.85 0.19 95 / 40%)",
              }}
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  Authenticate{" "}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Registration link */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-primary underline underline-offset-4 hover:text-primary/95"
            >
              Register here
            </Link>
          </div>
        </motion.div>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground/60">
          <Shield className="h-3.5 w-3.5" />
          <span>Secured JWT authorization environment</span>
        </div>
      </div>
    </div>
  );
}
