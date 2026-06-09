import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  Admin, Faculty, Student, Subject, AttendanceSession, 
  AttendanceRecord, GeofenceSettings, AuditLog, SentEmail 
} from '../src/types';

const DB_FILE = path.join(process.cwd(), 'database.json');

interface Schema {
  admins: Array<Admin & { password_hash: string; salt: string }>;
  faculty: Array<Faculty & { password_hash: string; salt: string }>;
  students: Array<Student & { password_hash: string; salt: string }>;
  subjects: Array<Subject>;
  sessions: Array<AttendanceSession>;
  records: Array<AttendanceRecord>;
  geofence: GeofenceSettings;
  logs: Array<AuditLog>;
  emails: Array<SentEmail>;
  departments: string[];
  semesters: string[];
  sections: string[];
}

// Simple Helper for password hashing
export function hashPassword(password: string, salt: string = crypto.randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return { hash, salt };
}

export const DEFAULT_GEOFENCE: GeofenceSettings = {
  latitude: 12.9716,
  longitude: 77.5946,
  radius_meters: 150
};

const DEFAULT_DEPARTMENTS = ["Computer Science", "Information Science", "Electronics & Communication", "Mechanical Engineering", "Biotechnology"];
const DEFAULT_SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
const DEFAULT_SECTIONS = ["A", "B", "C", "D"];

function getInitialDB(): Schema {
  const adminSalt = crypto.randomBytes(16).toString('hex');
  const facultySalt = crypto.randomBytes(16).toString('hex');
  const s1Salt = crypto.randomBytes(16).toString('hex');
  const s2Salt = crypto.randomBytes(16).toString('hex');
  const s3Salt = crypto.randomBytes(16).toString('hex');

  const facultyId = 'fac_john_smith';

  return {
    admins: [
      {
        id: 'adm_1',
        name: 'Dean Admin',
        email: 'admin@smartattend.edu',
        password_hash: hashPassword('admin123', adminSalt).hash,
        salt: adminSalt
      }
    ],
    faculty: [
      {
        id: facultyId,
        name: 'Prof. John Smith',
        email: 'faculty@smartattend.edu',
        department: 'Computer Science',
        password_hash: hashPassword('faculty123', facultySalt).hash,
        salt: facultySalt
      }
    ],
    students: [
      {
        id: 'stud_alice',
        usn: '1SG22CS001',
        name: 'Alice Cooper',
        email: 'alice@smartattend.edu',
        semester: '6',
        section: 'A',
        password_hash: hashPassword('student123', s1Salt).hash,
        salt: s1Salt
      },
      {
        id: 'stud_bob',
        usn: '1SG22CS002',
        name: 'Bob Marley',
        email: 'bob@smartattend.edu',
        semester: '6',
        section: 'A',
        password_hash: hashPassword('student123', s2Salt).hash,
        salt: s2Salt
      },
      {
        id: 'stud_charlie',
        usn: '1SG22CS003',
        name: 'Charlie Chaplin',
        email: 'charlie@smartattend.edu',
        semester: '6',
        section: 'B',
        password_hash: hashPassword('student123', s3Salt).hash,
        salt: s3Salt
      }
    ],
    subjects: [
      { id: 'subj_dbms', subject_name: 'DBMS (Database Management)', faculty_id: facultyId },
      { id: 'subj_java', subject_name: 'Java Programming', faculty_id: facultyId },
      { id: 'subj_math', subject_name: 'Engineering Mathematics', faculty_id: facultyId }
    ],
    sessions: [],
    records: [],
    geofence: DEFAULT_GEOFENCE,
    logs: [
      {
        id: 'log_init',
        timestamp: new Date().toISOString(),
        user_email: 'system',
        user_role: 'admin',
        action: 'System Initialization',
        details: 'Database seeded with sample faculty and CS students.'
      }
    ],
    emails: [],
    departments: DEFAULT_DEPARTMENTS,
    semesters: DEFAULT_SEMESTERS,
    sections: DEFAULT_SECTIONS
  };
}

export class DB {
  private static data: Schema | null = null;

  static load(): Schema {
    if (this.data) return this.data;

    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        if (this.data) {
          if (!this.data.emails) this.data.emails = [];
          if (!this.data.departments) this.data.departments = ["Computer Science", "Information Science", "Electronics & Communication", "Mechanical Engineering", "Biotechnology"];
          if (!this.data.semesters) this.data.semesters = ["1", "2", "3", "4", "5", "6", "7", "8"];
          if (!this.data.sections) this.data.sections = ["A", "B", "C", "D"];
        }
      } else {
        this.data = getInitialDB();
        this.save();
      }
    } catch (e) {
      console.error("Failed to read database.json, reinitializing...", e);
      this.data = getInitialDB();
      this.save();
    }

    return this.data!;
  }

  static save(): void {
    if (!this.data) return;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error("Failed to save database.json", e);
    }
  }

  static addLog(user_email: string, user_role: 'admin' | 'faculty' | 'student', action: string, details: string): void {
    const db = this.load();
    const log: AuditLog = {
      id: 'log_' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      user_email,
      user_role,
      action,
      details
    };
    db.logs.unshift(log);
    // Keep last 1000 logs
    if (db.logs.length > 1000) {
      db.logs.pop();
    }
    this.save();
  }
}
