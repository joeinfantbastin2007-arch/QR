import React, { useState, useEffect, useRef } from "react";
import { 
  GraduationCap, QrCode, Scan, KeyRound, MapPin, 
  MapPinOff, History, CheckCircle, AlertTriangle, 
  RefreshCw, LogOut, ShieldCheck, UserCheck, ShieldAlert 
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import confetti from "canvas-confetti";

interface StudentDashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
}

export default function StudentDashboard({ token, user, onLogout }: StudentDashboardProps) {
  const [profile, setProfile] = useState<any>(null);
  const [overallPercentage, setOverallPercentage] = useState(0);
  const [subjectAnalytics, setSubjectAnalytics] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [sessionCode, setSessionCode] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [geofence, setGeofence] = useState<any>(null);
  const [gpsRequesting, setGpsRequesting] = useState(false);

  // Camera State
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [html5Qrcode, setHtml5Qrcode] = useState<Html5Qrcode | null>(null);

  // Status logs
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetchDashboardData();
    fetchGeofence();
    requestLocation();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/dashboard", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setProfile(data.profile);
        setOverallPercentage(data.overallPercentage);
        setSubjectAnalytics(data.subjectAnalytics);
        setHistory(data.history);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeofence = async () => {
    try {
      const res = await fetch("/api/admin/geofence", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setGeofence(data);
      }
    } catch (_) {}
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    setGpsRequesting(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGpsError(null);
        setGpsRequesting(false);
      },
      (error) => {
        setGpsRequesting(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError("Location permission denied. Please allow location access in your browser settings to verify geofence.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError("Location information is unavailable on your device.");
            break;
          case error.TIMEOUT:
            setGpsError("Request to verify user location timed out.");
            break;
          default:
            setGpsError("An unknown GPS error occurred.");
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionCode.trim()) return;

    await submitAttendance({ session_code: sessionCode.trim() });
  };

  const submitAttendance = async (params: { session_code?: string; qr_token?: string }) => {
    if (coords.lat === undefined || coords.lng === undefined) {
      setNotification({
        type: "error",
        text: "GPS Coordinates are required. Please tap 'Retry Fetch GPS' and allow location access."
      });
      return;
    }

    setSubmitting(true);
    setNotification(null);

    // Simple device fingerprint (combination of user agent and languages)
    const browserFingerprint = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`;

    try {
      const res = await fetch("/api/student/attendance/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...params,
          latitude: coords.lat,
          longitude: coords.lng,
          device_fingerprint: browserFingerprint
        })
      });

      const data = await res.json();
      if (res.ok) {
        setNotification({ type: "success", text: data.message });
        setSessionCode("");
        // trigger confetti!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        // refresh stats
        fetchDashboardData();
        // Stop scanning if camera is running
        if (scanning) {
          stopScanner();
        }
      } else {
        setNotification({ type: "error", text: data.error || "Failed to mark attendance." });
      }
    } catch (err) {
      setNotification({ type: "error", text: "Network error occurred. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // Scanner controls
  const startScanner = async () => {
    setScanning(true);
    setScanError(null);
    setNotification(null);

    // Give standard DOM render time
    setTimeout(async () => {
      try {
        const qrScanner = new Html5Qrcode("reader");
        scannerRef.current = qrScanner;
        setHtml5Qrcode(qrScanner);

        await qrScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const min = Math.min(width, height);
              return { width: Math.round(min * 0.7), height: Math.round(min * 0.7) };
            }
          },
          async (decodedText) => {
            // Success scanning QR code
            // Expected qr code payload is either the raw qr_token (starts with "qr_") or session_code
            if (decodedText.startsWith("qr_")) {
              await submitAttendance({ qr_token: decodedText });
            } else {
              await submitAttendance({ session_code: decodedText });
            }
          },
          (errorMessage) => {
            // Keep silent unless critical
          }
        );
      } catch (err: any) {
        console.error(err);
        setScanError("Failed to access camera. Check device permissions or insert code manually below.");
        setScanning(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Camera stop issue", err);
      }
    }
    setScanning(false);
    setHtml5Qrcode(null);
  };

  // Helper calculation for mock visual geofence distance
  const getMockDistanceDisplay = () => {
    if (!coords.lat || !geofence) return null;
    const R = 6371e3;
    const p1 = coords.lat * Math.PI / 180;
    const p2 = geofence.latitude * Math.PI / 180;
    const dp = (geofence.latitude - coords.lat) * Math.PI / 180;
    const dl = (geofence.longitude - (coords.lng || 0)) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = Math.round(R * c);

    const match = dist <= geofence.radius_meters;
    return {
      distance: dist,
      isOk: match,
      text: match 
        ? `Within geofence limit (~${dist} meters from hub)` 
        : `Outside geofence limit (~${dist} meters from classroom. Needs to be within ${geofence.radius_meters}m)`
    };
  };

  const distanceResult = getMockDistanceDisplay();

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans" id="student-container">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                S
              </div>
              <span className="font-semibold text-gray-900 tracking-tight font-display">
                SmartAttend Student Portal
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 flex items-center gap-1.5 no-print">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse"></span>
                Student Space
              </span>
              <button 
                id="student-logout-top-btn"
                onClick={onLogout}
                className="text-gray-500 hover:text-red-600 flex items-center gap-1.5 text-sm font-medium transition-colors"
                title="Log Out From Session"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-500 text-sm font-medium">Assembling student records...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          
          {/* Geolocation Guard alert */}
          <div className="mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${coords.lat ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"}`}>
                {coords.lat ? <MapPin className="h-5 w-5" /> : <MapPinOff className="h-5 w-5" />}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">GPS Location & Geofencing</h4>
                {coords.lat ? (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Verified Coordinates: <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[10px]">{coords.lat.toFixed(6)}, {coords.lng?.toFixed(6)}</code>
                    {distanceResult && (
                      <span className={`block mt-1 font-semibold ${distanceResult.isOk ? "text-green-600" : "text-red-600"}`}>
                        {distanceResult.text}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-red-600 font-medium mt-0.5" id="student-gps-alert-msg">
                    {gpsError || "Active student location is required to verify class geofence. Please fetch coordinates."}
                  </p>
                )}
              </div>
            </div>
            <button
              id="student-gps-refresh-btn"
              onClick={requestLocation}
              disabled={gpsRequesting}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${gpsRequesting ? "animate-spin" : ""}`} />
              {gpsRequesting ? "Fetching GPS..." : "Retry Fetch GPS"}
            </button>
          </div>

          {/* User notification Toast bar */}
          {notification && (
            <div 
              id="student-action-notification"
              className={`mb-6 p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
                notification.type === "success" 
                  ? "bg-green-50 border-green-100 text-green-800" 
                  : "bg-red-50 border-red-100 text-red-800"
              }`}
            >
              {notification.type === "success" ? (
                <ShieldCheck className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-semibold">{notification.type === "success" ? "Success" : "Attention"}</p>
                <p className="text-xs font-medium mt-0.5">{notification.text}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT SIDE: SCANNING AND CONTROLS */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 leading-tight">{profile?.name}</h3>
                    <p className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-wide">USN: {profile?.usn}</p>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block font-medium">Department</span>
                    <span className="text-gray-800 font-semibold mt-0.5 block">{profile?.department}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Semester / Sec</span>
                    <span className="text-gray-800 font-semibold mt-0.5 block">Sem {profile?.semester} — Sec {profile?.section}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Marker Controls */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="bg-blue-600 p-5 text-white">
                  <h4 className="font-semibold text-lg font-display">Mark Attendance</h4>
                  <p className="text-xs text-blue-100 mt-1">Use camera scanner or submit session code below</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Option A: Scan QR */}
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Option A: Smart Scan</span>
                    
                    {scanning ? (
                      <div className="space-y-4">
                        <div id="reader" className="overflow-hidden rounded-xl border border-gray-200 bg-black aspect-video flex items-center justify-center relative">
                          <p className="text-white text-xs z-10 font-mono animate-pulse">Initializing lens stream...</p>
                        </div>
                        <button
                          id="student-stop-scan-btn"
                          onClick={stopScanner}
                          className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl Transition cursor-pointer"
                        >
                          Cancel Camera Scan
                        </button>
                      </div>
                    ) : (
                      <button
                        id="student-start-scan-btn"
                        onClick={startScanner}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200/50 rounded-xl text-sm font-semibold transition"
                      >
                        <Scan className="h-5 w-5" />
                        Scan Dynamic QR Code
                      </button>
                    )}

                    {scanError && (
                      <div className="mt-3 text-xs bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 font-medium">
                        {scanError}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-gray-300">
                    <hr className="flex-1 border-gray-150" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Or</span>
                    <hr className="flex-1 border-gray-150" />
                  </div>

                  {/* Option B: Match Manual Code */}
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Option B: Session Code Entry</span>
                    <form onSubmit={handleManualCodeSubmit} className="space-y-3" id="student-code-submit-form">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <input
                          id="student-session-code-input"
                          type="text"
                          maxLength={6}
                          value={sessionCode}
                          onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                          placeholder="e.g. A7X4B9"
                          className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium tracking-wider placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                      <button
                        id="student-code-submit-btn"
                        type="submit"
                        disabled={submitting || !sessionCode.trim()}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white text-xs font-semibold rounded-xl transition"
                      >
                        {submitting ? "Validating security layer..." : "Verify & Log Attendance"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: PERFORMANCE STATISTICS AND HISTORY */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Performance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Overall Attendance Percentage meter */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between col-span-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Overall Average</span>
                  <div className="my-3 flex items-baseline gap-1.5">
                    <span className={`text-3xl font-extrabold font-display ${overallPercentage >= 75 ? "text-blue-600" : "text-amber-600"}`}>
                      {overallPercentage}%
                    </span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded font-bold uppercase">Target: 75%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${overallPercentage >= 75 ? "bg-blue-600" : "bg-amber-500"}`}
                      style={{ width: `${overallPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Subjekt logs or info */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs col-span-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Attendance Warning Rules</h4>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    According to University academic norms, students are required to maintain a minimum of 
                    <strong className="text-gray-800 font-semibold"> 75% attendance </strong> 
                    per subject. Falling below this threshold may restrict student criteria from examinations.
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-100">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Watch out for subjects flagged below 75% (orange markers).
                  </div>
                </div>
              </div>

              {/* Subject Breakdown list */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h4 className="font-semibold text-gray-900 text-sm font-display">Subject-wise Academic Attendance</h4>
                  <span className="text-xs text-gray-400 font-medium">DBMS, Java, Mathematics</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse" id="student-subject-breakdown-table">
                    <thead>
                      <tr className="border-b border-gray-150 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/20">
                        <th className="py-3 px-6">Subject Title</th>
                        <th className="py-3 px-6 text-center">Classes Run</th>
                        <th className="py-3 px-6 text-center">Attended</th>
                        <th className="py-3 px-6 text-right">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {subjectAnalytics.map((subj) => {
                        const low = subj.percentage < 75;
                        return (
                          <tr key={subj.subject_id} className="hover:bg-gray-50/50 transition">
                            <td className="py-3 px-6 font-semibold text-gray-900">{subj.subject_name}</td>
                            <td className="py-3 px-6 text-center text-gray-500 font-mono font-medium">{subj.total_sessions}</td>
                            <td className="py-3 px-6 text-center text-gray-500 font-mono font-medium">{subj.attended_sessions}</td>
                            <td className="py-3 px-6 text-right font-mono">
                              <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-block ${
                                low 
                                  ? "bg-amber-50 text-amber-700 border border-amber-100" 
                                  : "bg-green-50 text-green-700 border border-green-100"
                              }`}>
                                {subj.percentage}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attendance Log History */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-gray-400" />
                    <h4 className="font-semibold text-gray-900 text-sm font-display">Recent Attendance History</h4>
                  </div>
                  <span className="text-[10px] bg-gray-100 text-gray-500 border border-gray-150 px-2 py-0.5 rounded-full font-mono">Real-time Verified Logs</span>
                </div>
                <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                  {history.length === 0 ? (
                    <p className="p-6 text-center text-xs text-gray-400">No attendance records verified yet.</p>
                  ) : (
                    history.map((log) => (
                      <div key={log.id} className="p-4 hover:bg-gray-50/50 transition flex justify-between items-center text-xs">
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-800">{log.subject}</p>
                          <p className="text-gray-400 text-[10px] font-medium flex items-center gap-1">
                            <span>{log.date}</span>
                            <span>•</span>
                            <span>{log.time}</span>
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-50 text-green-700 font-semibold text-[10px] border border-green-100">
                          <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
                          {log.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
