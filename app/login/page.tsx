"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getRoleFromEmail } from "@/lib/demoData";
import LoginBackground from "@/components/LoginBackground";
import { Brain, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCredential.user.uid;
      const userEmail = userCredential.user.email || email;

      // Try to get role from Firestore first, fallback to email-based detection
      let role: string | null = null;

      try {
        const userDoc = await getDoc(doc(db, "users", uid));
        if (userDoc.exists()) {
          role = userDoc.data().role as string;
        }
      } catch (firestoreErr) {
        // Firestore read failed (likely security rules) — fall back to email-based role
        console.warn("Firestore read failed, using email-based role detection:", firestoreErr);
      }

      // Fallback: derive role from email prefix
      if (!role) {
        role = getRoleFromEmail(userEmail);
      }

      if (!role) {
        setError("Unable to determine user role. Contact administrator.");
        setLoading(false);
        return;
      }

      // Store user info in localStorage for dashboard pages
      localStorage.setItem("np_user_role", role);
      localStorage.setItem("np_user_email", userEmail);
      localStorage.setItem("np_user_uid", uid);

      switch (role) {
        case "patient":
          router.push("/patient");
          break;
        case "doctor":
          router.push("/doctor");
          break;
        case "caregiver":
          router.push("/caregiver");
          break;
        default:
          setError("Invalid user role.");
          setLoading(false);
      }
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      if (errMsg.includes("auth/invalid-credential") || errMsg.includes("auth/wrong-password")) {
        setError("Invalid email or password.");
      } else if (errMsg.includes("auth/user-not-found")) {
        setError("No account found with this email.");
      } else if (errMsg.includes("auth/too-many-requests")) {
        setError("Too many attempts. Please wait and try again.");
      } else {
        setError(errMsg);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <LoginBackground />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-violet/20 border border-primary/10 mb-4">
            <Brain className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-primary to-violet bg-clip-text text-transparent">
            NeuroPulse AI
          </h1>
          <p className="text-muted text-sm mt-2">
            Real-time Health Monitoring System
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="np-card animate-slide-in"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="text-xl font-semibold mb-6 text-center">
            Sign In
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-alert-red/10 border border-alert-red/20 text-alert-red text-sm animate-fade-in">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm text-muted mb-1.5 font-medium"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="np-input"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm text-muted mb-1.5 font-medium"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="np-input pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="np-button np-button-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-card-border">
            <p className="text-xs text-muted-foreground text-center">
              Protected health monitoring system. Authorized access only.
            </p>
          </div>
        </form>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-safe-green animate-pulse" />
            <span>System Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-violet animate-pulse" />
            <span>HIPAA Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
