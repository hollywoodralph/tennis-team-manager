"use client";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: "default" | "card" | "subtle";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variant === "card" && "bg-white rounded-xl border border-slate-100 shadow-sm p-8",
        variant === "subtle" && "py-6",
        variant === "default" && "py-10 px-4",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3",
            variant === "subtle" && "w-10 h-10"
          )}
        >
          <Icon className={cn("w-6 h-6 text-slate-400", variant === "subtle" && "w-5 h-5")} />
        </div>
      )}
      <h3 className={cn("font-semibold text-slate-700", variant === "subtle" ? "text-sm" : "text-base")}>
        {title}
      </h3>
      {description && (
        <p className={cn("text-slate-500 mt-1 max-w-sm", variant === "subtle" ? "text-xs" : "text-sm")}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
