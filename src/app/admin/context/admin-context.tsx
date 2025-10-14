
'use client';
import React, { createContext, useContext, useState } from 'react';
import { Instructor, initialInstructors, availableSubjects as initialAvailableSubjects } from '../dashboard/instructors/page';
import { AdminUser, initialAdminUsers, roles as adminRoles } from '../dashboard/administrators/page';
import { Subject as ScheduleSubject } from '../dashboard/schedule/[blockId]/page';

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
export const credentialLabels: { key: keyof Application['credentials']; label: string }[] = [
    { key: 'birthCertificate', label: 'Birth Certificate' },
    { key: 'grades', label: 'Form 138 / Report Card' },
    { key: 'goodMoral', label: 'Good Moral Certificate' },
    { key: 'registrationForm', label: 'Finished Registration Form' },
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
    '3rd-year': [], '4th-year': [],
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
};
const initialStudentsList: Student[] = [
    { id: 1, studentId: '21-00-0123', name: 'Alice Johnson', avatar: 'https://picsum.photos/seed/aj-student/40/40', email: 'alice.j@student.example.com', course: 'BSIT', year: 4, status: 'Enrolled', sex: 'Female', phoneNumber: '09123456789' },
    { id: 2, studentId: '22-00-0234', name: 'Bob Williams', avatar: 'https://picsum.photos/seed/bw-student/40/40', email: 'bob.w@student.example.com', course: 'BSIT', year: 3, status: 'Enrolled', sex: 'Male', phoneNumber: '09123456780' },
    { id: 3, studentId: '23-00-0345', name: 'Charlie Brown', avatar: 'https://picsum.photos/seed/cb-student/40/40', email: 'charlie.b@student.example.com', course: 'ACT', year: 2, status: 'Enrolled', sex: 'Male', phoneNumber: '09123456781' },
    { id: 4, studentId: '23-00-0456', name: 'David Wilson', avatar: 'https://picsum.photos/seed/dw-student/40/40', email: 'david.w@student.example.com', course: 'ACT', year: 2, status: 'Not Enrolled', sex: 'Male', phoneNumber: '09123456782' },
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
    ],
    '23-00-0345': [
        { subjectCode: 'IT 101', grade: 3.0 },
    ],
    '23-00-0456': [ // David Wilson, not enrolled
         { subjectCode: 'IT 101', grade: 1.0 },
         { subjectCode: 'MATH 101', grade: 1.25 },
    ]
};

// --- Main Admin Data Structure ---
const mockAdminData = {
    currentUser: null as AdminUser | null, // Add currentUser
    instructors: initialInstructors,
    availableSubjects: initialAvailableSubjects,
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

type AdminDataType = typeof mockAdminData;

interface AdminContextType {
  adminData: AdminDataType;
  setAdminData: React.Dispatch<React.SetStateAction<AdminDataType>>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [adminData, setAdminData] = useState<AdminDataType>(mockAdminData);

  return (
    <AdminContext.Provider value={{ adminData, setAdminData }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
