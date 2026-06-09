import React, { useState, useEffect, useRef } from "react";
import { 
  Briefcase, PlusCircle, Play, Pause, Square, AlertCircle,
  Clock, RotateCcw, ArrowRight, Table, FileSpreadsheet, 
  Printer, CheckCircle2, XCircle, Search, RefreshCw, BarChart3,
  Calendar, Users, BookOpen, ChevronRight, LogOut, Download
} from "lucide-react";
import QRCode from "qrcode";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface FacultyDashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
}

export default function FacultyDashboard({ token, user, onLogout }: FacultyDashboardProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "generate" | "reports">("dashboard");

  // State
  const [subjects, setSubjects] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [subjectsSummary, setSubjectsSummary] = useState<any[]>([]);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Session State
  const [activeSession, setActiveSession] = useState<any>(null); // current running session
  const [activeSessionQrUrl, setActiveSessionQrUrl] = useState("");
  const [activeSessionRecords, setActiveSessionRecords] = useState<any[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Session Generator Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("6");
  const [selectedSection, setSelectedSection] = useState("A");
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [creatingSession, setCreatingSession] = useState(false);

  // Reports State
  const [reportsData, setReportsData] = useState<any[]>([]);
  const [selectedReportSubjectId, setSelectedReportSubjectId] = useState("");
  const [reportsSearchQuery, setReportsSearchQuery] = useState("");

  const countdownIntervalRef = useRef<any>(null);
  const pollingIntervalRef = useRef<any>(null);

  useEffect(() => {
    fetchDashboardDetails();
    fetchReportsDetails();
  }, [token]);

  // Clean intervals on unmount
  useEffect(() => {
    return () => {
      clearInterval(countdownIntervalRef.current);
      clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const fetchDashboardDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/faculty/dashboard", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTodaySessions(data.today_sessions || []);
        setRecentActivity(data.recent_activity || []);
        setSubjectsSummary(data.subjects_summary || []);
      }

      // Also list handled subjects
      const subRes = await fetch("/api/faculty/subjects", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const subData = await subRes.json();
      if (subRes.ok) {
        setSubjects(subData || []);
        if (subData.length > 0) {
          setSelectedSubjectId(subData[0].id);
        }
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportsDetails = async () => {
    try {
      const res = await fetch("/api/faculty/reports", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setReportsData(data || []);
        if (data.length > 0) {
          setSelectedReportSubjectId(data[0].subject_id);
        }
      }
    } catch (_) {}
  };

  // Create an active session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;

    setCreatingSession(true);
    try {
      const res = await fetch("/api/faculty/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          subject_id: selectedSubjectId,
          duration_minutes: durationMinutes,
          semester: selectedSemester,
          section: selectedSection
        })
      });

      const data = await res.json();
      if (res.ok) {
        startActiveSessionManager(data);
        setActiveTab("dashboard");
        // refresh today's panel
        fetchDashboardDetails();
      } else {
        alert(data.error || "Failed to create session.");
      }
    } catch (e) {
      alert("Error starting transaction session.");
    } finally {
      setCreatingSession(false);
    }
  };

  // Setup counting ticks and polling attendee list
  const startActiveSessionManager = async (session: any) => {
    setActiveSession(session);
    setActiveSessionRecords([]);

    // Generate QR URL
    try {
      const qrUrl = await QRCode.toDataURL(session.qr_token, {
        width: 300,
        margin: 1,
        color: {
          dark: "#1e3a8a", // Dark blue
          light: "#fafafa" // off-white
        }
      });
      setActiveSessionQrUrl(qrUrl);
    } catch (err) {
      console.error(err);
    }

    // Launch Clocks
    clearInterval(countdownIntervalRef.current);
    calculateTimeRemaining(session.expiry_time);
    countdownIntervalRef.current = setInterval(() => {
      calculateTimeRemaining(session.expiry_time);
    }, 1000);

    // Launch attendance poller every 3 seconds to fetch present students list
    clearInterval(pollingIntervalRef.current);
    pollAttendees(session.session_id);
    pollingIntervalRef.current = setInterval(() => {
      pollAttendees(session.session_id);
    }, 3000);
  };

  const calculateTimeRemaining = (expiryStr: string) => {
    const totalSecs = Math.round((new Date(expiryStr).getTime() - new Date().getTime()) / 1000);
    if (totalSecs <= 0) {
      setSecondsLeft(0);
      clearInterval(countdownIntervalRef.current);
      clearInterval(pollingIntervalRef.current);
      // Auto close/end session
      if (activeSession && activeSession.status === "active") {
        setActiveSession((prev: any) => prev ? { ...prev, status: "ended" } : null);
        fetchDashboardDetails();
        fetchReportsDetails();
      }
    } else {
      setSecondsLeft(totalSecs);
    }
  };

  const pollAttendees = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/faculty/sessions/${sessionId}/records`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSessionRecords(data.records || []);
        // update status or config sync
        if (data.session && data.session.status !== activeSession?.status) {
          setActiveSession(data.session);
        }
      }
    } catch (e) {
      console.error("error polling records", e);
    }
  };

  // Session state operations
  const handleSessionAction = async (action: "pause" | "resume" | "end" | "extend") => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/faculty/sessions/${activeSession.session_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveSession(data);
        if (action === "end") {
          clearInterval(countdownIntervalRef.current);
          clearInterval(pollingIntervalRef.current);
          setActiveSession(null);
          setActiveSessionQrUrl("");
          fetchDashboardDetails();
          fetchReportsDetails();
        } else if (action === "extend") {
          // Restart countdowns
          clearInterval(countdownIntervalRef.current);
          calculateTimeRemaining(data.expiry_time);
          countdownIntervalRef.current = setInterval(() => {
            calculateTimeRemaining(data.expiry_time);
          }, 1000);
          
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = setInterval(() => {
            pollAttendees(data.session_id);
          }, 3000);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Report handling
  const getSelectedReport = () => {
    return reportsData.find(r => r.subject_id === selectedReportSubjectId);
  };

  const activeReport = getSelectedReport();

  // Filter students based on report search query (Search students by name or USN)
  const getFilteredReportStudents = () => {
    if (!activeReport) return [];
    if (!reportsSearchQuery.trim()) return activeReport.students;

    const q = reportsSearchQuery.toLowerCase();
    return activeReport.students.filter(
      (s: any) => s.name.toLowerCase().includes(q) || s.usn.toLowerCase().includes(q)
    );
  };

  const filteredReportStudents = getFilteredReportStudents();

  // Export functions (CSV string creation)
  const handleExportCSV = () => {
    if (!activeReport) return;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "USN,Student Name,Semester,Section,Present Classes,Absent Classes,Attendance Percentage\r\n";

    activeReport.students.forEach((s: any) => {
      csvContent += `${s.usn},${s.name},${s.semester},${s.section},${s.present},${s.absent},${s.percentage}%\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_Report_${activeReport.subject_name.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Convert seconds Left state to readable MM:SS format
  const formatTimeRemaining = () => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate quick metrics for current reports panel
  const getReportSummaryMetrics = () => {
    if (!activeReport || activeReport.students.length === 0) return { total: 0, avgPercentage: 0, lowAttendance: 0 };
    const total = activeReport.students.length;
    const sumPercent = activeReport.students.reduce((acc: number, curr: any) => acc + curr.percentage, 0);
    const avgPercentage = Math.round(sumPercent / total);
    const lowAttendance = activeReport.students.filter((st: any) => st.percentage < 75).length;

    return { total, avgPercentage, lowAttendance };
  };

  const reportMetrics = getReportSummaryMetrics();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" id="faculty-app-dashboard">
      
      {/* Header Panel */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                F
              </div>
              <span className="font-semibold text-gray-900 tracking-tight font-display">
                SmartAttend Faculty Suite
              </span>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-1 text-xs text-gray-500 font-medium">
                <Calendar className="h-3.5 w-3.5" />
                <span>CS Academic Section</span>
              </div>
              <button 
                id="faculty-logout-btn"
                onClick={onLogout}
                className="text-gray-500 hover:text-red-600 flex items-center gap-1.5 text-sm font-medium transition-colors"
                title="Exit Work Panel"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12 gap-8">
        
        {/* Left Side menu navigation - invisible in raw printing */}
        <div className="w-full md:w-64 shrink-0 space-y-2 no-print">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 leading-tight text-sm">{user?.name}</h4>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{user?.department}</p>
              </div>
            </div>
          </div>

          <button
            id="tab-dashboard-btn"
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                : "bg-white hover:bg-gray-50 text-gray-600 border border-gray-100 shadow-2xs"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Dashboard Overview
          </button>

          <button
            id="tab-generate-btn"
            onClick={() => setActiveTab("generate")}
            disabled={activeSession !== null}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition ${
              activeSession !== null 
                ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60 border"
                : activeTab === "generate"
                ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                : "bg-white hover:bg-gray-50 text-gray-600 border border-gray-100 shadow-2xs"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Create Attendance QR
          </button>

          <button
            id="tab-reports-btn"
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition ${
              activeTab === "reports"
                ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                : "bg-white hover:bg-gray-50 text-gray-600 border border-gray-100 shadow-2xs"
            }`}
          >
            <Table className="h-4 w-4" />
            Detailed Reports
          </button>

          {activeSession && (
            <div id="faculty-active-bubble-bar" className="mt-6 p-4 rounded-xl bg-orange-50 border border-orange-100 text-orange-800">
              <div className="flex items-start gap-2.5">
                <RotateCcw className="h-4 w-4 text-orange-600 mt-0.5 animate-spin" />
                <div className="text-xs">
                  <span className="font-bold uppercase tracking-wider block text-[10px]">Session Session Running</span>
                  <p className="mt-1 font-medium">Subject Session Code: <strong className="font-mono font-bold tracking-wider">{activeSession.session_code}</strong></p>
                  <button 
                    id="return-to-session"
                    onClick={() => setActiveTab("dashboard")} 
                    className="mt-2 text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    View Controls <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Board */}
        <div className="flex-1 min-w-0">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Active Session Console overlay */}
              {activeSession ? (
                <div id="faculty-active-session-console" className="bg-white p-6 rounded-2xl border-2 border-blue-500 shadow-md">
                  <div className="flex flex-col xl:flex-row gap-8 justify-between items-stretch">
                    
                    {/* QR Display */}
                    <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-xl border border-gray-150 relative w-fit shrink-0 self-center">
                      <span className="absolute top-3 left-3 bg-red-500 text-white text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full animate-pulse">
                        Dynamic QR
                      </span>
                      {activeSessionQrUrl ? (
                        <img 
                          id="active-session-qr-image"
                          src={activeSessionQrUrl} 
                          alt="Dynamic Attendance QR" 
                          className="h-[220px] w-[220px] object-contain select-none"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-[220px] w-[220px] flex items-center justify-center text-gray-300">
                          Loading QR Stream...
                        </div>
                      )}
                      
                      <div className="mt-3 text-center border-t border-gray-200/50 pt-2.5 w-full">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Or Student Session Code</span>
                        <div className="text-2xl font-extrabold tracking-widest text-blue-900 font-mono mt-0.5 bg-blue-50/50 py-1 px-3 rounded-lg border border-blue-100 inline-block">
                          {activeSession.session_code}
                        </div>
                      </div>
                    </div>

                    {/* Controls & Metrics */}
                    <div className="flex-1 flex flex-col justify-between space-y-6">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider inline-flex items-center gap-1 ${
                            activeSession.status === "active" 
                              ? "bg-green-50 text-green-700 border border-green-200" 
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${activeSession.status === "active" ? "bg-green-600 animate-ping" : "bg-amber-600"}`}></span>
                            Status: {activeSession.status}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">ID: {activeSession.session_id}</span>
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 leading-tight font-display">
                          {activeSession.subject_name}
                        </h2>
                        <p className="text-xs text-gray-500">
                          Target Students: <span className="font-semibold text-gray-700">All registered section students</span>. Marked attendance will be filtered via classroom geofence.
                        </p>
                      </div>

                      {/* Timer Widget */}
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="h-6 w-6 text-blue-600 shrink-0" />
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-gray-400">Class Window Closes In</span>
                            <div className="text-2xl font-black font-mono text-gray-900 tracking-tight">
                              {formatTimeRemaining()}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          Expiry: {new Date(activeSession.expiry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      {/* Control Panel buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {activeSession.status === "active" ? (
                          <button
                            id="session-pause-btn"
                            onClick={() => handleSessionAction("pause")}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/50 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                          >
                            <Pause className="h-3.5 w-3.5 animate-pulse" />
                            Pause
                          </button>
                        ) : (
                          <button
                            id="session-resume-btn"
                            onClick={() => handleSessionAction("resume")}
                            className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200/50 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Resume
                          </button>
                        )}

                        <button
                          id="session-extend-btn"
                          onClick={() => handleSessionAction("extend")}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/50 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                          title="Extend session duration by additional 5 minutes"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          +5 Mins
                        </button>

                        <button
                          id="session-end-btn"
                          onClick={() => handleSessionAction("end")}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/50 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 col-span-2 sm:col-span-2 transition"
                        >
                          <Square className="h-3.5 w-3.5" />
                          Complete / Close
                        </button>
                      </div>

                    </div>

                  </div>

                  {/* Real-time scanning queue log list */}
                  <div className="mt-8 border-t border-gray-150 pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold text-gray-905 text-sm font-display">Live Attendance Check-In List</h4>
                      </div>
                      <span id="faculty-attendees-counter" className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-bold">
                        {activeSessionRecords.length} Students Checked In
                      </span>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse font-sans" id="faculty-live-checkin-table">
                        <thead className="bg-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-4">USN</th>
                            <th className="py-2.5 px-4">Student Name</th>
                            <th className="py-2.5 px-4">Sec</th>
                            <th className="py-2.5 px-4 text-center">GPS Status</th>
                            <th className="py-2.5 px-4 text-right">Logged Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150">
                          {activeSessionRecords.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                                Waiting for students to scan QR or input session code...
                              </td>
                            </tr>
                          ) : (
                            activeSessionRecords.map((record) => (
                              <tr key={record.attendance_id} className="hover:bg-white transition animate-fade-in">
                                <td className="py-2 px-4 font-mono font-semibold text-gray-800">{record.student_usn}</td>
                                <td className="py-2 px-4 font-medium text-gray-900">{record.student_name}</td>
                                <td className="py-2 px-4 text-gray-500 font-medium">{record.student_section}</td>
                                <td className="py-2 px-4 text-center">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded">
                                    <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                                    Ok ({Math.round(record.latitude)}, {Math.round(record.longitude)})
                                  </span>
                                </td>
                                <td className="py-2 px-4 text-right text-gray-400 font-mono">
                                  {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              ) : null}

              {/* General Overview Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned Classes</span>
                    <BookOpen className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-3xl font-black text-gray-900 mt-2 font-display">{subjects.length}</p>
                  <p className="text-xs text-gray-400 mt-1">Subjects handling list</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Today's Class Runs</span>
                    <Calendar className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-black text-gray-900 mt-2 font-display">{todaySessions.length}</p>
                  <p className="text-xs text-gray-400 mt-1">Attendance windows run</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">CS Class average</span>
                    <Users className="h-4 w-4 text-violet-500" />
                  </div>
                  <p className="text-3xl font-black text-gray-900 mt-2 font-display">84%</p>
                  <p className="text-xs text-gray-400 mt-1">Average student presence</p>
                </div>
              </div>

              {/* Class overview layout & Recent entries list */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Subject-wise Presence trends */}
                <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-100 shadow-xs flex flex-col justify-between">
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 text-sm font-display">Attendance Trends by Subject</h4>
                    <span className="text-xs text-gray-400">Class aggregate statistics</span>
                  </div>
                  
                  <div className="h-[200px]" id="faculty-aggregate-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectsSummary} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="subject_name" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="average_attendance" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={28} name="Presence Rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recent Entries */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                      <h4 className="font-semibold text-gray-900 text-sm font-display">Recent Activity Log</h4>
                      <span className="text-[10px] bg-gray-100 text-gray-500 border px-2 py-0.5 rounded font-mono">Live</span>
                    </div>

                    <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto">
                      {recentActivity.length === 0 ? (
                        <p className="p-6 text-center text-xs text-gray-400">No student actions logged today yet.</p>
                      ) : (
                        recentActivity.map((act) => (
                          <div key={act.id} className="p-3.5 hover:bg-gray-50/30 flex justify-between items-center text-xs">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-gray-800">{act.student_name}</p>
                              <p className="text-[10px] text-gray-400 font-medium">{act.subject_name} • {act.student_usn}</p>
                            </div>
                            <span className="text-[10px] font-mono text-gray-400">
                              {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    <button
                      id="view-detailed-rep-link"
                      onClick={() => setActiveTab("reports")}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1 w-full cursor-pointer"
                    >
                      Audit Detailed Class List <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: CREATE WINDOW ATTENDANCE */}
          {activeTab === "generate" && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs max-w-xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 font-display">Create Dynamic Attendance Window</h2>
              <p className="text-xs text-gray-500 mt-1">Define properties to generate custom expiring cryptographic QR codes and student access codes.</p>

              <form onSubmit={handleCreateSession} className="mt-8 space-y-5" id="faculty-session-create-form">
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Assigned Academic Subject</label>
                  <select
                    id="generate-subject-select"
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="block w-full py-2.5 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  >
                    {subjects.length === 0 ? (
                      <option value="">No subjects assigned</option>
                    ) : (
                      subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.subject_name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Section Class Target</label>
                    <select
                      id="generate-section-select"
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="block w-full py-2.5 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="D">Section D</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block font-sans">Target Semester</label>
                    <select
                      id="generate-semester-select"
                      value={selectedSemester}
                      onChange={(e) => setSelectedSemester(e.target.value)}
                      className="block w-full py-2.5 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="1">1st Semester</option>
                      <option value="2">2nd Semester</option>
                      <option value="3">3rd Semester</option>
                      <option value="4">4th Semester</option>
                      <option value="5">5th Semester</option>
                      <option value="6">6th Semester</option>
                      <option value="7">7th Semester</option>
                      <option value="8">8th Semester</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block flex justify-between">
                    <span>Attendance Expiry Window</span>
                    <span className="text-blue-600 font-semibold">{durationMinutes} Minutes</span>
                  </label>
                  <input
                    id="generate-duration-input"
                    type="range"
                    min="1"
                    max="15"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-1">
                    <span>1 Min</span>
                    <span>5 Min</span>
                    <span>10 Min</span>
                    <span>15 Min</span>
                  </div>
                </div>

                <div className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-100/50 flex gap-2.5 items-start">
                  <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-800 font-medium leading-relaxed">
                    Student attendance coordinates will be parsed and evaluated against standard system geo-boundaries of 150m. Ensure students have GPS services turned on inside their client browsers.
                  </p>
                </div>

                <button
                  id="generate-submit-btn"
                  type="submit"
                  disabled={creatingSession || subjects.length === 0}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {creatingSession ? "Securing Session Channel..." : "Generate Dynamic Attendance Session"}
                </button>

              </form>
            </div>
          )}

          {/* TAB 3: SUBJECT REPORTS */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              
              {/* Reports Dashboard top Controls bar */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print" id="reports-controls-bar">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-sans">Filter Subject</label>
                  <select
                    id="reports-subject-select"
                    value={selectedReportSubjectId}
                    onChange={(e) => setSelectedReportSubjectId(e.target.value)}
                    className="py-1.5 px-3 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-gray-50"
                  >
                    {reportsData.length === 0 ? (
                      <option value="">No subject reports loaded</option>
                    ) : (
                      reportsData.map(r => (
                        <option key={r.subject_id} value={r.subject_id}>{r.subject_name}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Subject search utility */}
                <div className="relative flex-1 max-w-xs">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Search Student</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      id="reports-search-input"
                      type="text"
                      value={reportsSearchQuery}
                      onChange={(e) => setReportsSearchQuery(e.target.value)}
                      placeholder="Search USN or student name..."
                      className="block w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:border-blue-600 bg-gray-50"
                    />
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="flex gap-2.5 items-end self-end sm:self-auto shrink-0">
                  <button
                    id="export-csv-btn"
                    onClick={handleExportCSV}
                    className="px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition"
                    title="Export list spreadsheet"
                  >
                    <Download className="h-4 w-4 text-emerald-600" />
                    Export CSV
                  </button>
                  <button
                    id="export-print-btn"
                    onClick={handlePrint}
                    className="px-3 py-2 border border-blue-200 bg-blue-50/55 hover:bg-blue-100/60 rounded-xl text-xs font-semibold text-blue-700 flex items-center gap-1.5 transition"
                    title="Print layout report"
                  >
                    <Printer className="h-4 w-4" />
                    Print / PDF
                  </button>
                </div>
              </div>

              {/* Attendance metrics bar */}
              {activeReport && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" id="reports-metrics-grid">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Tracked Students</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block font-display">{reportMetrics.total}</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Classes run</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block font-display">{activeReport.total_sessions} Class Runs</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Average Attendance</span>
                    <span className="text-2xl font-black text-blue-600 mt-1 block font-display">{activeReport.overall_percentage}%</span>
                  </div>
                </div>
              )}

              {/* Data Table View */}
              <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden" id="reports-main-grid-panel">
                <div className="px-6 py-5 border-b border-gray-150 flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h3 className="font-semibold text-gray-950 font-display">
                      {activeReport ? activeReport.subject_name : "Subject Academic Sheet"}
                    </h3>
                  </div>
                  <span className="text-xs text-gray-400 font-mono no-print">Computer Science Engineering</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans" id="faculty-reports-data-table">
                    <thead className="bg-gray-50 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-gray-150">
                      <tr>
                        <th className="py-3.5 px-6">USN</th>
                        <th className="py-3.5 px-6">Student Name</th>
                        <th className="py-3.5 px-6 text-center">Semester</th>
                        <th className="py-3.5 px-6 text-center">Section</th>
                        <th className="py-3.5 px-6 text-center">Present Units</th>
                        <th className="py-3.5 px-6 text-center">Absent Units</th>
                        <th className="py-3.5 px-6 text-right">Presence Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {filteredReportStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-gray-400 font-mono">
                            No student entries found in database criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredReportStudents.map((s: any) => {
                          const belowQuota = s.percentage < 75;
                          return (
                            <tr key={s.id} className="hover:bg-gray-50/30 transition">
                              <td className="py-3.5 px-6 font-mono font-semibold text-gray-800">{s.usn}</td>
                              <td className="py-3.5 px-6 font-medium text-gray-900">{s.name}</td>
                              <td className="py-3.5 px-6 text-center text-gray-500 font-medium">{s.semester}</td>
                              <td className="py-3.5 px-6 text-center text-gray-500 font-medium">{s.section}</td>
                              <td className="py-3.5 px-6 text-center font-mono font-semibold text-green-600">{s.present}</td>
                              <td className="py-3.5 px-6 text-center font-mono font-semibold text-red-600">{s.absent}</td>
                              <td className="py-3.5 px-6 text-right font-mono font-semibold">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  belowQuota 
                                    ? "bg-amber-50 text-amber-600 border border-amber-100" 
                                    : "bg-green-50 text-green-700 border border-green-100"
                                }`}>
                                  {s.percentage}%
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
