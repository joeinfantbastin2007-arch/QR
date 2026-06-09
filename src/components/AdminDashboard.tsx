import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Settings, Users, BookOpen, MapPin, 
  History, BarChart3, Plus, Trash2, Import, Edit, Check, 
  X, RefreshCw, CheckCircle2, AlertTriangle, LogOut, Search,
  Briefcase, GraduationCap, Server, HelpCircle, Network,
  Mail, Sliders
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

interface AdminDashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
}

export default function AdminDashboard({ token, user, onLogout }: AdminDashboardProps) {
  // Navigation
  const [activeTab, setActiveTab] = useState<"analytics" | "institution" | "faculty" | "students" | "bulk_override" | "emails" | "geofence" | "logs">("analytics");

  // Global Lists States
  const [faculty, setFaculty] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [sentEmails, setSentEmails] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    total_students: 0,
    total_faculty: 0,
    total_subjects: 0,
    total_sessions: 0,
    total_records: 0,
    present_count: 0,
    absent_count: 0,
    subjectAnalytics: [],
    dailyTrends: []
  });

  // Academic Config States
  const [departments, setDepartments] = useState<string[]>([]);
  const [semesters, setSemesters] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [newDept, setNewDept] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states: Faculty
  const [facName, setFacName] = useState("");
  const [facEmail, setFacEmail] = useState("");
  const [facDept, setFacDept] = useState("");
  const [facPass, setFacPass] = useState("");

  // Form states: Student
  const [studId, setStudId] = useState(""); // for editing
  const [studName, setStudName] = useState("");
  const [studUsn, setStudUsn] = useState("");
  const [studEmail, setStudEmail] = useState("");
  const [studSem, setStudSem] = useState("6");
  const [studSec, setStudSec] = useState("A");
  const [studPass, setStudPass] = useState("");
  const [studGuardianName, setStudGuardianName] = useState("");
  const [studGuardianEmail, setStudGuardianEmail] = useState("");
  const [isEditingStudent, setIsEditingStudent] = useState(false);

  // Bulk Override Form States
  const [overDate, setOverDate] = useState(new Date().toISOString().split("T")[0]);
  const [overSubjId, setOverSubjId] = useState("");
  const [overSem, setOverSem] = useState("6");
  const [overSec, setOverSec] = useState("A");
  const [overStatus, setOverStatus] = useState<"Present" | "Absent">("Present");
  const [overriding, setOverriding] = useState(false);

  // Form States: Subject
  const [subjName, setSubjName] = useState("");
  const [subjFacId, setSubjFacId] = useState("");

  // Geofence States
  const [geoLat, setGeoLat] = useState(12.9716);
  const [geoLng, setGeoLng] = useState(77.5946);
  const [geoRadius, setGeoRadius] = useState(150);

  // Bulk Import Student state
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);

  // Searches
  const [searchStudentQuery, setSearchStudentQuery] = useState("");
  const [searchLogsQuery, setSearchLogsQuery] = useState("");

  useEffect(() => {
    fetchAllData();
  }, [token]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Config (semesters, sections, depts)
      const configRes = await fetch("/api/admin/config", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const configData = await configRes.json();
      if (configRes.ok) {
        setDepartments(configData.departments || []);
        setSemesters(configData.semesters || []);
        setSections(configData.sections || []);
        if (configData.departments?.length > 0) {
          setFacDept(configData.departments[0]);
        }
      }

      // Faculty
      const facRes = await fetch("/api/admin/faculty", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const facData = await facRes.json();
      if (facRes.ok) {
        setFaculty(facData || []);
        if (facData.length > 0) {
          setSubjFacId(facData[0].id);
        }
      }

      // Students
      const studRes = await fetch("/api/admin/students", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const studData = await studRes.json();
      if (studRes.ok) {
        setStudents(studData || []);
      }

      // Subjects
      const subjRes = await fetch("/api/admin/subjects", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const subjData = await subjRes.json();
      if (subjRes.ok) {
        setSubjects(subjData || []);
        if (subjData && subjData.length > 0) {
          setOverSubjId(subjData[0].id);
        }
      }

      // Geofence details
      const geoRes = await fetch("/api/admin/geofence", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const geoData = await geoRes.json();
      if (geoRes.ok) {
        setGeoLat(geoData.latitude);
        setGeoLng(geoData.longitude);
        setGeoRadius(geoData.radius_meters);
      }

      // Stats
      const statsRes = await fetch("/api/admin/stats", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      if (statsRes.ok) {
        setStats(statsData);
      }

      // Audit Logs
      const logsRes = await fetch("/api/admin/logs", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const logsData = await logsRes.json();
      if (logsRes.ok) {
        setLogs(logsData || []);
      }

      // Sent warning notices logs
      const emailsRes = await fetch("/api/admin/emails", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const emailsData = await emailsRes.json();
      if (emailsRes.ok) {
        setSentEmails(emailsData || []);
      }

    } catch (e) {
      console.error("Failed loading admin console", e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. INSTITUTION MANAGEMENT
  const handleAddDepartment = async () => {
    if (!newDept.trim() || departments.includes(newDept.trim())) return;
    const list = [...departments, newDept.trim()];
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ departments: list })
      });
      if (res.ok) {
        setDepartments(list);
        setNewDept("");
        showToast("Department registered successfully!");
      }
    } catch (_) {}
  };

  const handleDeleteDepartment = async (dept: string) => {
    const list = departments.filter(d => d !== dept);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ departments: list })
      });
      if (res.ok) {
        setDepartments(list);
        showToast("Department removed.");
      }
    } catch (_) {}
  };

  // SUBJECT CREATION
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjName.trim() || !subjFacId) return;

    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ subject_name: subjName.trim(), faculty_id: subjFacId })
      });
      const data = await res.json();
      if (res.ok) {
        setSubjects(prev => [...prev, { ...data, faculty_name: faculty.find(f => f.id === subjFacId)?.name || "Faculty" }]);
        setSubjName("");
        showToast("Academic Subject created!");
      } else {
        showToast(data.error || "Failed to create subject", "error");
      }
    } catch (_) {}
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Are you sure you want to remove this academic subject?")) return;
    try {
      const res = await fetch(`/api/admin/subjects/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setSubjects(prev => prev.filter(s => s.id !== id));
        showToast("Subject removed.");
      }
    } catch (_) {}
  };


  // 2. FACULTY MANAGEMENT
  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facName.trim() || !facEmail.trim() || !facDept || !facPass.trim()) {
      showToast("Please fill in all faculty variables.", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/faculty", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name: facName, email: facEmail, department: facDept, password: facPass })
      });
      const data = await res.json();
      if (res.ok) {
        setFaculty(prev => [...prev, data]);
        setFacName("");
        setFacEmail("");
        setFacPass("");
        showToast("Professor registered!");
      } else {
        showToast(data.error || "Faculty could not be created", "error");
      }
    } catch (_) {}
  };

  const handleDeleteFaculty = async (id: string) => {
    if (!confirm("Are you sure you want to delete this faculty account?")) return;
    try {
      const res = await fetch(`/api/admin/faculty/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setFaculty(prev => prev.filter(f => f.id !== id));
        showToast("Faculty account removed.");
      }
    } catch (_) {}
  };


  // 3. STUDENT MANAGEMENT
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studName.trim() || !studUsn.trim() || !studEmail.trim() || !studSem || !studSec) {
      showToast("Please fill in all student records.", "error");
      return;
    }

    try {
      const payload = {
        name: studName,
        usn: studUsn,
        email: studEmail,
        semester: studSem,
        section: studSec,
        password: studPass || undefined,
        guardian_name: studGuardianName || undefined,
        guardian_email: studGuardianEmail || undefined
      };

      let res;
      if (isEditingStudent) {
        res = await fetch(`/api/admin/students/${studId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        if (!studPass) {
          showToast("A temporary password is required for new accounts.", "error");
          return;
        }
        res = await fetch("/api/admin/students", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok) {
        showToast(isEditingStudent ? "Student record updated!" : "Student registered!");
        // Clear forms
        setStudId("");
        setStudName("");
        setStudUsn("");
        setStudEmail("");
        setStudPass("");
        setStudGuardianName("");
        setStudGuardianEmail("");
        setIsEditingStudent(false);
        // Reload list and counts
        fetchAllData();
      } else {
        showToast(data.error || "Failed to process database saving", "error");
      }
    } catch (_) {}
  };

  const handleEditStudentSelect = (stud: any) => {
    setStudId(stud.id);
    setStudName(stud.name);
    setStudUsn(stud.usn);
    setStudEmail(stud.email);
    setStudSem(stud.semester);
    setStudSec(stud.section);
    setStudPass(""); // clear to keep original password unless altered
    setStudGuardianName(stud.guardian_name || "");
    setStudGuardianEmail(stud.guardian_email || "");
    setIsEditingStudent(true);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Are you sure you want to completely delete this student?")) return;
    try {
      const res = await fetch(`/api/admin/students/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== id));
        showToast("Student deleted.");
      }
    } catch (_) {}
  };

  // CSV BULK STUDENT BULK IMPORT
  const handleBulkImport = async () => {
    if (!bulkCsvText.trim()) return;

    // Parse CSV line by line
    // Expected template lines: Name, USN, Email, Semester, Section, Password
    const rows = bulkCsvText.split("\n");
    const parsedStudents: any[] = [];

    rows.forEach(row => {
      const cells = row.split(",").map(c => c.trim());
      if (cells.length >= 5 && cells[0].toLowerCase() !== "name") {
        parsedStudents.push({
          name: cells[0],
          usn: cells[1],
          email: cells[2],
          semester: cells[3],
          section: cells[4],
          password: cells[5] || "student123"
        });
      }
    });

    if (parsedStudents.length === 0) {
      showToast("Failed to parse csv structure. Ensure cells match the header instructions.", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ students: parsedStudents })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Bulk completed! Sucessfully added ${data.importedCount} students. Skipped ${data.skippedCount} accounts.`);
        setShowImportModal(false);
        setBulkCsvText("");
        fetchAllData();
      } else {
        showToast(data.error || "CSV bulk upload crashed on server.", "error");
      }
    } catch (_) {}
  };

  // 7. ADMINISTRATIVE BULK OVERRIDES
  const handleBulkOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overDate || !overSubjId || !overSem || !overSec || !overStatus) {
      showToast("Please select all parameters to apply override.", "error");
      return;
    }

    const payload = {
      date: overDate,
      subject_id: overSubjId,
      section: overSec,
      semester: overSem,
      status: overStatus
    };

    const targetSubName = subjects.find(s => s.id === overSubjId)?.subject_name || "selected course";

    if (!confirm(`Warning: This will set attendance status to '${overStatus}' for ALL registered students matching Semester ${overSem} in Section ${overSec} for the subject "${targetSubName}" on ${overDate}. This action is logged. Do you wish to continue?`)) {
      return;
    }

    try {
      setOverriding(true);
      const res = await fetch("/api/admin/attendance/override", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Bulk override applied successfully!");
        fetchAllData(); // Refresh logs, emails, stats
      } else {
        showToast(data.error || "Override request failed.", "error");
      }
    } catch (e) {
      showToast("Network exception during override submission.", "error");
    } finally {
      setOverriding(false);
    }
  };


  // 4. GEOFENCE BOUNDS SAVE
  const handleSaveGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/geofence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: Number(geoLat),
          longitude: Number(geoLng),
          radius_meters: Number(geoRadius)
        })
      });
      if (res.ok) {
        showToast("Classroom Geofencing updated!");
      } else {
        showToast("Server refused configurations.", "error");
      }
    } catch (_) {
    } finally {
      setSaving(false);
    }
  };

  // Filters for tables search matching
  const getFilteredStudents = () => {
    if (!searchStudentQuery.trim()) return students;
    const q = searchStudentQuery.toLowerCase();
    return students.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.usn.toLowerCase().includes(q) || 
      s.email.toLowerCase().includes(q)
    );
  };

  const getFilteredLogs = () => {
    if (!searchLogsQuery.trim()) return logs;
    const q = searchLogsQuery.toLowerCase();
    return logs.filter(l => 
      l.user_email.toLowerCase().includes(q) || 
      l.action.toLowerCase().includes(q) || 
      l.details.toLowerCase().includes(q)
    );
  };

  const filteredStudents = getFilteredStudents();
  const filteredLogs = getFilteredLogs();

  // Recharts cell colors pie setup
  const PIE_COLORS = ["#2563eb", "#ef4444"];
  const pieData = [
    { name: "Presents (Total)", value: stats.present_count || 142 },
    { name: "Absents (Total)", value: stats.absent_count || 28 }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans" id="admin-dashboard-root">
      
      {/* Toast Alert pop-up */}
      {toast && (
        <div id="admin-toast-message" className={`fixed top-5 right-5 z-50 p-4 rounded-xl border-t-4 shadow-lg animate-bounce ${
          toast.type === "success" 
            ? "bg-white text-green-900 border-green-500 card" 
            : "bg-white text-red-900 border-red-500 card"
        }`}>
          <div className="flex items-center gap-3">
            {toast.type === "success" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-red-500" />}
            <p className="text-xs font-semibold">{toast.text}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                A
              </div>
              <span className="font-semibold text-gray-900 tracking-tight font-display">
                SmartAttend Admin Center
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-xs bg-blue-50 text-blue-700 font-bold border border-blue-100 rounded-full px-3 py-1 uppercase flex items-center gap-1">
                <Server className="h-3 w-3" />
                Root Domain
              </span>
              <button 
                id="admin-logout-btn"
                onClick={onLogout}
                className="text-gray-500 hover:text-red-600 flex items-center gap-1.5 text-sm font-medium transition-colors"
                title="Sign Out Dashboard"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Primary Dashboard layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Sub-Header Navigation tabs */}
        <div className="flex flex-wrap p-1.5 bg-gray-100 rounded-xl space-x-1 border border-gray-200/50 mb-8" id="admin-main-tabs">
          {[
            { id: "analytics", label: "Analytics Overview", icon: BarChart3 },
            { id: "institution", label: "Academic Settings", icon: Network },
            { id: "faculty", label: "Faculty Members", icon: Briefcase },
            { id: "students", label: "Registered Students", icon: Users },
            { id: "bulk_override", label: "Bulk Overrides", icon: Sliders },
            { id: "emails", label: "Email Warnings", icon: Mail },
            { id: "geofence", label: "Geofencing Controller", icon: MapPin },
            { id: "logs", label: "Live System Logs", icon: History }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                id={`admin-tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition ${
                  activeTab === tab.id
                    ? "bg-white text-blue-700 shadow-sm font-bold"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[50vh]">
            <RefreshCw className="h-10 w-10 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500 text-xs font-medium">Establishing root database link...</p>
          </div>
        ) : (
          <div className="space-y-6">

            {/* TAB 1: ANALYTICS OVERVIEW */}
            {activeTab === "analytics" && (
              <div className="space-y-8 animate-fade-in">
                
                {/* Stats Dashboard Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  {[
                    { label: "Active Admins", count: 1, icon: Settings, desc: "Operational admins" },
                    { label: "Total Faculty", count: stats.total_faculty, icon: Briefcase, desc: "Handling subjects" },
                    { label: "Students", count: stats.total_students, icon: GraduationCap, desc: "CS target section" },
                    { label: "Subjects Running", count: stats.total_subjects, icon: BookOpen, desc: "Academic courses" },
                    { label: "Attendance Logs", count: stats.total_records, icon: History, desc: "Saved logs" }
                  ].map((it, idx) => {
                    const Icon = it.icon;
                    return (
                      <div key={idx} className="bg-white p-5 rounded-xl border border-gray-150 shadow-2xs">
                        <div className="flex justify-between items-center text-gray-400">
                          <span className="text-[10px] uppercase font-bold tracking-wider">{it.label}</span>
                          <Icon className="h-4 w-4 text-blue-500" />
                        </div>
                        <p className="text-2xl font-black text-gray-900 mt-2 font-display">{it.count}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{it.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* GRAPH VISUALIZATIONS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Presence distribution (Pie chart) */}
                  <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm font-display">Log Distributions</h3>
                      <p className="text-[11px] text-gray-400">Total present vs absent stamps</p>
                    </div>
                    
                    <div className="h-[210px] flex items-center justify-center my-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {pieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36} iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Subject attendance rates (Bar chart) */}
                  <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm font-display">Department Presence Rates</h3>
                      <p className="text-[11px] text-gray-400">Subject-wise active percentage charts</p>
                    </div>

                    <div className="h-[230px] my-4" id="admin-subject-analytics-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.subjectAnalytics} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <XAxis dataKey="subject_name" fontSize={9} stroke="#a3a3a3" strokeWidth={0.5} />
                          <YAxis fontSize={9} stroke="#a3a3a3" strokeWidth={0.5} domain={[0, 100]} />
                          <Tooltip />
                          <Bar dataKey="percentage" fill="#2563eb" radius={[3, 3, 0, 0]} barSize={34} name="Rate %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* Staggered Daily Activity curves */}
                <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
                  <h3 className="font-semibold text-gray-900 text-sm font-display mb-1">Recent Student Check-in Trends</h3>
                  <p className="text-[11px] text-gray-400 mb-6">Daily activity representation for targeted sessions across Computer Science</p>
                  
                  <div className="h-[220px]" id="admin-daily-trends-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.dailyTrends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Present" fill="#2563eb" radius={[3, 3, 0, 0]} barSize={20} />
                        <Bar dataKey="Absent" fill="#f87171" radius={[3, 3, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: ACADEMIC INSTITUTION SETTINGS */}
            {activeTab === "institution" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-fade-in" id="institution-config-panel">
                
                {/* Left col: Department structures List */}
                <div className="md:col-span-5 bg-white p-6 rounded-2xl border border-gray-150 shadow-2xs space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm font-display">Manage Academic Departments</h3>
                    <p className="text-[11px] text-gray-400">Identify departments for faculty assignments</p>
                  </div>

                  <div className="flex gap-2.5">
                    <input
                      id="institution-add-dept-input"
                      type="text"
                      placeholder="e.g. Mechanical Engineering"
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className="flex-1 py-1.5 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:border-blue-600"
                    />
                    <button
                      id="institution-add-dept-btn"
                      onClick={handleAddDepartment}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Plus className="h-4 w-4" /> Add
                    </button>
                  </div>

                  <div className="divide-y divide-gray-150 bg-gray-50/50 rounded-xl border border-gray-150/40 p-1 max-h-[220px] overflow-y-auto">
                    {departments.map((d, idx) => (
                      <div key={idx} className="p-2.5 flex justify-between items-center text-xs text-gray-700 font-medium hover:bg-white transition rounded-lg">
                        <span>{d}</span>
                        <button 
                          id={`dept-trash-${idx}`}
                          onClick={() => handleDeleteDepartment(d)} 
                          className="text-gray-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right col: Subject Creation form */}
                <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-gray-150 shadow-2xs space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm font-display">Subject Assignments Console</h3>
                    <p className="text-[11px] text-gray-400">Map subjects dynamically to qualified faculty accounts</p>
                  </div>

                  <form onSubmit={handleCreateSubject} className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="institution-subj-form">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Course Title Name</label>
                      <input
                        id="institution-subj-name"
                        type="text"
                        required
                        placeholder="DBMS (Database Management)"
                        value={subjName}
                        onChange={(e) => setSubjName(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Professor</label>
                      <select
                        id="institution-subj-prof"
                        value={subjFacId}
                        onChange={(e) => setSubjFacId(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:border-blue-600"
                      >
                        {faculty.length === 0 ? (
                          <option value="">No faculty member registered</option>
                        ) : (
                          faculty.map(fac => (
                            <option key={fac.id} value={fac.id}>{fac.name} ({fac.department})</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="sm:col-span-2 pt-2">
                      <button
                        id="institution-add-subject-btn"
                        type="submit"
                        disabled={faculty.length === 0}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 text-white text-xs font-semibold rounded-xl transition"
                      >
                        Map Subject to Faculty
                      </button>
                    </div>
                  </form>

                  {/* Registered mapped academic courses table */}
                  <div className="border border-gray-150/50 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse font-sans" id="subject-mapped-table">
                      <thead className="bg-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-150">
                        <tr>
                          <th className="py-2 px-4">Subject Course</th>
                          <th className="py-2 px-4">Assigned Evaluator</th>
                          <th className="py-2 px-4 text-right">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {subjects.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-gray-400 italic">No academic subjects in workspace.</td>
                          </tr>
                        ) : (
                          subjects.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50/20">
                              <td className="py-2.5 px-4 font-semibold text-gray-800">{s.subject_name}</td>
                              <td className="py-2.5 px-4 text-gray-500 font-medium">{s.faculty_name}</td>
                              <td className="py-2.5 px-4 text-right">
                                <button 
                                  id={`subject-trash-${s.id}`}
                                  onClick={() => handleDeleteSubject(s.id)} 
                                  className="text-gray-400 hover:text-red-600 transition"
                                >
                                  <Trash2 className="h-4 w-4 inline-block" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 3: FACULTY MEMBERS */}
            {activeTab === "faculty" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in" id="faculty-desk-panel">
                
                {/* Form column: Register Professor */}
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-2xs space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm font-display">Faculty Account Registrar</h3>
                    <p className="text-[11px] text-gray-400">Generate credentials for professors</p>
                  </div>

                  <form onSubmit={handleAddFaculty} className="space-y-4" id="faculty-registar-form">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Faculty Full Name</label>
                      <input
                        id="fac-name-input"
                        type="text"
                        required
                        placeholder="Prof. John Smith"
                        value={facName}
                        onChange={(e) => setFacName(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Faculty Email</label>
                      <input
                        id="fac-email-input"
                        type="email"
                        required
                        placeholder="john.smith@smartattend.edu"
                        value={facEmail}
                        onChange={(e) => setFacEmail(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Department</label>
                      <select
                        id="fac-dept-select"
                        value={facDept}
                        onChange={(e) => setFacDept(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none"
                      >
                        {departments.map((d, index) => (
                          <option key={index} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Temporary Password</label>
                      <input
                        id="fac-pass-input"
                        type="text"
                        required
                        placeholder="e.g. faculty123"
                        value={facPass}
                        onChange={(e) => setFacPass(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 font-mono"
                      />
                    </div>

                    <button
                      id="fac-submit-btn"
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                    >
                      Process Registry Authorization
                    </button>
                  </form>
                </div>

                {/* List column: professors directory */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-150 shadow-2xs overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-150 flex justify-between items-center">
                      <h4 className="font-semibold text-gray-950 font-display text-sm">Faculty Directory</h4>
                      <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-mono font-bold uppercase">
                        {faculty.length} Authorized Proctors
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-sans" id="faculty-directory-table">
                        <thead className="bg-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-150">
                          <tr>
                            <th className="py-2.5 px-4">Faculty Name</th>
                            <th className="py-2.5 px-4">Workspace Email</th>
                            <th className="py-2.5 px-4 font-sans">Active Department</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 text-gray-500">
                          {faculty.map((f) => (
                            <tr key={f.id} className="hover:bg-gray-50/10">
                              <td className="py-3 px-4 font-semibold text-gray-900 leading-none">{f.name}</td>
                              <td className="py-3 px-4 font-mono font-medium">{f.email}</td>
                              <td className="py-3 px-4 font-medium text-gray-700">{f.department}</td>
                              <td className="py-3 px-4 text-right">
                                <button 
                                  id={`fac-trash-${f.id}`}
                                  onClick={() => handleDeleteFaculty(f.id)} 
                                  className="text-gray-400 hover:text-red-600 transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: REGISTERED STUDENTS */}
            {activeTab === "students" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in" id="student-desk-panel">
                
                {/* Form column: Register/Edit Student */}
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-2xs space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm font-display">Student Records Desk</h3>
                      <p className="text-[11px] text-gray-400">Add or patch student dossiers</p>
                    </div>
                    {isEditingStudent && (
                      <button 
                        id="student-clear-edit-btn"
                        onClick={() => {
                          setStudId("");
                          setStudName("");
                          setStudUsn("");
                          setStudEmail("");
                          setStudPass("");
                          setIsEditingStudent(false);
                        }}
                        className="text-[10px] text-blue-600 font-bold hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveStudent} className="space-y-4" id="student-record-form">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Student Full Name</label>
                      <input
                        id="stud-name-input"
                        type="text"
                        required
                        placeholder="Alice Cooper"
                        value={studName}
                        onChange={(e) => setStudName(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-sans">University Serial Number (USN)</label>
                      <input
                        id="stud-usn-input"
                        type="text"
                        required
                        placeholder="e.g. 1SG22CS001"
                        value={studUsn}
                        onChange={(e) => setStudUsn(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 font-mono"
                      />
                    </div>
                    
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Student Email</label>
                      <input
                        id="stud-email-input"
                        type="email"
                        required
                        placeholder="alice@smartattend.edu"
                        value={studEmail}
                        onChange={(e) => setStudEmail(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Section</label>
                        <select
                          id="stud-sec-select"
                          value={studSec}
                          onChange={(e) => setStudSec(e.target.value)}
                          className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:border-blue-600"
                        >
                          {sections.map((sec, index) => (
                            <option key={index} value={sec}>{sec}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Semester</label>
                        <select
                          id="stud-sem-select"
                          value={studSem}
                          onChange={(e) => setStudSem(e.target.value)}
                          className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:border-blue-600"
                        >
                          {semesters.map((sem, index) => (
                            <option key={index} value={sem}>Sem {sem}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Guardian Name</label>
                        <input
                          id="stud-guardian-name-input"
                          type="text"
                          placeholder="e.g. Robert Cooper"
                          value={studGuardianName}
                          onChange={(e) => setStudGuardianName(e.target.value)}
                          className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 bg-white"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Guardian Email</label>
                        <input
                          id="stud-guardian-email-input"
                          type="email"
                          placeholder="e.g. robert@example.com"
                          value={studGuardianEmail}
                          onChange={(e) => setStudGuardianEmail(e.target.value)}
                          className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-0.5 animate-fade-in">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block flex justify-between">
                        <span>Portal Password</span>
                        {isEditingStudent && <span className="text-gray-400 italic text-[9px]">(Optional, leave blank to keep original)</span>}
                      </label>
                      <input
                        id="stud-pass-input"
                        type="text"
                        placeholder="e.g. student123"
                        required={!isEditingStudent}
                        value={studPass}
                        onChange={(e) => setStudPass(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 font-mono"
                      />
                    </div>

                    <button
                      id="stud-submit-btn"
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                    >
                      {isEditingStudent ? "Save Modified Record" : "Add Authorized Student"}
                    </button>
                  </form>
                </div>

                {/* List column: students directory */}
                <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-150 shadow-2xs overflow-hidden flex flex-col justify-between">
                  <div>
                    {/* Header Controls */}
                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-150 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                      <h4 className="font-semibold text-gray-950 font-display text-sm leading-tight">Student Roster Directory</h4>
                      
                      {/* Search & Bulk buttons */}
                      <div className="flex gap-2.5 items-center">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                            <Search className="h-3.5 w-3.5" />
                          </div>
                          <input
                            id="student-search-query-input"
                            type="text"
                            placeholder="Search Name or USN..."
                            value={searchStudentQuery}
                            onChange={(e) => setSearchStudentQuery(e.target.value)}
                            className="py-1 px-3 pl-8 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none bg-white max-w-xs"
                          />
                        </div>

                        <button
                          id="bulk-import-modal-btn"
                          onClick={() => setShowImportModal(true)}
                          className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200/80 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Import className="h-3.5 w-3.5" /> Bulk Import
                        </button>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse font-sans" id="student-roster-table">
                        <thead className="bg-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-150">
                          <tr>
                            <th className="py-2.5 px-4 font-sans">Student Name</th>
                            <th className="py-2.5 px-4">USN</th>
                            <th className="py-2.5 px-4 font-mono">Mail Address</th>
                            <th className="py-2.5 px-4 text-center">Semester / Section</th>
                            <th className="py-2.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 text-gray-500">
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-gray-400 italic font-mono">No matching student elements.</td>
                            </tr>
                          ) : (
                            filteredStudents.map((s) => (
                              <tr key={s.id} className="hover:bg-gray-50/10">
                                <td className="py-3 px-4 font-semibold text-gray-950 font-display">{s.name}</td>
                                <td className="py-3 px-4 font-mono font-semibold text-blue-800 tracking-wide">{s.usn}</td>
                                <td className="py-3 px-4">
                                  <div className="font-medium text-gray-800">{s.email}</div>
                                  {s.guardian_email && (
                                    <div className="text-[10px] text-gray-400 mt-0.5" title="Guardian Contact">
                                      Guardian: <span className="font-medium text-gray-600">{s.guardian_name || "Yes"}</span> ({s.guardian_email})
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center font-medium">Sem {s.semester} — Sec {s.section}</td>
                                <td className="py-3 px-4 text-right flex gap-3.5 justify-end">
                                  <button 
                                    id={`stud-edit-${s.id}`}
                                    onClick={() => handleEditStudentSelect(s)}
                                    className="text-gray-400 hover:text-blue-600 transition"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button 
                                    id={`stud-trash-${s.id}`}
                                    onClick={() => handleDeleteStudent(s.id)}
                                    className="text-gray-400 hover:text-red-600 transition"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Bulk Import CSV Text sheet modal overlay */}
                {showImportModal && (
                  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 font-sans" id="bulk-import-modal-overlay">
                    <div className="bg-white rounded-2xl border max-w-lg w-full p-6 shadow-xl space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                        <h4 className="font-semibold text-gray-900 text-sm font-display">Student CSV Loader</h4>
                        <button 
                          id="bulk-import-modal-close"
                          onClick={() => setShowImportModal(false)}
                          className="text-gray-400 hover:text-gray-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <p className="text-xs text-gray-500 leading-relaxed">
                        Insert comma-separated lines. Columns required:
                        <code className="bg-gray-150 px-1.5 py-0.5 rounded font-mono text-red-700 text-[10px] tracking-wide block mt-1.5 p-1">
                          Name, USN, Email, Semester, Section, [Password]
                        </code>
                        Example: <code className="block text-[10px] text-gray-400 my-1">Alice Cooper, 1SG22CS001, alice@smartattend.edu, 6, A, student123</code>
                      </p>

                      <textarea
                        id="bulk-import-textarea"
                        rows={6}
                        placeholder="Name, USN, Email, Semester, Section, Password"
                        value={bulkCsvText}
                        onChange={(e) => setBulkCsvText(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs font-mono placeholder-gray-400 focus:outline-none"
                      />

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          id="bulk-import-cancel-btn"
                          onClick={() => setShowImportModal(false)}
                          className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-400 transition hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          id="bulk-import-submit-auth"
                          onClick={handleBulkImport}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
                        >
                          Add CSV Records
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB 4.5: BULK ATTENDANCE OVERRIDES */}
            {activeTab === "bulk_override" && (
              <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-gray-150 shadow-2xs space-y-6 animate-fade-in" id="bulk-overrides-panel">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 font-display">Administrative Bulk Attendance Overrides</h2>
                  <p className="text-xs text-gray-500 mt-1">Specify academic session criteria to force mass attendance values for a student cohort. All manual adjustments create permanent logs in the system security audit trail.</p>
                </div>

                <form onSubmit={handleBulkOverrideSubmit} className="space-y-4" id="bulk-override-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target Session Date</label>
                      <input
                        id="over-date-input"
                        type="date"
                        required
                        value={overDate}
                        onChange={(e) => setOverDate(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Course Academic Subject</label>
                      <select
                        id="over-subject-select"
                        value={overSubjId}
                        onChange={(e) => setOverSubjId(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:border-blue-600"
                        required
                      >
                        <option value="">-- Select Subject --</option>
                        {subjects.map((sub, index) => (
                          <option key={index} value={sub.id}>{sub.subject_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target Semester</label>
                      <select
                        id="over-semester-select"
                        value={overSem}
                        onChange={(e) => setOverSem(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:border-blue-600"
                      >
                        {semesters.map((sem, index) => (
                          <option key={index} value={sem}>Sem {sem}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target Section</label>
                      <select
                        id="over-section-select"
                        value={overSec}
                        onChange={(e) => setOverSec(e.target.value)}
                        className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs bg-gray-50 focus:outline-none focus:border-blue-600"
                      >
                        {sections.map((sec, index) => (
                          <option key={index} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Assigned Status</label>
                      <div className="grid grid-cols-2 gap-2 mt-0.5">
                        <button
                          type="button"
                          onClick={() => setOverStatus("Present")}
                          className={`py-2 px-3 text-xs font-semibold rounded-xl text-center border transition ${
                            overStatus === "Present"
                              ? "bg-green-50 text-green-700 border-green-200 shadow-3xs"
                              : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setOverStatus("Absent")}
                          className={`py-2 px-3 text-xs font-semibold rounded-xl text-center border transition ${
                            overStatus === "Absent"
                              ? "bg-red-50 text-red-700 border-red-200 shadow-3xs"
                              : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl flex gap-2.5 items-start">
                    <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-800 leading-relaxed font-sans">
                      <strong className="text-gray-900 font-bold block mb-0.5">Security Notice</strong>
                      This operation replaces existing attendance logs for all matches. If status is set to **Absent**, students and registered guardians will receive automatic email advisories immediately.
                    </div>
                  </div>

                  <button
                    id="bulk-override-submit-btn"
                    type="submit"
                    disabled={overriding}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 text-xs font-semibold rounded-xl transition shadow-xs"
                  >
                    {overriding ? "Processing Overrides..." : "Execute Bulk Override Change"}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4.6: EMAIL OUTBOX LOGS */}
            {activeTab === "emails" && (
              <div className="bg-white rounded-2xl border border-gray-150 shadow-2xs overflow-hidden animate-fade-in" id="email-notices-panel">
                <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-150 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-950 font-display">Student Email Dispatches Log</h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">Track automated absence warnings transmitted to students and designated guardians.</p>
                  </div>
                  <button
                    onClick={fetchAllData}
                    className="px-3 py-1.5 border border-gray-200 text-gray-500 hover:text-gray-800 rounded-xl text-xs hover:bg-gray-50 transition font-semibold flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh Dispatch Outbox
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead className="bg-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-150">
                      <tr>
                        <th className="py-2.5 px-4">Date & Time</th>
                        <th className="py-2.5 px-4">Recipient</th>
                        <th className="py-2.5 px-4">Subject</th>
                        <th className="py-2.5 px-4">Delivery Status</th>
                        <th className="py-2.5 px-4 text-right">Provider</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-gray-500">
                      {sentEmails.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-400 italic font-mono">No transactional electronic notices dispatched yet.</td>
                        </tr>
                      ) : (
                        sentEmails.map((em) => (
                          <tr key={em.id} className="hover:bg-gray-50/10">
                            <td className="py-3 px-4 font-mono text-[11px]">{new Date(em.timestamp).toLocaleString()}</td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-gray-950 font-display">{em.student_name}</div>
                              <div className="flex gap-1.5 items-center mt-0.5">
                                <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase ${
                                  em.recipient_role === 'student' ? 'bg-indigo-50 text-indigo-700' : 'bg-pink-50 text-pink-700'
                                }`}>
                                  {em.recipient_role}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono select-all font-medium">{em.recipient_email}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 leading-normal max-w-sm">
                              <div className="font-medium text-gray-800">{em.subject}</div>
                              <div className="text-[10px] text-gray-400 truncate mt-0.5" title={em.body.replace(/<[^>]*>/g, '')}>
                                {em.body.replace(/<[^>]*>/g, ' ').substring(0, 120)}...
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg ${
                                em.status === 'Sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {em.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-mono text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-semibold">{em.provider}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: GEOFENCING CONTROLLER */}
            {activeTab === "geofence" && (
              <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-2xs max-w-xl mx-auto space-y-6 animate-fade-in" id="geofencing-controller-container">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 font-display">University Geofencing Boundaries</h2>
                  <p className="text-xs text-gray-500 mt-1">Configure active physical coordinates where attendance logging is certified.</p>
                </div>

                <form onSubmit={handleSaveGeofence} className="space-y-4" id="geofence-boundaries-form">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Latitude Origin (Coordinate Y)</label>
                    <input
                      id="geofence-lat-input"
                      type="number"
                      step="0.000001"
                      required
                      value={geoLat}
                      onChange={(e) => setGeoLat(Number(e.target.value))}
                      className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Longitude Origin (Coordinate X)</label>
                    <input
                      id="geofence-lng-input"
                      type="number"
                      step="0.000001"
                      required
                      value={geoLng}
                      onChange={(e) => setGeoLng(Number(e.target.value))}
                      className="block w-full py-2 px-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block flex justify-between">
                      <span>Certified Target Radius limit</span>
                      <span className="text-blue-600 font-semibold">{geoRadius} Meters</span>
                    </label>
                    <input
                      id="geofence-range-input"
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={geoRadius}
                      onChange={(e) => setGeoRadius(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[11px] text-gray-400 font-mono">
                      <span>10m</span>
                      <span>150m (Normal class hub)</span>
                      <span>500m</span>
                      <span>1000m (Broad campus)</span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-105/50 flex gap-2.5 items-start">
                    <MapPin className="h-5 w-5 text-blue-600 shrink-0 mt-0.5 animate-bounce" />
                    <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                      Attendance submissions beyond {geoRadius} meters physical separation from central coordinates 
                      <strong className="text-gray-800 font-bold"> {geoLat}, {geoLng} </strong> 
                      will be rejected to prevent proxy registrations.
                    </p>
                  </div>

                  <button
                    id="geofence-submit-btn"
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition"
                  >
                    {saving ? "Applying Coordinate Boundaries..." : "Apply Geofencing Settings"}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 6: System Log Files */}
            {activeTab === "logs" && (
              <div className="bg-white rounded-2xl border border-gray-150 shadow-2xs overflow-hidden animate-fade-in" id="audit-trail-panel">
                
                {/* Search in log files */}
                <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-150 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm font-display">Root Authorized Audit Trails</h3>
                    <p className="text-[11px] text-gray-400">Chronological transaction logs stored in database container.</p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gray-400">
                      <Search className="h-3.5 w-3.5" />
                    </div>
                    <input
                      id="logs-search-query-input"
                      type="text"
                      placeholder="Search Log actions or actors..."
                      value={searchLogsQuery}
                      onChange={(e) => setSearchLogsQuery(e.target.value)}
                      className="py-1 px-3 pl-8 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none bg-white max-w-xs"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans font-medium" id="logs-audit-table">
                    <thead className="bg-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-150">
                      <tr>
                        <th className="py-2.5 px-4 font-mono">Timestamp</th>
                        <th className="py-2.5 px-4">User Operator</th>
                        <th className="py-2.5 px-4 text-center">Role Scope</th>
                        <th className="py-2.5 px-4 text-center">Trigger Action</th>
                        <th className="py-2.5 px-4 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-gray-500">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-400 font-mono">No action matching log query found in buffer.</td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50/10">
                            <td className="py-2.5 px-4 font-mono text-[10px] text-gray-400">
                              {new Date(log.timestamp).toLocaleString([], { hour12: false })}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-gray-950 font-display">{log.user_email}</td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                log.user_role === "admin" 
                                  ? "bg-red-50 text-red-700 border border-red-100" 
                                  : log.user_role === "faculty" 
                                  ? "bg-amber-50 text-amber-700 border border-amber-100" 
                                  : "bg-green-50 text-green-700 border border-green-100"
                              }`}>
                                {log.user_role}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-gray-900">{log.action}</td>
                            <td className="py-2.5 px-4 text-right text-gray-400 text-[11px] font-mono whitespace-nowrap overflow-hidden max-w-[240px] text-ellipsis" title={log.details}>
                              {log.details}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
