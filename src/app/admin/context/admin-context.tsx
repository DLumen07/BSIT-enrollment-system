
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser, initialAdminUsers, roles as adminRoles } from '../dashboard/administrators/page';
import { Subject as ScheduleSubject } from '../dashboard/schedule/[blockId]/page';

// --- Data from instructors ---
export type Instructor = {
    id: number;
    name: string;
    email: string;
    subjects: string[];
    avatar: string;
};
export const initialInstructors: Instructor[] = [
    { id: 1, name: 'Dr. Alan Turing', email: 'alan.turing@university.edu', subjects: ['IT 101', 'IT 201'], avatar: 'https://picsum.photos/seed/at-avatar/40/40' },
    { id: 2, name: 'Prof. Ada Lovelace', email: 'ada.lovelace@university.edu', subjects: ['MATH 101'], avatar: 'https://picsum.photos/seed/al-avatar/40/40' },
    { id: 3, name: 'Dr. Grace Hopper', email: 'grace.hopper@university.edu', subjects: ['IT 301', 'IT 401'], avatar: 'https://picsum.photos/seed/gh-avatar/40/40' },
    { id: 4, name: 'Mr. Charles Babbage', email: 'charles.babbage@university.edu', subjects: ['ENG 101'], avatar: 'https://picsum.photos/seed/cb-avatar/40/40' },
];
export const availableSubjects = [
    { id: 'IT 101', label: 'IT 101 - Intro to Computing' },
    { id: 'IT 201', label: 'IT 201 - Data Structures' },
    { id: 'IT 301', label: 'IT 301 - Web Development' },
    { id: 'IT 401', label: 'IT 401 - Capstone Project' },
    { id: 'MATH 101', label: 'MATH 101 - Calculus 1' },
    { id: 'ENG 101', label: 'ENG 101 - English Composition' },
];


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
const initialBlocks: Block[] = [
    { id: 1, name: `ACT 1-A`, capacity: 40, enrolled: 38, course: 'ACT', year: '1st-year' },
    { id: 2, name: `ACT 1-B`, capacity: 40, enrolled: 35, course: 'ACT', year: '1st-year' },
    { id: 3, name: `ACT 2-A`, capacity: 40, enrolled: 32, course: 'ACT', year: '2nd-year' },
    { id: 4, name: `BSIT 3-A`, capacity: 40, enrolled: 28, course: 'BSIT', specialization: 'AP', year: '3rd-year' },
    { id: 5, name: `BSIT 3-B`, capacity: 40, enrolled: 30, course: 'BSIT', specialization: 'DD', year: '3rd-year' },
    { id: 6, name: `BSIT 4-A`, capacity: 40, enrolled: 25, course: 'BSIT', specialization: 'AP', year: '4th-year' },
];
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
const initialSubjects: YearLevelSubjects = {
    '1st-year': [
        { id: 101, code: 'IT 101', description: 'Introduction to Computing', units: 3 },
        { id: 102, code: 'MATH 101', description: 'Calculus 1', units: 3 },
    ],
    '2nd-year': [ 
        { id: 201, code: 'IT 201', description: 'Data Structures & Algorithms', units: 3, prerequisite: 'IT 101' }, 
    ],
    '3rd-year': [
        { id: 301, code: 'IT 301', description: 'Object-Oriented Programming', units: 3, prerequisite: 'IT 201' },
    ], 
    '4th-year': [],
};

