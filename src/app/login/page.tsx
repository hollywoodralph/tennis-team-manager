"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/DataContext";

const DEMO_ACCOUNTS = [
  { email: "admin@photogralph.com", label: "Admin", color: "bg-blue-50 border-blue-200 hover:border-blue-400" },
  { email: "coach@photogralph.com", label: "Coach", color: "bg-tennis-50 border-tennis-200 hover:border-tennis-400" },
  { email: "parent@photogralph.com", label: "Parent", color: "bg-amber-50 border-amber-200 hover:border-amber-400" },
  { email: "assistant@photogralph.com", label: "Assistant", color: "bg-purple-50 border-purple-200 hover:border-purple-400" },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const { showToast } = useData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect to dashboard
  if (typeof window !== "undefined" && user) {
    router.replace("/dashboard");
  }

  // ?demo=1 or ?demo=coach|admin|parent|assistant auto-logs in.
  // Used for stakeholder demos and shareable links: /login?demo=1
  // drops the viewer straight into the coach dashboard. The page also
  // supports ?redirect=/some/path to land on a specific page after login.
  useEffect(() => {
    if (user || loading) return;
    const demo = searchParams.get("demo");
    if (!demo) return;
    const target = demo === "1" || demo === "true"
      ? "coach@photogralph.com"
      : `${demo}@photogralph.com`;
    if (!DEMO_ACCOUNTS.some((a) => a.email === target)) return;
    setLoading(true);
    setError("");
    (async () => {
      const result = await login(target, "password");
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      const next = searchParams.get("redirect") || "/dashboard";
      router.push(next);
    })();
  }, [searchParams, user, loading, login, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      showToast("Welcome back!", "success");
      router.push("/dashboard");
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError("");
    setEmail(demoEmail);
    setPassword("password");
    setLoading(true);
    const result = await login(demoEmail, "password");
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      showToast("Logged in as " + demoEmail, "success");
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-tennis-100 flex items-center justify-center text-2xl">🎾</div>
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-1">PhotogRalph Tennis</h1>
        <p className="text-center text-slate-500 mb-6 text-sm">Team Manager</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tennis-400 focus:border-transparent outline-none"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tennis-400 focus:border-transparent outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-2.5 px-4 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2",
              loading ? "bg-slate-400 cursor-not-allowed" : "bg-tennis-600 hover:bg-tennis-700"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-500">
          New here?{" "}
          <Link href="/signup" className="text-tennis-600 font-medium hover:underline">
            Create an account
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs text-center text-slate-500 mb-3 font-medium uppercase tracking-wide">
            Demo Accounts — Click to Log In
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                type="button"
                key={account.email}
                onClick={() => handleDemoLogin(account.email)}
                disabled={loading}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all text-left flex flex-col gap-0.5",
                  loading ? "opacity-50 cursor-not-allowed" : `${account.color} cursor-pointer shadow-sm hover:shadow-md`
                )}
              >
                <span className="font-bold text-sm text-slate-800 pointer-events-none">{account.label}</span>
                <span className="text-[10px] text-slate-500 font-medium pointer-events-none truncate">{account.email}</span>
                <span className="text-[10px] text-slate-400 pointer-events-none">Pass: password</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-3">
            Demo accounts require a seeded database. Run <code className="bg-slate-100 px-1 rounded">POST /api/seed</code> first if not available.
            <br />
            <span className="block mt-1">
              Quick login link: <code className="bg-slate-100 px-1 rounded">/login?demo=1</code>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
