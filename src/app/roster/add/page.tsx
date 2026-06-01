"use client";
import { useState, useMemo } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import { useRouter } from "next/navigation";
import RouteGuard from "@/components/RouteGuard";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SkillStage, ExperienceLevel, PlayerStatus, DominantHand } from "@/lib/types";

type FormErrors = Record<string, string>;

function calcAge(dob: string): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

export default function AddPlayerPage() {
  const router = useRouter();
  const { addPlayer, groups, showToast } = useData();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    preferred_name: "",
    date_of_birth: "",
    age: "",
    skill_stage: "red" as SkillStage,
    experience_level: "new_beginner" as ExperienceLevel,
    dominant_hand: "right" as DominantHand,
    status: "active" as PlayerStatus,
    g1_full_name: "",
    g1_email: "",
    g1_phone: "",
    g1_relationship: "",
    g1_is_primary: true,
    g1_is_emergency_contact: true,
    g2_full_name: "",
    g2_email: "",
    g2_phone: "",
    g2_relationship: "",
    g2_is_primary: false,
    g2_is_emergency_contact: false,
    allergies: "None",
    medical_notes: "",
    photo_consent: false,
    video_consent: false,
    participation_consent: false,
    equipment_racket: false,
    equipment_shoes: false,
    equipment_water_bottle: false,
    group_id: "",
    shirt_size: "",
    coach_notes: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const update = (key: string, value: string | boolean) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === "date_of_birth") {
        const a = calcAge(value as string);
        next.age = a > 0 ? String(a) : "";
      }
      return next;
    });
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.first_name.trim()) e.first_name = "First name is required";
    if (!form.last_name.trim()) e.last_name = "Last name is required";
    if (!form.date_of_birth) e.date_of_birth = "Date of birth is required";
    if (!form.g1_full_name.trim()) e.g1_full_name = "Guardian 1 full name is required";
    if (!form.g1_email.trim()) e.g1_email = "Guardian 1 email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.g1_email)) e.g1_email = "Enter a valid email";
    if (!form.g1_phone.trim()) e.g1_phone = "Guardian 1 phone is required";
    if (!form.g1_relationship.trim()) e.g1_relationship = "Guardian 1 relationship is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const guardians = useMemo(() => {
    const list = [
      {
        id: `g-${Date.now()}-1`,
        full_name: form.g1_full_name.trim(),
        email: form.g1_email.trim(),
        phone: form.g1_phone.trim(),
        relationship: form.g1_relationship.trim(),
        is_primary: form.g1_is_primary,
        is_emergency_contact: form.g1_is_emergency_contact,
      },
    ];
    if (form.g2_full_name.trim()) {
      list.push({
        id: `g-${Date.now()}-2`,
        full_name: form.g2_full_name.trim(),
        email: form.g2_email.trim(),
        phone: form.g2_phone.trim(),
        relationship: form.g2_relationship.trim(),
        is_primary: form.g2_is_primary,
        is_emergency_contact: form.g2_is_emergency_contact,
      });
    }
    return list;
  }, [form]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast("Please fix the highlighted fields", "error");
      return;
    }
    const playerData = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      preferred_name: form.preferred_name.trim() || undefined,
      date_of_birth: form.date_of_birth,
      age: Number(form.age) || calcAge(form.date_of_birth),
      skill_stage: form.skill_stage,
      experience_level: form.experience_level,
      dominant_hand: form.dominant_hand,
      status: form.status,
      guardians,
      emergency_contact: guardians.find(g => g.is_emergency_contact),
      medical_notes: form.medical_notes.trim() || undefined,
      allergies: form.allergies.trim() || "None",
      photo_consent: form.photo_consent,
      video_consent: form.video_consent,
      participation_consent: form.participation_consent,
      coach_notes: form.coach_notes,
      group_id: form.group_id || undefined,
      shirt_size: form.shirt_size.trim() || undefined,
      equipment: {
        racket: form.equipment_racket,
        shoes: form.equipment_shoes,
        water_bottle: form.equipment_water_bottle,
      },
    };
    addPlayer(playerData);
    router.push("/roster");
  };

  const inputCls = (name: string) =>
    cn(
      "w-full px-3 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none transition-colors",
      errors[name] ? "border-red-300 focus:ring-red-300" : "border-slate-200"
    );

  const labelCls = "block text-xs font-medium text-slate-600 mb-1";
  const errorCls = "text-[11px] text-red-500 mt-0.5";

  return (
    <RouteGuard allowedRoles={["admin", "coach", "assistant"]}>
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        <Link href="/roster" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-tennis-600 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to roster
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Add New Player</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal */}
          <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Personal Information</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className={labelCls}>First Name *</label>
                <input type="text" value={form.first_name} onChange={e => update("first_name", e.target.value)} className={inputCls("first_name")} />
                {errors.first_name && <p className={errorCls}>{errors.first_name}</p>}
              </div>
              <div className="sm:col-span-1">
                <label className={labelCls}>Last Name *</label>
                <input type="text" value={form.last_name} onChange={e => update("last_name", e.target.value)} className={inputCls("last_name")} />
                {errors.last_name && <p className={errorCls}>{errors.last_name}</p>}
              </div>
              <div className="sm:col-span-1">
                <label className={labelCls}>Preferred Name</label>
                <input type="text" value={form.preferred_name} onChange={e => update("preferred_name", e.target.value)} className={inputCls("preferred_name")} />
              </div>
              <div className="sm:col-span-1">
                <label className={labelCls}>Date of Birth *</label>
                <input type="date" value={form.date_of_birth} onChange={e => update("date_of_birth", e.target.value)} className={inputCls("date_of_birth")} />
                {errors.date_of_birth && <p className={errorCls}>{errors.date_of_birth}</p>}
              </div>
              <div className="sm:col-span-1">
                <label className={labelCls}>Age</label>
                <input type="number" min={0} max={30} value={form.age} onChange={e => update("age", e.target.value)} className={inputCls("age")} />
              </div>
              <div className="sm:col-span-1">
                <label className={labelCls}>Skill Stage *</label>
                <select value={form.skill_stage} onChange={e => update("skill_stage", e.target.value)} className={inputCls("skill_stage")}>
                  <option value="red">Red Ball</option>
                  <option value="orange">Orange Ball</option>
                  <option value="green">Green Ball</option>
                  <option value="yellow">Yellow Ball</option>
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className={labelCls}>Experience Level</label>
                <select value={form.experience_level} onChange={e => update("experience_level", e.target.value)} className={inputCls("experience_level")}>
                  <option value="new_beginner">New Beginner</option>
                  <option value="beginner">Beginner</option>
                  <option value="developing">Developing</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced_youth">Advanced Youth</option>
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className={labelCls}>Dominant Hand</label>
                <select value={form.dominant_hand} onChange={e => update("dominant_hand", e.target.value)} className={inputCls("dominant_hand")}>
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className={labelCls}>Status</label>
                <select value={form.status} onChange={e => update("status", e.target.value)} className={inputCls("status")}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className={labelCls}>Group Assignment</label>
                <select value={form.group_id} onChange={e => update("group_id", e.target.value)} className={inputCls("group_id")}>
                  <option value="">None</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className={labelCls}>Shirt Size</label>
                <input type="text" placeholder="e.g. Youth M" value={form.shirt_size} onChange={e => update("shirt_size", e.target.value)} className={inputCls("shirt_size")} />
              </div>
            </div>
          </section>

          {/* Guardian 1 */}
          <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Guardian 1 *</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input type="text" value={form.g1_full_name} onChange={e => update("g1_full_name", e.target.value)} className={inputCls("g1_full_name")} />
                {errors.g1_full_name && <p className={errorCls}>{errors.g1_full_name}</p>}
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" value={form.g1_email} onChange={e => update("g1_email", e.target.value)} className={inputCls("g1_email")} />
                {errors.g1_email && <p className={errorCls}>{errors.g1_email}</p>}
              </div>
              <div>
                <label className={labelCls}>Phone *</label>
                <input type="tel" value={form.g1_phone} onChange={e => update("g1_phone", e.target.value)} className={inputCls("g1_phone")} />
                {errors.g1_phone && <p className={errorCls}>{errors.g1_phone}</p>}
              </div>
              <div>
                <label className={labelCls}>Relationship *</label>
                <input type="text" placeholder="e.g. mother, father" value={form.g1_relationship} onChange={e => update("g1_relationship", e.target.value)} className={inputCls("g1_relationship")} />
                {errors.g1_relationship && <p className={errorCls}>{errors.g1_relationship}</p>}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.g1_is_primary} onChange={e => update("g1_is_primary", e.target.checked)} className="w-4 h-4 accent-tennis-600" />
                  Primary Contact
                </label>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.g1_is_emergency_contact} onChange={e => update("g1_is_emergency_contact", e.target.checked)} className="w-4 h-4 accent-tennis-600" />
                  Emergency Contact
                </label>
              </div>
            </div>
          </section>

          {/* Guardian 2 */}
          <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Guardian 2 (Optional)</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" value={form.g2_full_name} onChange={e => update("g2_full_name", e.target.value)} className={inputCls("g2_full_name")} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.g2_email} onChange={e => update("g2_email", e.target.value)} className={inputCls("g2_email")} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="tel" value={form.g2_phone} onChange={e => update("g2_phone", e.target.value)} className={inputCls("g2_phone")} />
              </div>
              <div>
                <label className={labelCls}>Relationship</label>
                <input type="text" placeholder="e.g. mother, father" value={form.g2_relationship} onChange={e => update("g2_relationship", e.target.value)} className={inputCls("g2_relationship")} />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.g2_is_primary} onChange={e => update("g2_is_primary", e.target.checked)} className="w-4 h-4 accent-tennis-600" />
                  Primary Contact
                </label>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.g2_is_emergency_contact} onChange={e => update("g2_is_emergency_contact", e.target.checked)} className="w-4 h-4 accent-tennis-600" />
                  Emergency Contact
                </label>
              </div>
            </div>
          </section>

          {/* Medical */}
          <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Medical & Safety</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Allergies</label>
                <textarea rows={3} value={form.allergies} onChange={e => update("allergies", e.target.value)} className={inputCls("allergies")} placeholder="List any allergies or write 'None'"></textarea>
              </div>
              <div>
                <label className={labelCls}>Medical Notes</label>
                <textarea rows={3} value={form.medical_notes} onChange={e => update("medical_notes", e.target.value)} className={inputCls("medical_notes")} placeholder="EpiPen location, asthma, etc."></textarea>
              </div>
            </div>
          </section>

          {/* Consent */}
          <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Consents</h2>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.photo_consent} onChange={e => update("photo_consent", e.target.checked)} className="w-4 h-4 accent-tennis-600" />
                Photo Consent
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.video_consent} onChange={e => update("video_consent", e.target.checked)} className="w-4 h-4 accent-tennis-600" />
                Video Consent
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.participation_consent} onChange={e => update("participation_consent", e.target.checked)} className="w-4 h-4 accent-tennis-600" />
                Participation / Medical Consent
              </label>
            </div>
          </section>

          {/* Equipment */}
          <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Equipment</h2>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.equipment_racket} onChange={e => update("equipment_racket", e.target.checked)} className="w-4 h-4 accent-tennis-600" />
                Racket
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.equipment_shoes} onChange={e => update("equipment_shoes", e.target.checked)} className="w-4 h-4 accent-tennis-600" />
                Shoes
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.equipment_water_bottle} onChange={e => update("equipment_water_bottle", e.target.checked)} className="w-4 h-4 accent-tennis-600" />
                Water Bottle
              </label>
            </div>
          </section>

          {/* Coach Notes */}
          <section className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Coach Notes</h2>
            <textarea rows={4} value={form.coach_notes} onChange={e => update("coach_notes", e.target.value)} className={inputCls("coach_notes")} placeholder="Initial observations, strengths, areas for improvement..."></textarea>
          </section>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              {Object.keys(errors).length > 0 && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-500">Please correct {Object.keys(errors).length} field(s)</span>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <Link href="/roster" className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</Link>
              <button type="submit" className="px-4 py-2 bg-tennis-600 text-white rounded-lg text-sm font-medium hover:bg-tennis-700">Add Player</button>
            </div>
          </div>
        </form>
      </main>
   </div>
    </RouteGuard>
 );
}
