// Types for the Tennis Team Manager

export type SkillStage = "red" | "orange" | "green" | "yellow";
export type ExperienceLevel = "new_beginner" | "beginner" | "developing" | "intermediate" | "advanced_youth";
export type PlayerStatus = "active" | "paused" | "archived";
export type DominantHand = "right" | "left" | "both";
export type SessionStatus = "scheduled" | "confirmed" | "cancelled" | "rescheduled" | "completed";
export type AttendanceStatus = "present" | "absent" | "late" | "excused" | "makeup_needed";

export interface Guardian {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  relationship: string;
  is_primary: boolean;
  is_emergency_contact: boolean;
}

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  date_of_birth: string;
  age: number;
  skill_stage: SkillStage;
  experience_level: ExperienceLevel;
  dominant_hand: DominantHand;
  guardians: Guardian[];
  emergency_contact?: Guardian;
  medical_notes?: string;
  allergies?: string;
  photo_consent: boolean;
  video_consent: boolean;
  participation_consent: boolean;
  coach_notes: string;
  status: PlayerStatus;
  group_id?: string;
  shirt_size?: string;
  equipment?: { racket?: boolean; shoes?: boolean; water_bottle?: boolean };
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  age_range: string;
  stage: SkillStage;
  default_coach_id?: string;
  default_schedule?: string;
  capacity: number;
  notes?: string;
  color: string;
}

export interface Session {
  id: string;
  title: string;
  date: string;
  time_start: string;
  time_end: string;
  location: string;
  group_id: string;
  coach_ids: string[];
  capacity: number;
  weather_status?: "good" | "fair" | "poor" | "unknown";
  notes?: string;
  equipment_needed?: string[];
  theme?: string;
  stage_focus?: SkillStage;
  session_plan_id?: string;
  status: SessionStatus;
  cancellation_reason?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  player_id: string;
  status: AttendanceStatus;
  parent_notified: boolean;
  notes?: string;
  checked_in_by?: string;
  created_at: string;
}

