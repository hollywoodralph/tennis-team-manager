# PhotogRalph Tennis Team Manager

## Overview
A web application for managing tennis practice sessions and player development for kids from beginner level onward. Built with Next.js 15, TypeScript, Tailwind CSS v4, and Supabase.

## Live URL
- https://tennis.photogralph.com (via Cloudflare Tunnel)

## Local Dev
```bash
cd /Users/ralph/tennis-workspace/apps/tennis-team-manager
npm install
npm run dev        # runs on localhost:3040
```

## Environment Variables
Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

If Supabase credentials are not available, the app runs in **Dev/Mock Mode** with full UI and demo data.

## User Roles
1. Owner/Admin - Full control
2. Coach - Practices, attendance, assessments
3. Parent/Guardian - View own child only
4. Assistant Coach/Volunteer - Limited attendance
5. Read-only Family Viewer

## Features
- Dashboard with stats and quick actions
- Player roster with search, filters, CSV import/export
- Player profiles with attendance, progress, assessments
- Skill assessment system (1-5 ratings, 16 skills)
- Tennis development pathway (Red/Orange/Green/Yellow)
- Practice session scheduling and attendance
- Practice plan builder with original drills
- Progress reports (print-friendly)
- Parent portal (privacy-first)
- Communication center (announcements)
- Groups/classes management
- Badges and motivation
- Admin settings
- AI-assisted practice plan and report drafting

## Safety & Privacy
- No direct coach-to-child messaging
- All communication goes to parents
- Minimal child data storage
- Emergency contacts, allergy/medical notes with restricted visibility
- Consent tracking for photos, videos, medical emergency authorization
- Audit logs for sensitive changes
- Soft delete/archive for players
- Row Level Security on all data

## Cloudflare Tunnel
The tunnel config is at `/Users/ralph/.cloudflared/tennis-config.yml`. Start with:
```bash
cloudflared tunnel --config /Users/ralph/.cloudflared/tennis-config.yml run TENNIS_TUNNEL_ID
```

## Architecture
- Next.js App Router (src/app)
- Supabase for auth, database, storage
- Tailwind CSS v4 for styling
- Lucide React for icons
- Recharts for charts
- date-fns for date formatting
- Mock data layer for offline dev mode
- Role-based access control via React Context

## Data Model
Supabase tables: users, profiles, roles, children, guardians, player_guardians, groups, coaches, sessions, session_attendance, skill_assessments, skill_assessment_items, progress_reports, announcements, messages, message_recipients, consents, badges, player_badges, practice_plans, drills, locations, audit_logs, app_settings.

## Testing
Manual QA checklist in `/qa-checklist.md`.

## License
MIT (for family use)
