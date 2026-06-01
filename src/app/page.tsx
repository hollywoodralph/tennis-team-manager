"use client";
import { useAuth } from "@/contexts/AuthContext";
import LoginPage from "./login/page";
import DashboardPage from "./dashboard/page";

export default function Home() {
  const { user } = useAuth();
  return user ? <DashboardPage /> : <LoginPage />;
}
