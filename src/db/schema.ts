// Drizzle ORM schema for PhotogRalph Tennis Team Manager
// SQLite-compatible subset (works on Railway Postgres too)

import {
  pgTable, serial, text, varchar, integer, boolean,
  timestamp, date, jsonb, pgEnum, uuid, index, unique
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums (using pgEnum for type safety)
export const userRoleEnum = pgEnum("user_role", ["admin", "coach", "parent", "assistant", "viewer"]);
export const skillStageEnum = pgEnum("skill_stage", ["red", "orange", "green", "yellow"]);
export const playerStatusEnum = pgEnum("player_status", ["active", "paused", "archived"]);
export const sessionStatusEnum = pgEnum("session_status", ["scheduled", "confirmed", "cancelled", "rescheduled", "completed"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "late", "excused", "makeup_needed"]);
export const announcementAudienceEnum = pgEnum("announcement_audience", ["all", "group", "parent", "coach"]);

/* ----------------------------------------------------------------- */
/*  Tenants + Users                                                    */
/* ----------------------------------------------------------------- */

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: userRoleEnum("role").notNull().default("parent"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  emailIdx: index("users_email_idx").on(t.email),
}));

/* ----------------------------------------------------------------- */
/*  Roster: players, groups, guardians                                */
/* ----------------------------------------------------------------- */

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  ageRange: text("age_range"),
  stage: skillStageEnum("stage").notNull(),
  defaultCoachId: uuid("default_coach_id").references(() => users.id),
  capacity: integer("capacity").default(10),
  notes: text("notes"),
  color: text("color").default("#16a34a"),
});

export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  preferredName: text("preferred_name"),
  dateOfBirth: date("date_of_birth").notNull(),
  age: integer("age").notNull(),
  skillStage: skillStageEnum("skill_stage").notNull().default("red"),
  experienceLevel: text("experience_level").default("new_beginner"),
  dominantHand: text("dominant_hand").default("right"),
  status: playerStatusEnum("status").notNull().default("active"),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
  medicalNotes: text("medical_notes"),
  allergies: text("allergies"),
  photoConsent: boolean("photo_consent").default(false),
  videoConsent: boolean("video_consent").default(false),
  participationConsent: boolean("participation_consent").default(false),
  coachNotes: text("coach_notes").default(""),
  shirtSize: text("shirt_size"),
  equipment: jsonb("equipment").$type<{ racket?: boolean; shoes?: boolean; water_bottle?: boolean }>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  tenantIdx: index("players_tenant_idx").on(t.tenantId),
  groupIdx: index("players_group_idx").on(t.groupId),
}));

export const guardians = pgTable("guardians", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  fullName: text("full_name").notNull(),
  email: varchar("email", { length: 255 }),
  phone: text("phone"),
  relationship: text("relationship"),
  isPrimary: boolean("is_primary").default(false),
  isEmergencyContact: boolean("is_emergency_contact").default(false),
  // Optional link to a parent user account
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
});

export const playerGuardians = pgTable("player_guardians", {
  // Explicit join table (in case a player has multiple primary parents)
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  relationship: text("relationship"),
  isPrimary: boolean("is_primary").default(false),
}, (t) => ({
  pk: unique("player_guardian_pk").on(t.playerId, t.userId),
}));

/* ----------------------------------------------------------------- */
/*  Sessions, attendance, assessments                                 */
/* ----------------------------------------------------------------- */

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  date: date("date").notNull(),
  timeStart: text("time_start").notNull(),
  timeEnd: text("time_end").notNull(),
  location: text("location").notNull(),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
  coachIds: jsonb("coach_ids").$type<string[]>().default([]),
  capacity: integer("capacity").default(20),
  weatherStatus: text("weather_status"),
  notes: text("notes"),
  equipmentNeeded: jsonb("equipment_needed").$type<string[]>().default([]),
  theme: text("theme"),
  stageFocus: skillStageEnum("stage_focus"),
  sessionPlanId: uuid("session_plan_id"),
  status: sessionStatusEnum("status").notNull().default("scheduled"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  dateIdx: index("sessions_date_idx").on(t.date),
  tenantIdx: index("sessions_tenant_idx").on(t.tenantId),
}));

export const attendance = pgTable("attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }).notNull(),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  status: attendanceStatusEnum("status").notNull().default("present"),
  parentNotified: boolean("parent_notified").default(false),
  notes: text("notes"),
  checkedInBy: uuid("checked_in_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  sessionPlayerIdx: unique("attendance_session_player_idx").on(t.sessionId, t.playerId),
}));

