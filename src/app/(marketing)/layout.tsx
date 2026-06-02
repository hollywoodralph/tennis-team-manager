import { Metadata } from "next";

export const metadata: Metadata = {
  title: "PhotogRalph Tennis Team Manager — Run your academy like a pro",
  description: "Roster, sessions, assessments, badges, payments, and parent communication in one place. Built for youth tennis academies.",
  openGraph: {
    title: "PhotogRalph Tennis Team Manager",
    description: "Run your tennis academy like a pro. Try the demo.",
    type: "website",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
