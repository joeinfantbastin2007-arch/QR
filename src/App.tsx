import React, { useState, useEffect } from "react";
import LoginScreen from "./components/LoginScreen";
import StudentDashboard from "./components/StudentDashboard";
import FacultyDashboard from "./components/FacultyDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { RefreshCw } from "lucide-react";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage on launch
    const storedToken = localStorage.getItem("smartattend_token");
    const storedRole = localStorage.getItem("smartattend_role");
    
    if (storedToken && storedRole) {
      validateSession(storedToken, storedRole);
    } else {
      setLoading(false);
    }
  }, []);

  const validateSession = async (storedToken: string, storedRole: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${storedToken}` }
      });
      const data = await res.json();
      if (res.ok) {
        setToken(storedToken);
        setUser(data.user);
        setRole(storedRole);
      } else {
        // Stale or invalid session token - clean storage
        handleLogout();
      }
    } catch (e) {
      console.error("Session verification failed", e);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (newToken: string, newUser: any, newRole: string) => {
    localStorage.setItem("smartattend_token", newToken);
    localStorage.setItem("smartattend_role", newRole);
    setToken(newToken);
    setUser(newUser);
    setRole(newRole);
  };

  const handleLogout = () => {
    localStorage.removeItem("smartattend_token");
    localStorage.removeItem("smartattend_role");
    setToken(null);
    setUser(null);
    setRole(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans">
        <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-widest">
          SmartAttend QR Gateway Loading...
        </p>
      </div>
    );
  }

  // Not authenticated view
  if (!token || !user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Authorized Views matching user roles
  if (role === "admin") {
    return <AdminDashboard token={token} user={user} onLogout={handleLogout} />;
  }

  if (role === "faculty") {
    return <FacultyDashboard token={token} user={user} onLogout={handleLogout} />;
  }

  if (role === "student") {
    return <StudentDashboard token={token} user={user} onLogout={handleLogout} />;
  }

  // Fallback cleanup
  return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
}
