export type UserRole = 'admin' | 'faculty' | 'student';

export interface Admin {
  id: string;
  name: string;
  email: string;
}

export interface Faculty {
  id: string;
  name: string;
  email: string;
  department: string;
}

export interface Student {
  id: string;
  usn: string;
  name: string;
  email: string;
  semester: string;
  section: string;
  guardian_name?: string;
  guardian_email?: string;
}

export interface SentEmail {
  id: string;
  timestamp: string;
  session_id?: string;
  student_id: string;
  student_name: string;
  recipient_role: 'student' | 'guardian';
  recipient_email: string;
  subject: string;
  body: string;
  status: 'Sent' | 'Failed';
  provider: string;
}

export interface Subject {
  id: string;
  subject_name: string;
  faculty_id: string;
  faculty_name?: string; // resolved
}

export interface AttendanceSession {
  session_id: string;
  subject_id: string;
  subject_name?: string; // resolved
  section?: string;      // resolved
  semester?: string;     // resolved
  qr_token: string;
  session_code: string;
  created_time: string;
  expiry_time: string;
  status: 'active' | 'paused' | 'ended';
  duration_minutes: number;
}

export interface AttendanceRecord {
  attendance_id: string;
  student_id: string;
  student_name?: string; // resolved
  student_usn?: string;  // resolved
  student_section?: string; // resolved
  session_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  status: 'Present' | 'Absent';
  device_fingerprint?: string;
  is_within_geofence: boolean;
}

export interface GeofenceSettings {
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_email: string;
  user_role: UserRole;
  action: string;
  details: string;
  ip_address?: string;
}

export interface SubjectWithFaculty extends Subject {
  faculty_email?: string;
  department?: string;
}

export interface SessionWithDetails extends AttendanceSession {
  total_students: number;
  present_count: number;
  absent_count: number;
}
