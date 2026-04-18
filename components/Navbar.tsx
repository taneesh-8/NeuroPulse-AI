"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { LogOut, Brain } from "lucide-react";

interface NavbarProps {
  role: "patient" | "doctor" | "caregiver";
  userName?: string;
}

const roleLabels = {
  patient: "Patient Dashboard",
  doctor: "Doctor Dashboard",
  caregiver: "Caregiver Dashboard",
};

const roleBadgeColors = {
  patient: "bg-primary/10 text-primary border-primary/20",
  doctor: "bg-violet/10 text-violet border-violet/20",
  caregiver: "bg-safe-green/10 text-safe-green border-safe-green/20",
};

export default function Navbar({ role, userName }: NavbarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-card-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-violet">
                <Brain className="w-5 h-5 text-background" />
              </div>
              <span className="font-display text-lg font-bold bg-gradient-to-r from-primary to-violet bg-clip-text text-transparent">
                NeuroPulse AI
              </span>
            </div>
            <div className="hidden sm:block h-6 w-px bg-card-border" />
            <span
              className={`hidden sm:inline-flex text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${roleBadgeColors[role]}`}
            >
              {roleLabels[role]}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {userName && (
              <span className="hidden sm:block text-sm text-muted">
                {userName}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="np-button text-sm py-2 px-3 bg-card border border-card-border text-muted hover:text-foreground hover:border-alert-red/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
