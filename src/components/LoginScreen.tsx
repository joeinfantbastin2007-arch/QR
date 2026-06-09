import React, { useState } from "react";
import { User, LogIn, ShieldAlert, KeyRound, CheckCircle2, GraduationCap, Briefcase, QrCode, Smartphone, Download, Share2 } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: any, role: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [role, setRole] = useState<"admin" | "faculty" | "student">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Quick seed logins for evaluators
  const testAccounts = {
    admin: { email: "admin@smartattend.edu", password: "admin123" },
    faculty: { email: "faculty@smartattend.edu", password: "faculty123" },
    student: { email: "alice@smartattend.edu", password: "student123" }
  };

  const handleQuickLogin = (selectedRole: "admin" | "faculty" | "student") => {
    setRole(selectedRole);
    setEmail(testAccounts[selectedRole].email);
    setPassword(testAccounts[selectedRole].password);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all credentials.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      // Pass success
      onLoginSuccess(data.token, data.user, role);
    } catch (err: any) {
      setError(err.message || "Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 font-sans" id="login-container">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex flex-col items-center justify-center" id="qrollcall-branding-header">
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-100 transition-transform duration-300 hover:scale-105" id="brand-logo-icon">
                <QrCode className="h-8 w-8 animate-pulse" />
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-lg bg-green-500 flex items-center justify-center text-white border-2 border-white shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-3 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700 tracking-wider uppercase font-mono">
              QRoll Call Platform
            </div>
          </div>
          <h2 className="mt-4 text-center text-2xl font-semibold tracking-tight text-gray-900 font-display" id="login-title">
            SmartAttend QR
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Secure, geofenced QR attendance management
          </p>
        </div>

        {/* Role Selectors */}
        <div className="grid grid-cols-3 gap-2" id="role-selector-group">
          <button
            type="button"
            id="role-btn-student"
            onClick={() => { setRole("student"); setError(null); }}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
              role === "student"
                ? "border-blue-600 bg-blue-50/50 text-blue-700 font-semibold"
                : "border-gray-200 hover:bg-gray-50 text-gray-600"
            }`}
          >
            <GraduationCap className="h-5 w-5 mb-1.5" />
            Student
          </button>
          <button
            type="button"
            id="role-btn-faculty"
            onClick={() => { setRole("faculty"); setError(null); }}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
              role === "faculty"
                ? "border-blue-600 bg-blue-50/50 text-blue-700 font-semibold"
                : "border-gray-200 hover:bg-gray-50 text-gray-600"
            }`}
          >
            <Briefcase className="h-5 w-5 mb-1.5" />
            Faculty
          </button>
          <button
            type="button"
            id="role-btn-admin"
            onClick={() => { setRole("admin"); setError(null); }}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
              role === "admin"
                ? "border-blue-600 bg-blue-50/50 text-blue-700 font-semibold"
                : "border-gray-200 hover:bg-gray-50 text-gray-600"
            }`}
          >
            <User className="h-5 w-5 mb-1.5" />
            Admin
          </button>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit} id="login-form">
          {error && (
            <div className="rounded-xl bg-red-50 p-4 border border-red-100 flex items-start gap-3" id="login-error-msg">
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 block">
              Academic Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <LogIn className="h-4 w-4" />
              </div>
              <input
                id="email-input"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@smartattend.edu"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 block">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                id="password-input"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <button
              id="login-btn-submit"
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? "Authenticating..." : "Sign In to Portal"}
            </button>
          </div>
        </form>

        {/* Instant evaluation helper */}
        <div className="pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-3">
            Developer Evaluation Seed Accounts
          </p>
          <div className="flex flex-wrap gap-2 justify-center" id="seed-accounts-quick-links">
            <button
              id="seed-student-btn"
              onClick={() => handleQuickLogin("student")}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            >
              👤 Alice (Student)
            </button>
            <button
              id="seed-faculty-btn"
              onClick={() => handleQuickLogin("faculty")}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            >
              💼 Prof. John (Faculty)
            </button>
            <button
              id="seed-admin-btn"
              onClick={() => handleQuickLogin("admin")}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
            >
              🛡️ Dean Admin (Admin)
            </button>
          </div>
        </div>

        {/* Phone Installation Action Drawer */}
        <div className="pt-5 mt-5 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowInstallGuide(!showInstallGuide)}
            className="w-full flex items-center justify-between text-xs font-bold text-blue-600 hover:text-blue-800 transition py-1 px-1.5 rounded-lg hover:bg-blue-50/50"
            id="mobile-install-toggle"
          >
            <span className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4" /> Install App on Your Phone
            </span>
            <span className={`text-[10px] uppercase font-mono tracking-wider transition ${showInstallGuide ? 'text-gray-400' : 'text-blue-500 font-bold'}`}>
              {showInstallGuide ? "Hide" : "Show Guide"}
            </span>
          </button>
          
          {showInstallGuide && (
            <div className="mt-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100 text-left animate-fade-in" id="mobile-install-instructions">
              <div className="flex items-center gap-2 mb-2 text-blue-800">
                <Download className="h-4 w-4" />
                <h4 className="text-[10px] font-bold font-display uppercase tracking-wider">Mobile Web Installation (PWA)</h4>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
                No App Store/Play Store required! Install this secure progressive app on your mobile device for direct, full-screen UI and rapid geofenced attendance check-ins.
              </p>
              
              <div className="space-y-3 text-[11px] text-gray-600">
                <div className="flex gap-2 items-start">
                  <div className="h-4 w-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">1</div>
                  <div>
                    <span className="font-semibold text-gray-800">For Apple iPhone (Safari browser):</span>
                    <p className="text-gray-500 leading-normal mt-0.5">
                      Tap the Safari <span className="inline-flex items-center gap-0.5 font-semibold bg-white border border-gray-200 text-gray-700 px-1 py-0.2 rounded text-[9px]"><Share2 className="h-2.5 w-2.5" /> Share</span> icon in Safari, scroll down and select <strong className="text-gray-800 font-semibold">"Add to Home Screen"</strong>, then tap Add.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 items-start border-t border-blue-100/50 pt-2">
                  <div className="h-4 w-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">2</div>
                  <div>
                    <span className="font-semibold text-gray-800">For Android (Chrome / Edge):</span>
                    <p className="text-gray-500 leading-normal mt-0.5">
                      Tap the standard browser <strong className="text-gray-800 font-semibold">three-dot menu</strong>, or select the prompt at the bottom of the screen. Tap <strong className="text-gray-800 font-semibold">"Install App"</strong> or <strong className="text-gray-800 font-semibold">"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