export interface SkillItem {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface SkillAssessment {
  id: string;
  player_id: string;
  coach_id: string;
  date: string;
  overall_stage_recommendation?: SkillStage;
  coach_approved_stage?: SkillStage;
  notes?: string;
  items: SkillAssessmentItem[];
  created_at: string;
}

export interface SkillAssessmentItem {
  id: string;
  assessment_id: string;
  skill_id: string;
  rating: number; // 1-5
  notes?: string;
  evidence?: string;
  recommended_drill?: string;
}

export interface ProgressReport {
  id: string;
  player_id: string;
  title: string;
  period_start: string;
  period_end: string;
  current_stage: SkillStage;
  attendance_summary: string;
  strengths: string[];
  improvements: string[];
  skills_to_practice: string[];
  coach_comments: string;
  home_activities: string[];
  badges_earned: string[];
  next_milestone?: string;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface PlayerBadge {
  id: string;
  player_id: string;
  badge_id: string;
  awarded_by: string;
  awarded_at: string;
  notes?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: "all" | "group" | "parent" | "coach";
  group_id?: string;
  sent_by: string;
  sent_at: string;
  read_count?: number;
}

export interface Drill {
  id: string;
  name: string;
  description: string;
  stage: SkillStage;
  duration_minutes: number;
  equipment: string[];
  min_players: number;
  max_players: number;
  category: string;
  instructions: string[];
  coaching_points: string[];
  adaptations?: string;
}

export interface PracticePlan {
  id: string;
  title: string;
  stage: SkillStage;
  age_range: string;
  duration_minutes: number;
  courts: number;
  theme: string;
  energy_level: "low" | "medium" | "high";
  warm_up: Drill[];
  main_drills: Drill[];
  games: Drill[];
  cool_down: Drill[];
  equipment_list: string[];
  safety_notes: string;
  parent_takeaway?: string;
  coach_evaluation_checklist: string[];
  created_by: string;
  created_at: string;
}

export interface AppSettings {
  organization_name: string;
  primary_color?: string;
  logo_url?: string;
  locations: string[];
  consent_photo_text?: string;
  consent_video_text?: string;
  consent_medical_text?: string;
}

export interface PaymentRecord {
  monthlyFee: number;
  paid: boolean;
  lastPaidDate: string | null;
}

export interface DashboardStats {
  total_players: number;
  active_players: number;
  today_sessions: number;
  upcoming_sessions: number;
  attendance_rate: number;
  players_needing_attention: number;
  recent_assessments: number;
  stage_distribution: Record<SkillStage, number>;
}

// Skill definitions (16 skills)
export const SKILL_DEFINITIONS: SkillItem[] = [
  { id: "athletic_readiness", name: "Athletic Readiness", category: "Physical", description: "Balance, movement, coordination" },
  { id: "listening_participation", name: "Listening and Participation", category: "Social", description: "Follows instructions, engages with group" },
  { id: "ready_position", name: "Ready Position", category: "Technical", description: "Athletic stance, racket position" },
  { id: "grip_awareness", name: "Grip Awareness", category: "Technical", description: "Knows different grips for different shots" },
  { id: "forehand", name: "Forehand", category: "Technical", description: "Controlled forehand stroke" },
  { id: "backhand", name: "Backhand", category: "Technical", description: "Controlled backhand stroke" },
  { id: "serve_foundation", name: "Serve / Overhand Throw", category: "Technical", description: "Basic serve motion and overhand throw" },
  { id: "volley", name: "Volley", category: "Technical", description: "Net volley technique" },
  { id: "rally_ability", name: "Rally Ability", category: "Tactical", description: "Sustained cooperative rally" },
  { id: "footwork", name: "Footwork", category: "Physical", description: "Movement patterns around court" },
  { id: "ball_tracking", name: "Ball Tracking", category: "Physical", description: "Follows ball with eyes, anticipates bounce" },
  { id: "court_awareness", name: "Court Awareness", category: "Tactical", description: "Understands court zones and positioning" },
  { id: "sportsmanship", name: "Sportsmanship", category: "Social", description: "Respects opponents, fair play" },
  { id: "confidence", name: "Confidence", category: "Social", description: "Attempts new skills, recovers from mistakes" },
  { id: "focus", name: "Focus", category: "Social", description: "Maintains attention during drills" },
  { id: "match_readiness", name: "Match / Play Readiness", category: "Tactical", description: "Understands scoring, can play mini-match" },
];

// Badge definitions
export const BADGE_DEFINITIONS: Badge[] = [
  { id: "first-rally", name: "First Rally", description: "Completed a 3-shot rally", icon: "trophy", color: "#eab308" },
  { id: "great-listener", name: "Great Listener", description: "Follows coach instructions consistently", icon: "ear", color: "#3b82f6" },
  { id: "footwork-star", name: "Footwork Star", description: "Excellent movement and positioning", icon: "footprints", color: "#f97316" },
  { id: "forehand-builder", name: "Forehand Builder", description: "Developing a strong forehand", icon: "hand", color: "#ef4444" },
  { id: "backhand-builder", name: "Backhand Builder", description: "Developing a strong backhand", icon: "hand-metal", color: "#8b5cf6" },
  { id: "serve-explorer", name: "Serve Explorer", description: "Practicing serve motion", icon: "rocket", color: "#10b981" },
  { id: "team-spirit", name: "Team Spirit", description: "Supports teammates positively", icon: "heart", color: "#ec4899" },
  { id: "sportsmanship-hero", name: "Sportsmanship Hero", description: "Shows outstanding fair play", icon: "award", color: "#eab308" },
  { id: "rally-record", name: "Rally Record", description: "Achieved a personal best rally", icon: "target", color: "#f97316" },
  { id: "ready-next-stage", name: "Ready for Next Stage", description: "Coach recommends moving up", icon: "arrow-up", color: "#16a34a" },
];

// Stage info
export const STAGE_INFO: Record<SkillStage, { name: string; color: string; bg: string; text: string; ballColor: string; description: string; }> = {
  red:   { name: "Red Ball",   color: "#ef4444", bg: "bg-red-50",   text: "text-red-700",   ballColor: "🔴", description: "Fun, coordination, basic contact, simple rally, listening, movement" },
  orange:{ name: "Orange Ball",color: "#f97316", bg: "bg-orange-50",text: "text-orange-700",ballColor: "🟠", description: "Controlled strokes, court positioning, cooperative rally, basic serve motion" },
  green: { name: "Green Ball", color: "#16a34a", bg: "bg-green-50",  text: "text-green-700", ballColor: "🟢", description: "Consistent rally, tactical awareness, directional control, point play" },
  yellow:{ name: "Yellow Ball",color: "#eab308", bg: "bg-yellow-50", text: "text-yellow-700",ballColor: "🟡", description: "Full-court readiness, serve consistency, match rules, scoring, strategy" },
};