// --- Data from schedule ---
const initialScheduleSubjects: ScheduleSubject[] = [
    { id: 1, code: 'IT 101', description: 'Intro to Computing', day: 'Monday', startTime: '09:00', endTime: '10:30', instructor: 'Dr. Alan Turing', color: 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400' },
    { id: 2, code: 'MATH 101', description: 'Calculus I', day: 'Tuesday', startTime: '13:00', endTime: '14:30', instructor: 'Prof. Ada Lovelace', color: 'bg-green-200/50 dark:bg-green-800/50 border-green-400' },
];
const initialSchedules: Record<string, ScheduleSubject[]> = {
    "ACT 1-A": initialScheduleSubjects,
    "ACT 1-B": [{ id: 10, code: 'IT 101', description: 'Intro to Computing', day: 'Tuesday', startTime: '09:00', endTime: '10:30', instructor: 'Dr. Grace Hopper', color: 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400' }],
    "ACT 2-A": [{ id: 20, code: 'IT 201', description: 'Data Structures', day: 'Monday', startTime: '09:00', endTime: '10:30', instructor: 'Prof. Ada Lovelace', color: 'bg-green-200/50 dark:bg-green-800/50 border-green-400' }]
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
const initialStudentsList: Student[] = [
    { id: 1, studentId: '21-00-0123', name: 'Alice Johnson', avatar: 'https://picsum.photos/seed/aj-student/40/40', email: 'alice.j@student.example.com', course: 'BSIT', year: 4, status: 'Not Enrolled', sex: 'Female', phoneNumber: '09123456789', specialization: 'AP' },
    { id: 2, studentId: '22-00-0234', name: 'Bob Williams', avatar: 'https://picsum.photos/seed/bw-student/40/40', email: 'bob.w@student.example.com', course: 'BSIT', year: 3, status: 'Not Enrolled', sex: 'Male', phoneNumber: '09123456780', specialization: 'AP' },
    { id: 3, studentId: '23-00-0345', name: 'Charlie Brown', avatar: 'https://picsum.photos/seed/cb-student/40/40', email: 'charlie.b@student.example.com', course: 'ACT', year: 2, status: 'Enrolled', sex: 'Male', phoneNumber: '09123456781', block: 'ACT 2-A' },
    { id: 4, studentId: '23-00-0456', name: 'David Wilson', avatar: 'https://picsum.photos/seed/dw-student/40/40', email: 'david.w@student.example.com', course: 'ACT', year: 2, status: 'Not Enrolled', sex: 'Male', phoneNumber: '09123456782' },
    { id: 7, studentId: '24-00-0101', name: 'Frank Miller', avatar: 'https://picsum.photos/seed/fm-student/40/40', email: 'frank.m@student.example.com', course: 'ACT', year: 1, status: 'Not Enrolled', sex: 'Male', phoneNumber: '09123456783' },
    { id: 8, studentId: '23-00-0102', name: 'Grace Lee', avatar: 'https://picsum.photos/seed/gl-student/40/40', email: 'grace.l@student.example.com', course: 'ACT', year: 2, status: 'Enrolled', sex: 'Female', phoneNumber: '09123456784', block: 'ACT 2-A' },
    { id: 9, studentId: '22-00-0103', name: 'Henry Taylor', avatar: 'https://picsum.photos/seed/ht-student/40/40', email: 'henry.t@student.example.com', course: 'BSIT', year: 3, status: 'Not Enrolled', sex: 'Male', phoneNumber: '09123456785' },
    { id: 10, studentId: '21-00-0104', name: 'Ivy Clark', avatar: 'https://picsum.photos/seed/ic-student/40/40', email: 'ivy.c@student.example.com', course: 'BSIT', year: 4, status: 'Not Enrolled', sex: 'Female', phoneNumber: '09123456786' },
    { id: 11, studentId: '24-00-1001', name: 'Gabby New', avatar: 'https://picsum.photos/seed/gn-student/40/40', email: 'gabby.n@student.example.com', course: 'ACT', year: 1, status: 'Not Enrolled', sex: 'Female', phoneNumber: '09111111111' },
];

// --- Academic Records ---
type Grade = { subjectCode: string; grade: number; };
type StudentGrades = {
    [studentId: string]: Grade[];
};
const initialGrades: StudentGrades = {
    '21-00-0123': [
        { subjectCode: 'IT 101', grade: 1.5 },
        { subjectCode: 'MATH 101', grade: 2.0 },
        { subjectCode: 'IT 201', grade: 1.75 },
    ],
    '22-00-0234': [
        { subjectCode: 'IT 101', grade: 1.25 },
        { subjectCode: 'MATH 101', grade: 1.5 },
        { subjectCode: 'IT 201', grade: 1.75 },
    ],
    '23-00-0345': [
        { subjectCode: 'IT 101', grade: 3.0 },
    ],
    '23-00-0456': [ // David Wilson, not enrolled
         { subjectCode: 'IT 101', grade: 1.0 },
         { subjectCode: 'MATH 101', grade: 1.25 },
    ],
    '24-00-0101': [], // Frank Miller, 1st year, no grades yet
    '23-00-0102': [ // Grace Lee, 2nd year ACT
        { subjectCode: 'IT 101', grade: 1.5 },
        { subjectCode: 'MATH 101', grade: 2.0 },
    ],
    '22-00-0103': [ // Henry Taylor, 3rd year BSIT
        { subjectCode: 'IT 101', grade: 1.25 },
        { subjectCode: 'MATH 101', grade: 1.5 },
        { subjectCode: 'IT 201', grade: 2.0 },
    ],
    '21-00-0104': [ // Ivy Clark, 4th year BSIT
        { subjectCode: 'IT 101', grade: 1.0 },
        { subjectCode: 'MATH 101', grade: 1.25 },
        { subjectCode: 'IT 201', grade: 1.5 },
        { subjectCode: 'IT 301', grade: 1.75 }, // Placeholder for 3rd year subjects
    ],
    '24-00-1001': [], // Gabby New, 1st year, no grades
};

// --- Main Admin Data Structure ---
const mockAdminData = {
    currentUser: null as AdminUser | null,
    academicYear: '2024-2025',
    semester: '1st-sem',
    enrollmentStartDate: new Date('2024-08-01'),
    enrollmentEndDate: new Date('2024-08-15'),
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

export type AdminDataType = typeof mockAdminData;

interface AdminContextType {
  adminData: AdminDataType | null;
  setAdminData: React.Dispatch<React.SetStateAction<AdminDataType | null>>;
  loading: boolean;
  error: string | null;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [adminData, setAdminData] = useState<AdminDataType | null>(mockAdminData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // To connect to a backend, you would fetch data here.
    // The code below is a template for fetching data.
    /*
    const fetchAdminData = async () => {
      try {
        // Replace with your actual API endpoint.
        // Example for a PHP backend: 'https://your-domain.com/api/admin_data.php'
        const response = await fetch('https://your-api.com/admin/data');
        if (!response.ok) {
          throw new Error('Failed to fetch data from the server.');
        }
        const data = await response.json();
        setAdminData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    // Uncomment the line below to enable API fetching
    // fetchAdminData();
    */

    // For now, we are using mock data.
    setLoading(false);
  }, []);


  useEffect(() => {
    // This part handles loading the logged-in user from session storage.
    // It should be kept even when you connect to a backend.
    if (!loading) {
        try {
            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                // Ensure adminData is not null before setting currentUser
                setAdminData(prev => prev ? { ...prev, currentUser: user } : null);
            }
        } catch (error) {
            console.error("Failed to parse user from sessionStorage", error);
        }
    }
  }, [loading]);

  if (loading) {
    return <div>Loading admin dashboard...</div>;
  }
  if (error) {
    return <div>Error: {error}</div>;
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
