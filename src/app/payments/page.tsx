"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn, stageBgClass, stageTextClass } from "@/lib/utils";
import { DollarSign, CheckCircle2, XCircle, CreditCard } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PaymentRecord {
  monthlyFee: number;
  paid: boolean;
  lastPaidDate: string | null;
}

type PaymentState = Record<string, PaymentRecord>;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LS_KEY = "tennis_payments_v1";

const DEFAULT_FEES: Record<string, number> = {
  red: 40,
  orange: 50,
  green: 60,
  yellow: 70,
};

function getTodayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function loadPayments(): PaymentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PaymentState;
  } catch {
    return null;
  }
}

function savePayments(state: PaymentState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PaymentsPage() {
  const { players } = useData();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin" || user?.role === "coach";

  const [payments, setPayments] = useState<PaymentState>({});
  const [mounted, setMounted] = useState(false);

  /* Initialize from localStorage + defaults */
  useEffect(() => {
    setMounted(true);
    const saved = loadPayments();
    const initial: PaymentState = {};

    players
      .filter((p) => p.status === "active")
      .forEach((p) => {
        const savedRecord = saved?.[p.id];
        initial[p.id] = {
          monthlyFee:
            savedRecord?.monthlyFee ?? DEFAULT_FEES[p.skill_stage] ?? 50,
          paid: savedRecord?.paid ?? false,
          lastPaidDate: savedRecord?.lastPaidDate ?? null,
        };
      });

    setPayments(initial);
  }, [players]);

  /* Persist on change */
  useEffect(() => {
    if (mounted) {
      savePayments(payments);
    }
  }, [payments, mounted]);

  const activePlayers = useMemo(
    () => players.filter((p) => p.status === "active"),
    [players]
  );

  const summary = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let outstanding = 0;

    activePlayers.forEach((p) => {
      const record = payments[p.id];
      const fee = record?.monthlyFee ?? DEFAULT_FEES[p.skill_stage] ?? 50;
      totalExpected += fee;
      if (record?.paid) {
        totalCollected += fee;
      } else {
        outstanding += fee;
      }
    });

    const rate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    return { totalExpected, totalCollected, outstanding, rate };
  }, [activePlayers, payments]);

  const markPaid = useCallback((playerId: string) => {
    setPayments((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        paid: true,
        lastPaidDate: getTodayIso(),
      },
    }));
  }, []);

  const markUnpaid = useCallback((playerId: string) => {
    setPayments((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        paid: false,
        lastPaidDate: null,
      },
    }));
  }, []);

  const togglePaid = useCallback(
    (playerId: string) => {
      const record = payments[playerId];
      if (record?.paid) {
        markUnpaid(playerId);
      } else {
        markPaid(playerId);
      }
    },
    [payments, markPaid, markUnpaid]
  );

  const markAllPaid = useCallback(() => {
    setPayments((prev) => {
      const next: PaymentState = { ...prev };
      activePlayers.forEach((p) => {
        next[p.id] = {
          ...next[p.id],
          paid: true,
          lastPaidDate: getTodayIso(),
        };
      });
      return next;
    });
  }, [activePlayers]);

  const updateFee = useCallback((playerId: string, value: string) => {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return;
    setPayments((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        monthlyFee: num,
      },
    }));
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DemoNav />
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          <p className="text-sm text-slate-500">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Payment Tracking</h1>
            <p className="text-sm text-slate-500">
              {activePlayers.length} active players
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={markAllPaid}
              className="flex items-center gap-1.5 px-4 py-2 bg-tennis-600 text-white rounded-lg text-sm font-medium hover:bg-tennis-700"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark All Paid
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <SummaryCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Total Expected"
            value={formatCurrency(summary.totalExpected)}
            tone="slate"
          />
          <SummaryCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Total Collected"
            value={formatCurrency(summary.totalCollected)}
            tone="green"
          />
          <SummaryCard
            icon={<XCircle className="w-4 h-4" />}
            label="Outstanding"
            value={formatCurrency(summary.outstanding)}
            tone="red"
          />
          <SummaryCard
            icon={<CreditCard className="w-4 h-4" />}
            label="Collection Rate"
            value={`${summary.rate.toFixed(1)}%`}
            tone="tennis"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Player Name
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Stage
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Monthly Fee
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Paid Status
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Last Paid Date
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {activePlayers.map((player) => {
                  const record = payments[player.id];
                  const fee = record?.monthlyFee ?? DEFAULT_FEES[player.skill_stage] ?? 50;
                  const paid = record?.paid ?? false;
                  const lastPaid = record?.lastPaidDate;

                  return (
                    <tr
                      key={player.id}
                      className="border-b border-slate-50 hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                              player.skill_stage === "red"
                                ? "bg-red-100 text-red-700"
                                : player.skill_stage === "orange"
                                ? "bg-orange-100 text-orange-700"
                                : player.skill_stage === "green"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            )}
                          >
                            {(player.preferred_name || player.first_name).slice(0, 2)}
                          </div>
                          <span className="font-medium text-slate-800">
                            {player.preferred_name || player.first_name} {player.last_name}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full border capitalize text-xs font-medium",
                            stageBgClass(player.skill_stage),
                            stageTextClass(player.skill_stage)
                          )}
                        >
                          {player.skill_stage}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">$</span>
                            <input
                              type="number"
                              min={0}
                              value={fee}
                              onChange={(e) => updateFee(player.id, e.target.value)}
                              className="w-20 px-2 py-1 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                            />
                          </div>
                        ) : (
                          <span className="text-slate-700">{formatCurrency(fee)}</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => isAdmin && togglePaid(player.id)}
                          disabled={!isAdmin}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                            paid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200",
                            !isAdmin && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          {paid ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" /> Unpaid
                            </>
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {lastPaid ? (
                          <span className="text-xs">{lastPaid}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <button
                            onClick={() =>
                              paid ? markUnpaid(player.id) : markPaid(player.id)
                            }
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                              paid
                                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                : "bg-tennis-600 text-white hover:bg-tennis-700"
                            )}
                          >
                            {paid ? "Mark Unpaid" : "Mark Paid"}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">View only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {activePlayers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                      No active players found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Card Component                                             */
/* ------------------------------------------------------------------ */

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "slate" | "green" | "red" | "tennis";
}) {
  const toneClasses = {
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-red-50 text-red-700 border-red-100",
    tennis: "bg-tennis-50 text-tennis-700 border-tennis-100",
  };

  return (
    <div className={cn("rounded-xl border p-4", toneClasses[tone])}>
      <div className="flex items-center gap-2 mb-2 opacity-80">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
