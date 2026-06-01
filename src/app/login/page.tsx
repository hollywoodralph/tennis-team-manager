"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TennisBallIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  { email: "admin@photogralph.com", label: "Admin", role: "admin", color: "bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100" },
  { email: "coach@photogralph.com", label: "Coach", role: "coach", color: "bg-tennis-50 border-tennis-200 hover:border-tennis-400 hover:bg-tennis-100" },
  { email: "parent@photogralph.com", label: "Parent", role: "parent", color: "bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-amber-100" },
  { email: "assistant@photogralph.com", label: "Assistant", role: "assistant", color: "bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password, "demo");
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError("");
    setEmail(demoEmail);
    setPassword("password");
    setLoading(true);
    const result = await login(demoEmail, "password", "demo");
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-tennis-100 flex items-center justify-center">
            <TennisBallIcon className="w-8 h-8 text-tennis-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">PhotogRalph Tennis</h1>
        <p className="text-center text-slate-500 mb-6">Team Manager</p>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tennis-400 focus:border-transparent outline-none"
              placeholder="admin@photogralph.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tennis-400 focus:border-transparent outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={cn("w-full py-2.5 px-4 rounded-lg text-white font-medium transition-colors",
              loading ? "bg-slate-400 cursor-not-allowed" : "bg-tennis-600 hover:bg-tennis-700"
            )}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-xs text-center text-slate-500 mb-3 font-medium uppercase tracking-wide">Demo Accounts — Click Any Card to Log In</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                type="button"
                key={account.email}
                onClick={() => handleDemoLogin(account.email)}
                disabled={loading}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all text-left flex flex-col gap-1",
                  loading 
                    ? "opacity-50 cursor-not-allowed" 
                    : account.color + " cursor-pointer shadow-sm hover:shadow-md"
                )}
              >
                <span className="font-bold text-sm text-slate-800 pointer-events-none">{account.label}</span>
                <span className="text-[10px] text-slate-500 font-medium pointer-events-none">{account.email}</span>
                <span className="text-[10px] text-slate-400 pointer-events-none">Pass: password</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
