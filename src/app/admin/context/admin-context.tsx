
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser, initialAdminUsers, roles as adminRoles } from '../dashboard/administrators/page';
import { Subject as ScheduleSubject } from '../dashboard/schedule/[blockId]/page';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// --- Data from instructors ---
export type Instructor = {
    id: number;
    name: string;
    email: string;
    subjects: string[];
    avatar: string;
};
export const initialInstructors: Instructor[] = []; // Will be fetched from API
export const availableSubjects = []; // Will be fetched from API

// --- Data from manage-applications ---
const initialPendingApplications = [
    { id: 1, studentId: '24-00-0001', name: 'John Doe', course: 'BSIT', year: 3, status: 'Old', block: 'BSIT 3-A', credentials: { birthCertificate: true, grades: true, goodMoral: false, registrationForm: true }},
    { id: 2, studentId: '24-00-0002', name: 'Jane Smith', course: 'ACT', year: 1, status: 'New', block: 'ACT 1-A', credentials: { birthCertificate: true, grades: false, goodMoral: true, registrationForm: false }},
    { id: 3, studentId: '24-00-0003', name: 'Peter Jones', course: 'BSIT', year: 3, status: 'Transferee', block: 'BSIT 3-B', credentials: { birthCertificate: true, grades: true, goodMoral: true, registrationForm: true }},
];
const initialApprovedApplications = [
    { id: 4, studentId: '23-00-0999', name: 'Emily White', course: 'BSIT', year: 3, status: 'Old', block: 'BSIT 3-A', credentials: { birthCertificate: true, grades: true, goodMoral: true, registrationForm: true }},
    { id: 5, studentId: '22-00-0998', name: 'Chris Green', course: 'ACT', year: 2, status: 'Old', block: 'ACT 2-A', credentials: { birthCertificate: true, grades: true, goodMoral: true, registrationForm: true }},
];
const initialRejectedApplications = [
     { id: 6, studentId: '24-00-0997', name: 'Michael Brown', course: 'ACT', year: 1, status: 'New', block: 'ACT 1-B', credentials: { birthCertificate: false, grades: true, goodMoral: true, registrationForm: true }, rejectionReason: 'Incomplete or missing documents.'},
];
export type Application = typeof initialPendingApplications[0] & { rejectionReason?: string };
export const rejectionReasons = [
    { id: 'incomplete_docs', label: 'Incomplete or missing documents.' },
    { id: 'not_qualified', label: 'Does not meet the minimum qualifications.' },
    { id: 'slots_full', label: 'All available slots for the course are filled.' },
];


// --- Data from manage-blocks ---
export type Block = {
    id: number;
    name: string;
    capacity: number;
    enrolled: number;
    course: 'ACT' | 'BSIT';
    specialization?: 'AP' | 'DD';
    year: '1st-year' | '2nd-year' | '3rd-year' | '4th-year';
};
const initialBlocks: Block[] = []; // Will be fetched from API
export const mockStudents = [
    { id: '24-00-0004', name: 'Alice Johnson', avatar: 'https://picsum.photos/seed/aj/40/40' },
    { id: '24-00-0005', name: 'Bob Williams', avatar: 'https://picsum.photos/seed/bw/40/40' },
    { id: '24-00-0006', name: 'Charlie Brown', avatar: 'https://picsum.photos/seed/cb/40/40' },
    { id: '24-00-0007', name: 'Diana Miller', avatar: 'https://picsum.photos/seed/dm/40/40' },
];

// --- Data from manage-subjects ---
export type Subject = {
    id: number;
    code: string;
    description: string;
    units: number;
    prerequisite?: string;
};
export type YearLevelSubjects = Record<string, Subject[]>;
const initialSubjects: YearLevelSubjects = {}; // Will be fetched from API

// --- Data from schedule ---
const initialScheduleSubjects: ScheduleSubject[] = []; // Mock data for now
const initialSchedules: Record<string, ScheduleSubject[]> = {
    "ACT 1-A": [],
    "ACT 1-B": [],
    "ACT 2-A": []
};

// --- Student Data ---
export type Student = {
    id: number;
    studentId: string;
    name: string;
    avatar: string;
    email: string;
    course: 'BSIT' | 'ACT';
    year: number;
    status: 'Enrolled' | 'Not Enrolled' | 'Graduated';
    block?: string;
    enlistedSubjects?: Subject[];
    sex: 'Male' | 'Female';
    phoneNumber: string;
    specialization?: 'AP' | 'DD';
};
const initialStudentsList: Student[] = []; // Mock data for now

// --- Academic Records ---
type Grade = { subjectCode: string; grade: number; };
type StudentGrades = {
    [studentId: string]: Grade[];
};
const initialGrades: StudentGrades = {}; // Mock data for now

