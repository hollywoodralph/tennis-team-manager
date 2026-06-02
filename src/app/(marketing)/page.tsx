"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy, Users, Calendar, Award, BarChart3, Megaphone, ShieldCheck,
  ArrowRight, Check, Sparkles, Smartphone, Lock, Heart, Star, Zap,
  ClipboardList, DollarSign, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  { email: "admin@photogralph.com", label: "Admin", role: "admin", color: "from-blue-500 to-blue-600" },
  { email: "coach@photogralph.com", label: "Coach", role: "coach", color: "from-tennis-500 to-tennis-600" },
  { email: "parent@photogralph.com", label: "Parent", role: "parent", color: "from-amber-500 to-amber-600" },
  { email: "assistant@photogralph.com", label: "Assistant", role: "assistant", color: "from-purple-500 to-purple-600" },
];

const FEATURES = [
  {
    icon: Users,
    title: "Complete Roster Management",
    description: "Track every player, guardian, medical note, and consent in one place. 16-skill rubric across 4 stages.",
  },
  {
    icon: Calendar,
    title: "Smart Sessions & Attendance",
    description: "Schedule practices by group and stage. One-tap attendance with present, late, absent, excused tracking.",
  },
  {
    icon: BarChart3,
    title: "16-Skill Assessment Engine",
    description: "Evidence-based progress reports covering technical, physical, tactical, and social skills. Star ratings with coach notes.",
  },
  {
    icon: Award,
    title: "Badges & Motivation",
    description: "10 built-in achievements to celebrate every breakthrough — from first rally to sportsmanship hero.",
  },
  {
    icon: Megaphone,
    title: "Parent Communication",
    description: "Group, parent, or coach-only announcements. Read receipts, role targeting, audience controls.",
  },
  {
    icon: DollarSign,
    title: "Payment Tracking",
    description: "Monthly fee management, collection rate dashboard, one-click payment confirmations and reminders.",
  },
  {
    icon: Sparkles,
    title: "AI Practice Plans",
    description: "Generate stage-appropriate practice plans instantly. Drag-and-drop drills across warmup, main, games, cooldown.",
  },
  {
    icon: ClipboardList,
    title: "Progress Reports",
    description: "Auto-generated monthly reports with strengths, areas for improvement, and home activities for parents.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Parents get reminders. Coaches get alerts. Nobody misses a session, consent renewal, or payment deadline.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "Director, Riverside Tennis Academy",
    text: "Replaced three spreadsheets and a clipboard. Our coaches save 4 hours a week. Parents love the progress reports.",
  },
  {
    name: "Coach David R.",
    role: "Head Coach, 60 juniors",
    text: "The 16-skill assessment is genius. I can show parents exactly where their kid is and what we're working on next.",
  },
  {
    name: "Maria P.",
    role: "Parent of 2 players",
    text: "Finally I know when practice is, what my kids are learning, and whether their fees are paid. All in one app.",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    description: "For new academies testing the waters",
    features: ["Up to 15 players", "1 coach account", "Basic roster & sessions", "Demo data"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Academy",
    price: "$29",
    period: "per month",
    description: "For growing academies and clubs",
    features: ["Unlimited players", "5 coach accounts", "All features", "Payment tracking", "Email support"],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "tailored to you",
    description: "For multi-location academies and federations",
    features: ["Multi-academy", "Unlimited staff", "Custom branding", "SSO + API access", "Dedicated success manager"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function MarketingHome() {
  const { user, login, isLoading } = useAuth();
  const router = useRouter();
  const [demoOpen, setDemoOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (hydrated && !isLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isLoading, hydrated, router]);

  const handleDemoLogin = async (email: string) => {
    await login(email, "password");
    router.push("/dashboard");
  };

  if (!hydrated || (user && !isLoading)) {
    // Show a minimal loading state while we determine auth
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-tennis-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-tennis-500 to-tennis-700 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">PhotogRalph</p>
              <p className="text-[10px] text-slate-500 leading-tight">Tennis Team Manager</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-slate-600 hover:text-tennis-600">Features</a>
            <a href="#testimonials" className="text-sm text-slate-600 hover:text-tennis-600">Testimonials</a>
            <a href="#pricing" className="text-sm text-slate-600 hover:text-tennis-600">Pricing</a>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-tennis-600 text-white text-sm font-medium rounded-lg hover:bg-tennis-700"
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-block px-3 py-2 text-sm font-medium text-slate-600 hover:text-tennis-600"
                >
                  Sign In
                </Link>
                <button
                  onClick={() => setDemoOpen(true)}
                  className="px-4 py-2 bg-tennis-600 text-white text-sm font-medium rounded-lg hover:bg-tennis-700 flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> Try Demo
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-tennis-50 via-white to-amber-50" />
        <div className="absolute top-20 -right-20 w-96 h-96 bg-tennis-200 rounded-full opacity-20 blur-3xl -z-10" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-amber-200 rounded-full opacity-20 blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tennis-100 text-tennis-700 text-xs font-medium mb-4">
                <Zap className="w-3 h-3" /> Built for youth tennis academies
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-slate-800 leading-tight tracking-tight mb-4">
                Run your tennis academy
                <br />
                <span className="bg-gradient-to-r from-tennis-600 to-emerald-600 bg-clip-text text-transparent">
                  like a pro.
                </span>
              </h1>
              <p className="text-lg text-slate-600 mb-6 max-w-lg">
                Roster, sessions, assessments, badges, payments, and parent communication — everything coaches need in one place. Less paperwork, more tennis.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setDemoOpen(true)}
                  className="px-6 py-3 bg-tennis-600 text-white font-semibold rounded-xl hover:bg-tennis-700 flex items-center gap-2 shadow-lg shadow-tennis-600/20"
                >
                  <Sparkles className="w-4 h-4" /> Try the Demo
                </button>
                <a
                  href="#pricing"
                  className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 flex items-center gap-2"
                >
                  See Pricing <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-tennis-600" /> No credit card
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-tennis-600" /> 5-minute setup
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-tennis-600" /> Free forever
                </div>
              </div>
            </div>

            {/* Visual: stage color cards + ball */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 aspect-square flex flex-col justify-between">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-2xl">🔴</div>
                  <div>
                    <p className="text-xs font-semibold text-red-700">RED BALL</p>
                    <p className="text-[11px] text-red-600 mt-0.5">6-8 years • Fun & coordination</p>
                  </div>
                </div>
                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 aspect-square flex flex-col justify-between">
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-2xl">🟠</div>
                  <div>
                    <p className="text-xs font-semibold text-orange-700">ORANGE BALL</p>
                    <p className="text-[11px] text-orange-600 mt-0.5">8-10 years • Rally skills</p>
                  </div>
                </div>
                <div className="bg-tennis-50 border-2 border-tennis-200 rounded-2xl p-5 aspect-square flex flex-col justify-between">
                  <div className="w-10 h-10 rounded-full bg-tennis-500 flex items-center justify-center text-2xl">🟢</div>
                  <div>
                    <p className="text-xs font-semibold text-tennis-700">GREEN BALL</p>
                    <p className="text-[11px] text-tennis-600 mt-0.5">10-12 years • Match play</p>
                  </div>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5 aspect-square flex flex-col justify-between">
                  <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-2xl">🟡</div>
                  <div>
                    <p className="text-xs font-semibold text-yellow-700">YELLOW BALL</p>
                    <p className="text-[11px] text-yellow-600 mt-0.5">12+ years • Tournament ready</p>
                  </div>
                </div>
              </div>
              {/* Floating "demo" badge */}
              <div className="absolute -top-3 -right-3 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg rotate-6">
                <Sparkles className="w-3 h-3 inline -mt-0.5" /> 4 stages, 16 skills
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-3 text-sm text-slate-500">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-tennis-600" /> COPPA-aware data handling</div>
            <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-tennis-600" /> Role-based access control</div>
            <div className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-tennis-600" /> Mobile-first design</div>
            <div className="flex items-center gap-2"><Heart className="w-4 h-4 text-tennis-600" /> Built by coaches, for coaches</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-tennis-600 uppercase tracking-wider mb-2">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">Everything your academy needs</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From the first practice to the final match, PhotogRalph keeps your tennis academy running smoothly.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:border-tennis-200 transition-all">
                  <div className="w-11 h-11 rounded-xl bg-tennis-50 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-tennis-600" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-tennis-600 uppercase tracking-wider mb-2">Testimonials</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">Loved by coaches, parents & directors</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 leading-relaxed mb-4 text-sm">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-tennis-600 uppercase tracking-wider mb-2">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">Simple, transparent pricing</h2>
            <p className="text-slate-600">Start free. Upgrade when you grow.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "rounded-2xl p-6 border-2 transition-all",
                  plan.highlighted
                    ? "bg-gradient-to-b from-tennis-50 to-white border-tennis-400 shadow-xl shadow-tennis-500/10 scale-105"
                    : "bg-white border-slate-200"
                )}
              >
                {plan.highlighted && (
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-tennis-600 text-white text-xs font-semibold mb-3">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                <div className="mt-3 mb-1">
                  <span className="text-4xl font-bold text-slate-800">{plan.price}</span>
                  {plan.price !== "Free" && plan.price !== "Custom" && (
                    <span className="text-slate-500 ml-1">/ {plan.period}</span>
                  )}
                  {plan.price === "Custom" && (
                    <span className="text-slate-500 ml-1 text-sm">{plan.period}</span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mb-5">{plan.description}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-tennis-600 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setDemoOpen(true)}
                  className={cn(
                    "w-full py-2.5 rounded-lg text-sm font-semibold transition-colors",
                    plan.highlighted
                      ? "bg-tennis-600 text-white hover:bg-tennis-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-tennis-600 to-emerald-700 text-white">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to run your academy like a pro?</h2>
          <p className="text-tennis-100 mb-8 max-w-2xl mx-auto">
            Try the full demo with 4 role-based accounts. No signup. No credit card. See how PhotogRalph can transform your tennis program.
          </p>
          <button
            onClick={() => setDemoOpen(true)}
            className="px-8 py-3.5 bg-white text-tennis-700 font-bold rounded-xl hover:bg-tennis-50 inline-flex items-center gap-2 shadow-xl"
          >
            <Sparkles className="w-4 h-4" /> Launch the Demo
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50 py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-tennis-500 to-tennis-700 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-sm text-slate-600">© 2026 PhotogRalph Tennis Team Manager</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-tennis-600">Privacy</a>
            <a href="#" className="hover:text-tennis-600">Terms</a>
            <a href="#" className="hover:text-tennis-600">Contact</a>
            <Link href="/login" className="hover:text-tennis-600">Sign In</Link>
          </div>
        </div>
      </footer>

      {/* Demo modal */}
      {demoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Pick a demo role</h2>
                <p className="text-sm text-slate-500 mt-1">Each role shows a different view of the app</p>
              </div>
              <button onClick={() => setDemoOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  onClick={() => handleDemoLogin(account.email)}
                  className={cn(
                    "p-4 rounded-xl text-left text-white transition-all hover:scale-105 hover:shadow-lg",
                    "bg-gradient-to-br",
                    account.color
                  )}
                >
                  <p className="font-bold text-sm">{account.label}</p>
                  <p className="text-[10px] opacity-80 mt-0.5 truncate">{account.email}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">Pass: password</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 text-center mt-4">
              No data is sent anywhere. All changes are saved to your browser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
