"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/DataContext";

export default function SignupPage() {
  const { signup } = useAuth();
  const { showToast } = useData();
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "coach" as "coach" | "parent" | "admin" | "assistant",
    organizationName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const result = await signup({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      role: form.role,
      organizationName: form.organizationName || undefined,
    });
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      showToast("Welcome to PhotogRalph Tennis!", "success");
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-tennis-100 flex items-center justify-center text-2xl">🎾</div>
        </div>
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-1">Create your account</h1>
        <p className="text-center text-slate-500 mb-6 text-sm">Run your tennis academy in minutes</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tennis-400 outline-none"
              placeholder="Coach Sarah"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tennis-400 outline-none"
              placeholder="you@academy.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tennis-400 outline-none"
                placeholder="8+ characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tennis-400 outline-none"
                placeholder="Repeat"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">I'm a...</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as any })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tennis-400 outline-none bg-white"
            >
              <option value="coach">Coach / Director</option>
              <option value="admin">Admin / Owner</option>
              <option value="assistant">Assistant / Intern</option>
              <option value="parent">Parent</option>
            </select>
          </div>
          {(form.role === "coach" || form.role === "admin" || form.role === "assistant") && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Academy / Organization name</label>
              <input
                type="text"
                value={form.organizationName}
                onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-tennis-400 outline-none"
                placeholder="Riverside Tennis Academy"
              />
              <p className="text-xs text-slate-400 mt-1">Parents can leave this blank.</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-2.5 px-4 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2",
              loading ? "bg-slate-400 cursor-not-allowed" : "bg-tennis-600 hover:bg-tennis-700"
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-tennis-600 font-medium hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