// --- Main Admin Data Structure ---
const initialAdminData = {
    currentUser: null as AdminUser | null,
    academicYear: '2024-2025',
    semester: '1st-sem',
    enrollmentStartDate: new Date('2024-08-01'),
    enrollmentEndDate: new Date('2024-08-15'),
    phasedEnrollmentSchedule: {
        '1st-year': { date: new Date('2024-08-01'), startTime: '08:00', endTime: '17:00' },
        '2nd-year': { date: new Date('2024-08-02'), startTime: '08:00', endTime: '17:00' },
        '3rd-year': { date: new Date('2024-08-03'), startTime: '08:00', endTime: '17:00' },
        '4th-year': { date: new Date('2024-08-04'), startTime: '08:00', endTime: '17:00' },
    },
    academicYearOptions: ['2024-2025', '2023-2024'],
    semesterOptions: [
        { value: '1st-sem', label: '1st Semester' },
        { value: '2nd-sem', label: '2nd Semester' },
        { value: 'summer', label: 'Summer' }
    ],
    instructors: initialInstructors,
    availableSubjects: availableSubjects,
    adminUsers: initialAdminUsers,
    adminRoles: adminRoles,
    pendingApplications: initialPendingApplications,
    approvedApplications: initialApprovedApplications,
    rejectedApplications: initialRejectedApplications,
    blocks: initialBlocks,
    subjects: initialSubjects,
    schedules: initialSchedules,
    students: initialStudentsList,
    grades: initialGrades,
    getCompletedSubjects(studentId: string): { code: string, units: number }[] {
        const studentGrades = this.grades[studentId] || [];
        const passedGrades = studentGrades.filter(g => g.grade <= 3.0);
        
        const allSubjects: Subject[] = Object.values(this.subjects).flat();

        return passedGrades.map(g => {
            const subjectDetails = allSubjects.find(s => s.code === g.subjectCode);
            return { code: g.subjectCode, units: subjectDetails?.units || 0 };
        }).filter(s => s.units > 0);
    },
};

export type AdminDataType = typeof initialAdminData;

interface AdminContextType {
  adminData: AdminDataType | null;
  setAdminData: React.Dispatch<React.SetStateAction<AdminDataType | null>>;
  loading: boolean;
  error: string | null;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [adminData, setAdminData] = useState<AdminDataType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [adminsRes, blocksRes, instructorsRes, subjectsRes] = await Promise.all([
            fetch(`/api/v1/endpoints/read_admin_profiles.php`),
            fetch(`/api/v1/endpoints/read_blocks.php`),
            fetch(`/api/v1/endpoints/read_instructor_profiles.php`),
            fetch(`/api/v1/endpoints/read_subjects.php`),
        ]);

        if (!adminsRes.ok || !blocksRes.ok || !instructorsRes.ok || !subjectsRes.ok) {
            console.error('Failed to fetch one or more resources');
            throw new Error('Failed to fetch initial data from the server.');
        }

        const adminsData = await adminsRes.json();
        const blocksData = await blocksRes.json();
        const instructorsData = await instructorsRes.json();
        const subjectsData = await subjectsRes.json();

        // --- Transform data to match frontend schema ---
        const transformedAdmins = adminsData.records.map((admin: any) => ({
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            avatar: `https://picsum.photos/seed/${admin.id}/40/40` // Placeholder avatar
        }));

        const transformedBlocks = blocksData.records.map((block: any) => ({
            id: block.id,
            name: block.block_name,
            capacity: parseInt(block.capacity, 10),
            enrolled: parseInt(block.enrolled_students, 10),
            course: block.course_name,
            specialization: block.specialization,
            year: block.year_level
        }));

        const transformedInstructors = instructorsData.records.map((inst: any) => ({
            id: inst.id,
            name: inst.name,
            email: inst.email,
            subjects: [], // This needs to be fetched or mapped separately if available
            avatar: `https://picsum.photos/seed/inst-${inst.id}/40/40` // Placeholder avatar
        }));

        const transformedSubjects = subjectsData.records.reduce((acc: YearLevelSubjects, subj: any) => {
            const yearKey = subj.year_level;
            if (!acc[yearKey]) {
                acc[yearKey] = [];
            }
            acc[yearKey].push({
                id: subj.id,
                code: subj.code,
                description: subj.description,
                units: parseInt(subj.units, 10),
                prerequisite: subj.prerequisite
            });
            return acc;
        }, {});
        
        const availableSubjects = subjectsData.records.map((subj: any) => ({
          id: subj.code,
          label: `${subj.code} - ${subj.description}`
        }));

        // Merge fetched data with initial mock data for parts not yet in backend
        setAdminData({
            ...initialAdminData,
            adminUsers: transformedAdmins,
            blocks: transformedBlocks,
            instructors: transformedInstructors,
            subjects: transformedSubjects,
            availableSubjects: availableSubjects,
        });

      } catch (err: any) {
        console.error('API Error:', err);
        setError(`Could not connect to the backend. Please ensure the PHP server is running and accessible. Details: ${err.message}`)
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdminData();
  }, []);


  useEffect(() => {
    // This part handles loading the logged-in user from session storage.
    // It should be kept even when you connect to a backend.
    if (!loading) {
        try {
            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                setAdminData(prev => prev ? { ...prev, currentUser: user } : null);
            }
        } catch (error) {
            console.error("Failed to parse user from sessionStorage", error);
        }
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }
  if (error) {
    return <div className="flex h-screen w-full items-center justify-center p-4 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <AdminContext.Provider value={{ adminData, setAdminData, loading, error }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  // If adminData is null, it means we are still loading or there was an error.
  // The provider handles the loading/error UI, so we can safely assert non-null here
  // in components that are rendered as children of the provider.
  return { ...context, adminData: context.adminData! };
};
