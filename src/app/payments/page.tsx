"use client";

import { useMemo, useState } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DollarSign, CheckCircle2, XCircle, CreditCard, Mail, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentRecord } from "@/lib/types";
import Link from "next/link";

const DEFAULT_FEES: Record<string, number> = {
  red: 40,
  orange: 50,
  green: 60,
  yellow: 70,
};

function getRecord(payments: Record<string, PaymentRecord>, playerId: string, stage: string): PaymentRecord {
  return (
    payments[playerId] ?? {
      monthlyFee: DEFAULT_FEES[stage] ?? 50,
      paid: false,
      lastPaidDate: null,
    }
  );
}

function formatCurrency(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PaymentsPage() {
  const { players, payments, updatePayment, markPaymentPaid, showToast } = useData();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "coach";
  const isParent = user?.role === "parent" || user?.role === "viewer";

  // For parents, only show their children
  const visiblePlayers = useMemo(() => {
    if (isParent) {
      return players.filter((p) => p.status === "active" && (user?.child_ids ?? []).includes(p.id));
    }
    return players.filter((p) => p.status === "active");
  }, [players, isParent, user?.child_ids]);

  const [editing, setEditing] = useState<{ playerId: string; fee: number; paid: boolean; lastPaidDate: string | null } | null>(null);
  const [reminder, setReminder] = useState<{ playerId: string; playerName: string; guardianEmail: string | null } | null>(null);

  const summary = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let outstanding = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    visiblePlayers.forEach((p) => {
      const record = getRecord(payments, p.id, p.skill_stage);
      totalExpected += record.monthlyFee;
      if (record.paid) {
        totalCollected += record.monthlyFee;
        paidCount++;
      } else {
        outstanding += record.monthlyFee;
        unpaidCount++;
      }
    });

    return {
      totalExpected,
      totalCollected,
      outstanding,
      paidCount,
      unpaidCount,
      collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
    };
  }, [visiblePlayers, payments]);

  const openEdit = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const record = getRecord(payments, playerId, player.skill_stage);
    setEditing({
      playerId,
      fee: record.monthlyFee,
      paid: record.paid,
      lastPaidDate: record.lastPaidDate,
    });
  };

  const saveEdit = () => {
    if (!editing) return;
    updatePayment(editing.playerId, {
      monthlyFee: editing.fee,
      paid: editing.paid,
      lastPaidDate: editing.lastPaidDate,
    });
    showToast("Payment updated", "success");
    setEditing(null);
  };

  const sendReminder = (playerId: string) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const guardian = player.guardians.find((g) => g.is_primary) ?? player.guardians[0];
    setReminder({ playerId, playerName: `${player.first_name} ${player.last_name}`, guardianEmail: guardian?.email ?? null });
  };

  const confirmReminder = () => {
    showToast(`Reminder sent to ${reminder?.guardianEmail ?? "guardian"}`, "success");
    setReminder(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
          <p className="text-sm text-slate-500">{isAdmin ? "Track monthly fees across the roster" : "Your billing summary"}</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryCard
            icon={DollarSign}
            label="Collected"
            value={formatCurrency(summary.totalCollected)}
            sub={`${summary.paidCount} players paid`}
            color="bg-emerald-50 text-emerald-600"
          />
          <SummaryCard
            icon={XCircle}
            label="Outstanding"
            value={formatCurrency(summary.outstanding)}
            sub={`${summary.unpaidCount} unpaid`}
            color="bg-red-50 text-red-600"
          />
          <SummaryCard
            icon={TrendingUp}
            label="Collection Rate"
            value={`${summary.collectionRate}%`}
            sub="this month"
            color="bg-blue-50 text-blue-600"
          />
          <SummaryCard
            icon={Users}
            label="Active"
            value={visiblePlayers.length.toString()}
            sub="players"
            color="bg-tennis-50 text-tennis-600"
          />
        </div>

        {/* Players table */}
        {visiblePlayers.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={isParent ? "No children linked" : "No active players"}
            description={isParent ? "Contact your coach to link your child." : "Add players to start tracking payments."}
            action={
              !isParent ? (
                <Link
                  href="/roster/add"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-tennis-600 text-white rounded-lg text-sm font-medium hover:bg-tennis-700"
                >
                  Add Player
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Player</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Stage</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Monthly Fee</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Last Paid</th>
                    {isAdmin && <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {visiblePlayers.map((player) => {
                    const record = getRecord(payments, player.id, player.skill_stage);
                    return (
                      <tr key={player.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/roster/${player.id}`} className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                              {player.first_name[0]}{player.last_name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 group-hover:text-tennis-600">
                                {player.preferred_name || player.first_name} {player.last_name}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="capitalize text-slate-600 text-xs font-medium">{player.skill_stage}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(record.monthlyFee)}</td>
                        <td className="px-4 py-3 text-center">
                          {record.paid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              <XCircle className="w-3 h-3" /> Unpaid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500">{formatDate(record.lastPaidDate)}</td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!record.paid && (
                                <button
                                  onClick={() => markPaymentPaid(player.id, record.monthlyFee)}
                                  className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors"
                                >
                                  Mark Paid
                                </button>
                              )}
                              <button
                                onClick={() => sendReminder(player.id)}
                                className="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200 transition-colors flex items-center gap-1"
                              >
                                <Mail className="w-3 h-3" /> Remind
                              </button>
                              <button
                                onClick={() => openEdit(player.id)}
                                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 rounded-md border border-slate-200 transition-colors"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Payment"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button onClick={saveEdit} className="px-4 py-2 rounded-lg text-sm font-medium bg-tennis-600 text-white hover:bg-tennis-700">
              Save
            </button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Monthly Fee (USD)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={editing.fee}
                onChange={(e) => setEditing({ ...editing, fee: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={editing.paid}
                onChange={(e) => setEditing({ ...editing, paid: e.target.checked, lastPaidDate: e.target.checked ? new Date().toISOString().split("T")[0] : editing.lastPaidDate })}
                className="w-4 h-4 accent-tennis-600"
              />
              Paid
            </label>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!reminder}
        onClose={() => setReminder(null)}
        onConfirm={confirmReminder}
        title="Send payment reminder?"
        message={`Send a payment reminder to the guardian of ${reminder?.playerName} at ${reminder?.guardianEmail ?? "their registered email"}?`}
        confirmLabel="Send Reminder"
      />
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-slate-800 truncate">{value}</p>
          <p className="text-xs text-slate-500 truncate">{label}</p>
          {sub && <p className="text-[10px] text-slate-400 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