export const skillAssessments = pgTable("skill_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  coachId: uuid("coach_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  overallStageRecommendation: skillStageEnum("overall_stage_recommendation"),
  coachApprovedStage: skillStageEnum("coach_approved_stage"),
  notes: text("notes"),
  items: jsonb("items").$type<Array<{ id: string; skillId: string; rating: number; notes?: string; evidence?: string; recommendedDrill?: string }>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const progressReports = pgTable("progress_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  currentStage: skillStageEnum("current_stage").notNull(),
  attendanceSummary: text("attendance_summary"),
  strengths: jsonb("strengths").$type<string[]>().default([]),
  improvements: jsonb("improvements").$type<string[]>().default([]),
  skillsToPractice: jsonb("skills_to_practice").$type<string[]>().default([]),
  coachComments: text("coach_comments"),
  homeActivities: jsonb("home_activities").$type<string[]>().default([]),
  badgesEarned: jsonb("badges_earned").$type<string[]>().default([]),
  nextMilestone: text("next_milestone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------------------------------------- */
/*  Badges, announcements, payments                                   */
/* ----------------------------------------------------------------- */

export const badgeDefinitions = pgTable("badge_definitions", {
  id: varchar("id", { length: 80 }).primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
});

export const playerBadges = pgTable("player_badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  badgeId: varchar("badge_id", { length: 80 }).references(() => badgeDefinitions.id).notNull(),
  awardedBy: uuid("awarded_by").references(() => users.id).notNull(),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
  notes: text("notes"),
});

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  audience: announcementAudienceEnum("audience").notNull().default("all"),
  groupId: uuid("group_id").references(() => groups.id, { onDelete: "set null" }),
  sentBy: uuid("sent_by").references(() => users.id).notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }).notNull(),
  monthlyFee: integer("monthly_fee").notNull().default(50), // in cents
  paid: boolean("paid").notNull().default(false),
  lastPaidDate: date("last_paid_date"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  playerIdx: unique("payments_player_idx").on(t.playerId),
}));

/* ----------------------------------------------------------------- */
/*  Practice Plans (AI-generated)                                     */
/* ----------------------------------------------------------------- */

export const practicePlans = pgTable("practice_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  stage: skillStageEnum("stage").notNull(),
  ageRange: text("age_range"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  numPlayers: integer("num_players").default(8),
  courts: integer("courts").default(1),
  theme: text("theme"),
  energyLevel: text("energy_level").default("medium"),
  warmup: jsonb("warmup").$type<Array<{ name: string; duration: number; description: string; coachingPoints: string[] }>>().default([]),
  mainDrills: jsonb("main_drills").$type<Array<{ name: string; duration: number; description: string; coachingPoints: string[] }>>().default([]),
  games: jsonb("games").$type<Array<{ name: string; duration: number; description: string; coachingPoints: string[] }>>().default([]),
  cooldown: jsonb("cooldown").$type<Array<{ name: string; duration: number; description: string; coachingPoints: string[] }>>().default([]),
  equipmentList: jsonb("equipment_list").$type<string[]>().default([]),
  safetyNotes: text("safety_notes"),
  parentTakeaway: text("parent_takeaway"),
  generatedBy: text("generated_by").default("ollama-cloud"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ----------------------------------------------------------------- */
/*  Messages (parent-coach chat)                                      */
/* ----------------------------------------------------------------- */

export const messageThreads = pgTable("message_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  playerId: uuid("player_id").references(() => players.id, { onDelete: "cascade" }),
  subject: text("subject"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
});

export const messageThreadMembers = pgTable("message_thread_members", {
  threadId: uuid("thread_id").references(() => messageThreads.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => ({
  pk: unique("thread_member_pk").on(t.threadId, t.userId),
}));

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").references(() => messageThreads.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readBy: jsonb("read_by").$type<string[]>().default([]),
  // Reactions: { emoji: [userId, ...] }, e.g. { "👍": ["u1","u2"], "❤️": ["u3"] }
  reactions: jsonb("reactions").$type<Record<string, string[]>>().default({}),
});

/* ----------------------------------------------------------------- */
/*  Settings                                                           */
/* ----------------------------------------------------------------- */

export const tenantSettings = pgTable("tenant_settings", {
  tenantId: uuid("tenant_id").primaryKey().references(() => tenants.id, { onDelete: "cascade" }),
  organizationName: text("organization_name").notNull(),
  primaryColor: text("primary_color").default("#16a34a"),
  logoUrl: text("logo_url"),
  locations: jsonb("locations").$type<string[]>().default([]),
  consentPhotoText: text("consent_photo_text"),
  consentVideoText: text("consent_video_text"),
  consentMedicalText: text("consent_medical_text"),
});

/* ----------------------------------------------------------------- */
/*  Auth sessions (JWT refresh token storage)                          */
/* ----------------------------------------------------------------- */

export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
