"use client";

import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { Shield, Loader2 } from "lucide-react";
import Link from "next/link";

interface RouteGuardProps {
  allowedRoles?: UserRole[];
  requireParentChild?: boolean;
  children: React.ReactNode;
}

export default function RouteGuard({ allowedRoles, requireParentChild, children }: RouteGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-tennis-600 animate-spin" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-800 mb-2">Please sign in</p>
          <p className="text-sm text-slate-500 mb-4">You need to be signed in to view this page.</p>
          <Link
            href="/login"
            className="px-4 py-2 bg-tennis-600 text-white rounded-lg text-sm font-medium hover:bg-tennis-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-sm text-slate-500 mb-4">You don&apos;t have permission to view this page.</p>
          <p className="text-xs text-slate-400 mb-6">
            Current role: <span className="font-medium text-slate-600 capitalize">{user.role}</span>
          </p>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-tennis-600 text-white rounded-lg text-sm font-medium hover:bg-tennis-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (requireParentChild && user.role === "parent" && (!user.child_ids || user.child_ids.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">No Children Linked</h1>
          <p className="text-sm text-slate-500">No children are linked to your account.</p>
          <p className="text-xs text-slate-400 mt-2">Contact an admin to link a child player to your account.</p>
          <Link
            href="/dashboard"
            className="inline-block mt-4 px-4 py-2 bg-tennis-600 text-white rounded-lg text-sm font-medium hover:bg-tennis-700"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
