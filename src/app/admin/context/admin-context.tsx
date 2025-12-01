
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminUser, initialAdminUsers, roles as adminRoles } from '../data/admin-users';
import { Subject as ScheduleSubject } from '../dashboard/schedule/[blockId]/page';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { resolveMediaUrl } from '@/lib/utils';
import { DATA_SYNC_CHANNEL } from '@/lib/live-sync';

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
    { id: 'IT 101', label: 'IT 101 - Intro to Computing', semester: '1st-sem', yearLevel: 1 },
    { id: 'IT 201', label: 'IT 201 - Data Structures', semester: '1st-sem', yearLevel: 2 },
    { id: 'IT 301', label: 'IT 301 - Web Development', semester: '1st-sem', yearLevel: 3 },
    { id: 'IT 401', label: 'IT 401 - Capstone Project', semester: '2nd-sem', yearLevel: 4 },
    { id: 'MATH 101', label: 'MATH 101 - Calculus 1', semester: '1st-sem', yearLevel: 1 },
    { id: 'ENG 101', label: 'ENG 101 - English Composition', semester: '1st-sem', yearLevel: 1 },
];

const scheduleColorPalette = [
    'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400',
    'bg-green-200/50 dark:bg-green-800/50 border-green-400',
    'bg-yellow-200/50 dark:bg-yellow-800/50 border-yellow-400',
    'bg-orange-200/50 dark:bg-orange-800/50 border-orange-400',
    'bg-purple-200/50 dark:bg-purple-800/50 border-purple-400',
    'bg-pink-200/50 dark:bg-pink-800/50 border-pink-400',
    'bg-red-200/50 dark:bg-red-900/50 border-red-500',
    'bg-indigo-200/50 dark:bg-indigo-800/50 border-indigo-400',
];

const computeScheduleColor = (scheduleId?: number | null, fallbackIndex?: number): string => {
    const paletteLength = scheduleColorPalette.length;
    if (paletteLength === 0) {
        return 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400';
    }

    const base = typeof scheduleId === 'number' && Number.isFinite(scheduleId)
        ? Math.abs(scheduleId)
        : Math.abs(fallbackIndex ?? 0);

    return scheduleColorPalette[base % paletteLength];
};

const normalizeSchedules = (schedules?: Record<string, ScheduleSubject[]>): Record<string, ScheduleSubject[]> => {
    if (!schedules) {
        return {};
    }

    const normalized: Record<string, ScheduleSubject[]> = {};

    for (const [blockName, entries] of Object.entries(schedules)) {
        normalized[blockName] = entries.map((entry, index) => ({
            ...entry,
            color: entry.color ?? computeScheduleColor(entry.id, index),
            room: entry.room ?? null,
        }));
    }

    return normalized;
};

export type TeachingAssignment = {
    id: string;
    academicYear: string;
    semester: string;
    block: string;
    subjectCode: string;
    subjectDescription: string;
    instructorId: number | null;
    instructorName: string;
    instructorEmail: string | null;
};

const resolveInstructorDetails = (
    instructorId: number | null | undefined,
    instructorName: string | null | undefined,
    instructors: Instructor[],
) => {
    if (typeof instructorId === 'number') {
        const matchById = instructors.find((inst) => inst.id === instructorId);
        if (matchById) {
            return matchById;
        }
    }
    const normalizedName = (instructorName ?? '').trim().toLowerCase();
    if (normalizedName === '') {
        return null;
    }
    return instructors.find((inst) => inst.name.trim().toLowerCase() === normalizedName) ?? null;
};

export const deriveTeachingAssignments = (
    schedules: Record<string, ScheduleSubject[]>,
    academicYear: string,
    semester: string,
    instructors: Instructor[] = [],
): TeachingAssignment[] => {
    const assignments: TeachingAssignment[] = [];
    const normalizedYear = academicYear?.trim() || 'Unspecified AY';
    const normalizedSemester = semester?.trim() || 'Unspecified Semester';

    Object.entries(schedules ?? {}).forEach(([blockName, subjects]) => {
        subjects.forEach((subject, index) => {
            const instructorDetails = resolveInstructorDetails(subject.instructorId, subject.instructor, instructors);
            const assignmentId = `${normalizedYear}|${normalizedSemester}|${blockName}|${subject.code}|${index}`;
            assignments.push({
                id: assignmentId,
                academicYear: normalizedYear,
                semester: normalizedSemester,
                block: blockName,
                subjectCode: subject.code,
                subjectDescription: subject.description ?? subject.code,
                instructorId: instructorDetails?.id ?? subject.instructorId ?? null,
                instructorName: instructorDetails?.name ?? subject.instructor ?? 'TBA',
                instructorEmail: instructorDetails?.email ?? null,
            });
        });
    });

    return assignments;
};


// --- Data from manage-applications ---
export type ApplicationStatus = 'New' | 'Old' | 'Transferee';
export type ApplicationCredentials = {
    birthCertificate: boolean;
    grades: boolean;
    goodMoral: boolean;
    registrationForm: boolean;
};

export type EnrollmentApplicationSnapshot = Record<string, unknown> | null;

export type ApplicationDocument = {
    id: number;
    name: string;
    status: 'Submitted' | 'Pending' | 'Approved' | 'Rejected';
    fileName: string;
    filePath: string;
    fileType: string | null;
    fileSize: number | null;
    uploadedAt: string | null;
    updatedAt: string | null;
};

export type Application = {
    id: number;
    studentId: string;
    studentUserId?: number;
    name: string;
    course: 'BSIT' | 'ACT';
    year: number;
    status: ApplicationStatus;
    statusDisplay: string;
    enrollmentTrack: 'Regular' | 'Irregular';
    block?: string | null;
    credentials: ApplicationCredentials;
    rejectionReason?: string | null;
    submittedAt?: string | null;
    formSnapshot?: EnrollmentApplicationSnapshot;
    documents: ApplicationDocument[];
};

const initialPendingApplications: Application[] = [
    { id: 1, studentId: '24-00-0001', studentUserId: 1001, name: 'John Doe', course: 'BSIT', year: 3, status: 'Old', statusDisplay: 'Old', enrollmentTrack: 'Regular', block: 'BSIT 3-A', credentials: { birthCertificate: true, grades: true, goodMoral: false, registrationForm: true }, submittedAt: '2024-07-31T10:00:00Z', documents: [] },
    { id: 2, studentId: '24-00-0002', studentUserId: 1002, name: 'Jane Smith', course: 'ACT', year: 1, status: 'New', statusDisplay: 'New', enrollmentTrack: 'Regular', block: 'ACT 1-A', credentials: { birthCertificate: true, grades: false, goodMoral: true, registrationForm: false }, submittedAt: '2024-07-31T11:15:00Z', documents: [] },
    { id: 3, studentId: '24-00-0003', studentUserId: 1003, name: 'Peter Jones', course: 'BSIT', year: 3, status: 'Transferee', statusDisplay: 'Transferee', enrollmentTrack: 'Regular', block: 'BSIT 3-B', credentials: { birthCertificate: true, grades: true, goodMoral: true, registrationForm: true }, submittedAt: '2024-07-31T13:30:00Z', documents: [] },
];

const initialApprovedApplications: Application[] = [
    { id: 4, studentId: '23-00-0999', studentUserId: 987, name: 'Emily White', course: 'BSIT', year: 3, status: 'Old', statusDisplay: 'Old', enrollmentTrack: 'Regular', block: 'BSIT 3-A', credentials: { birthCertificate: true, grades: true, goodMoral: true, registrationForm: true }, submittedAt: '2024-07-30T09:45:00Z', documents: [] },
    { id: 5, studentId: '22-00-0998', studentUserId: 986, name: 'Chris Green', course: 'ACT', year: 2, status: 'Old', statusDisplay: 'Old', enrollmentTrack: 'Regular', block: 'ACT 2-A', credentials: { birthCertificate: true, grades: true, goodMoral: true, registrationForm: true }, submittedAt: '2024-07-29T14:20:00Z', documents: [] },
];

const initialRejectedApplications: Application[] = [
     { id: 6, studentId: '24-00-0997', studentUserId: 1004, name: 'Michael Brown', course: 'ACT', year: 1, status: 'New', statusDisplay: 'New', enrollmentTrack: 'Regular', block: 'ACT 1-B', credentials: { birthCertificate: false, grades: true, goodMoral: true, registrationForm: true }, rejectionReason: 'Incomplete or missing documents.', submittedAt: '2024-07-31T08:55:00Z', documents: [] },
];
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
export type SemesterValue = '1st-sem' | '2nd-sem' | 'summer';

export type Subject = {
    id: number;
    code: string;
    description: string;
    units: number;
    semester: SemesterValue;
    prerequisites: string[];
    prerequisite?: string | null;
};
export type YearLevelSubjects = Record<string, Subject[]>;
const initialSubjects: YearLevelSubjects = {
    '1st-year': [
        { id: 101, code: 'IT 101', description: 'Introduction to Computing', units: 3, semester: '1st-sem', prerequisite: null, prerequisites: [] },
        { id: 102, code: 'MATH 101', description: 'Calculus 1', units: 3, semester: '1st-sem', prerequisite: null, prerequisites: [] },
    ],
    '2nd-year': [ 
        { id: 201, code: 'IT 201', description: 'Data Structures & Algorithms', units: 3, semester: '1st-sem', prerequisite: 'IT 101', prerequisites: ['IT 101'] }, 
    ],
    '3rd-year': [
        { id: 301, code: 'IT 301', description: 'Object-Oriented Programming', units: 3, semester: '1st-sem', prerequisite: 'IT 201', prerequisites: ['IT 201'] },
    ], 
    '4th-year': [],
};

// --- Data from schedule ---
const initialScheduleSubjects: ScheduleSubject[] = [
    { id: 1, code: 'IT 101', description: 'Intro to Computing', day: 'Monday', startTime: '09:00', endTime: '10:30', instructor: 'Dr. Alan Turing', room: 'Room 101', color: 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400' },
    { id: 2, code: 'MATH 101', description: 'Calculus I', day: 'Tuesday', startTime: '13:00', endTime: '14:30', instructor: 'Prof. Ada Lovelace', room: 'Room 202', color: 'bg-green-200/50 dark:bg-green-800/50 border-green-400' },
];
const initialSchedules: Record<string, ScheduleSubject[]> = normalizeSchedules({
    "ACT 1-A": initialScheduleSubjects,
    "ACT 1-B": [{ id: 10, code: 'IT 101', description: 'Intro to Computing', day: 'Tuesday', startTime: '09:00', endTime: '10:30', instructor: 'Dr. Grace Hopper', room: 'Room 103', color: 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400' }],
    "ACT 2-A": [{ id: 20, code: 'IT 201', description: 'Data Structures', day: 'Monday', startTime: '09:00', endTime: '10:30', instructor: 'Prof. Ada Lovelace', room: 'Room 204', color: 'bg-green-200/50 dark:bg-green-800/50 border-green-400' }]
});
const initialTeachingAssignments = deriveTeachingAssignments(initialSchedules, '2024-2025', '1st-sem', initialInstructors);

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
    promotionHoldReason?: string | null;
    specialization?: 'AP' | 'DD';
    profileStatus?: 'New' | 'Old' | 'Transferee';
    currentTermStatus?: string | null;
    documents?: ApplicationDocument[];
};
const initialStudentsList: Student[] = [
    { id: 1, studentId: '21-00-0123', name: 'Alice Johnson', avatar: 'https://picsum.photos/seed/aj-student/40/40', email: 'alice.j@student.example.com', course: 'BSIT', year: 4, status: 'Not Enrolled', sex: 'Female', phoneNumber: '09123456789', specialization: 'AP', documents: [] },
    { id: 2, studentId: '22-00-0234', name: 'Bob Williams', avatar: 'https://picsum.photos/seed/bw-student/40/40', email: 'bob.w@student.example.com', course: 'BSIT', year: 3, status: 'Not Enrolled', sex: 'Male', phoneNumber: '09123456780', specialization: 'AP', documents: [] },
    { id: 3, studentId: '23-00-0345', name: 'Charlie Brown', avatar: 'https://picsum.photos/seed/cb-student/40/40', email: 'charlie.b@student.example.com', course: 'ACT', year: 2, status: 'Enrolled', sex: 'Male', phoneNumber: '09123456781', block: 'ACT 2-A', documents: [] },
    { id: 4, studentId: '23-00-0456', name: 'David Wilson', avatar: 'https://picsum.photos/seed/dw-student/40/40', email: 'david.w@student.example.com', course: 'ACT', year: 2, status: 'Not Enrolled', sex: 'Male', phoneNumber: '09123456782', documents: [] },
    { id: 7, studentId: '24-00-0101', name: 'Frank Miller', avatar: 'https://picsum.photos/seed/fm-student/40/40', email: 'frank.m@student.example.com', course: 'ACT', year: 1, status: 'Not Enrolled', sex: 'Male', phoneNumber: '09123456783', documents: [] },
    { id: 8, studentId: '23-00-0102', name: 'Grace Lee', avatar: 'https://picsum.photos/seed/gl-student/40/40', email: 'grace.l@student.example.com', course: 'ACT', year: 2, status: 'Enrolled', sex: 'Female', phoneNumber: '09123456784', block: 'ACT 2-A', documents: [] },
    { id: 9, studentId: '22-00-0103', name: 'Henry Taylor', avatar: 'https://picsum.photos/seed/ht-student/40/40', email: 'henry.t@student.example.com', course: 'BSIT', year: 3, status: 'Not Enrolled', sex: 'Male', phoneNumber: '09123456785', documents: [] },
    { id: 10, studentId: '21-00-0104', name: 'Ivy Clark', avatar: 'https://picsum.photos/seed/ic-student/40/40', email: 'ivy.c@student.example.com', course: 'BSIT', year: 4, status: 'Not Enrolled', sex: 'Female', phoneNumber: '09123456786', documents: [] },
    { id: 11, studentId: '24-00-1001', name: 'Gabby New', avatar: 'https://picsum.photos/seed/gn-student/40/40', email: 'gabby.n@student.example.com', course: 'ACT', year: 1, status: 'Not Enrolled', sex: 'Female', phoneNumber: '09111111111', documents: [] },
];

// --- Academic Records ---
type GradeTermKey = 'prelim' | 'midterm' | 'final';
type GradeValue = number | 'INC' | null;

type GradeTerm = {
    term: GradeTermKey;
    grade: GradeValue;
    weight: number | null;
    encodedAt: string | null;
};

type GradeTermMap = Partial<Record<GradeTermKey, GradeTerm>>;

type Grade = {
    id?: number | null;
    subjectCode: string;
    subjectDescription?: string | null;
    units?: number | null;
    grade: GradeValue;
    academicYear?: string | null;
    semester?: string | null;
    remark?: string | null;
    gradedAt?: string | null;
    terms: GradeTermMap;
};

type StudentGrades = {
    [studentId: string]: Grade[];
};
const initialGrades: StudentGrades = {
    '21-00-0123': [
        { subjectCode: 'IT 101', grade: 1.5, terms: {} },
        { subjectCode: 'MATH 101', grade: 2.0, terms: {} },
        { subjectCode: 'IT 201', grade: 1.75, terms: {} },
    ],
    '22-00-0234': [
        { subjectCode: 'IT 101', grade: 1.25, terms: {} },
        { subjectCode: 'MATH 101', grade: 1.5, terms: {} },
        { subjectCode: 'IT 201', grade: 1.75, terms: {} },
    ],
    '23-00-0345': [
        { subjectCode: 'IT 101', grade: 3.0, terms: {} },
    ],
    '23-00-0456': [ // David Wilson, not enrolled
         { subjectCode: 'IT 101', grade: 1.0, terms: {} },
         { subjectCode: 'MATH 101', grade: 1.25, terms: {} },
    ],
    '24-00-0101': [], // Frank Miller, 1st year, no grades yet
    '23-00-0102': [ // Grace Lee, 2nd year ACT
        { subjectCode: 'IT 101', grade: 1.5, terms: {} },
        { subjectCode: 'MATH 101', grade: 2.0, terms: {} },
    ],
    '22-00-0103': [ // Henry Taylor, 3rd year BSIT
        { subjectCode: 'IT 101', grade: 1.25, terms: {} },
        { subjectCode: 'MATH 101', grade: 1.5, terms: {} },
        { subjectCode: 'IT 201', grade: 2.0, terms: {} },
    ],
    '21-00-0104': [ // Ivy Clark, 4th year BSIT
        { subjectCode: 'IT 101', grade: 1.0, terms: {} },
        { subjectCode: 'MATH 101', grade: 1.25, terms: {} },
        { subjectCode: 'IT 201', grade: 1.5, terms: {} },
        { subjectCode: 'IT 301', grade: 1.75, terms: {} }, // Placeholder for 3rd year subjects
    ],
    '24-00-1001': [], // Gabby New, 1st year, no grades
};

export type AdminReportTerm = {
    academicYear: string;
    semester: string;
    semesterLabel: string;
};

export type AdminReportSummary = {
    totalStudents: number;
    totalEnrollees: number;
    newStudents: number;
    oldStudents: number;
    transferees: number;
    onHoldStudents: number;
    notEnrolledStudents: number;
    graduatedStudents: number;
};

export type AdminReportDistributionEntry = {
    yearLevel: number;
    yearKey: string;
    label: string;
    students: number;
};

export type AdminReportMasterListEntry = {
    id: string;
    name: string;
    course: string;
    year: number;
    status: string;
    block?: string | null;
    email?: string | null;
    enrollmentStatus: string;
};

export type AdminReportsPayload = {
    terms: AdminReportTerm[];
    byTerm: Record<string, {
        academicYear: string;
        semester: string;
        semesterLabel: string;
        summary: AdminReportSummary;
        yearLevelDistribution: AdminReportDistributionEntry[];
        masterList: AdminReportMasterListEntry[];
    }>;
};

export type AdminAnnouncement = {
    id: number;
    title: string;
    message: string;
    audience: 'All' | 'Students' | 'Instructors';
    createdAt: string;
    createdBy: {
        id: number | null;
        name: string;
        email: string | null;
    };
};

// --- Main Admin Data Structure ---
const mockAdminData = {
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
    activeEnrollmentPhase: 'all',
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
    announcements: [] as AdminAnnouncement[],
    blocks: initialBlocks,
    subjects: initialSubjects,
    schedules: initialSchedules,
    teachingAssignments: initialTeachingAssignments,
    students: initialStudentsList,
    grades: initialGrades,
    reports: {
        terms: [],
        byTerm: {},
    } as AdminReportsPayload,
    getCompletedSubjects(studentId: string): { code: string, units: number }[] {
        const studentGrades = this.grades[studentId] || [];
        const passedGrades = studentGrades.filter(g => typeof g.grade === 'number' && g.grade <= 3.0);
        
        const allSubjects: Subject[] = Object.values(this.subjects).flat();

        return passedGrades.map(g => {
            const subjectDetails = allSubjects.find(s => s.code === g.subjectCode);
            return { code: g.subjectCode, units: subjectDetails?.units || 0 };
        }).filter(s => s.units > 0);
    },
};

const ADMIN_DATA_ENDPOINT = process.env.NEXT_PUBLIC_BSIT_ADMIN_DATA_ENDPOINT ?? 'http://localhost/bsit_api/admin_data.php';
const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
    .replace(/\/+$/, '')
    .trim();

const normalizeAvatarValue = (value?: string | null): string => {
    const resolved = resolveMediaUrl(value ?? null, API_BASE_URL);
    if (resolved) {
        return resolved;
    }
    return typeof value === 'string' ? value.trim() : '';
};

type AnnouncementPayload = Partial<AdminAnnouncement> & {
    createdBy?: Partial<AdminAnnouncement['createdBy']> | null;
    created_by?: number | null;
    created_at?: string | null;
    createdByName?: string | null;
    createdByEmail?: string | null;
    created_by_name?: string | null;
    created_by_email?: string | null;
};

type BackendApplicationRecord = Partial<Application> & {
    credentials?: Partial<ApplicationCredentials> | null;
    documents?: Array<Partial<ApplicationDocument> | null> | null;
};

type BackendAdminDataPayload = {
    adminUsers?: AdminUser[];
    availableSubjects?: typeof availableSubjects;
    subjectsByYear?: YearLevelSubjects;
    blocks?: Block[];
    students?: Student[];
    grades?: StudentGrades;
    instructors?: Instructor[];
    schedules?: Record<string, ScheduleSubject[]>;
    pendingApplications?: BackendApplicationRecord[];
    approvedApplications?: BackendApplicationRecord[];
    rejectedApplications?: BackendApplicationRecord[];
    reports?: AdminReportsPayload;
    academicYear?: string;
    semester?: string;
    enrollmentStartDate?: string | null;
    enrollmentEndDate?: string | null;
    phasedEnrollmentSchedule?: Record<string, {
        date?: string | null;
        startTime?: string | null;
        endTime?: string | null;
    }>;
    academicYearOptions?: string[];
    semesterOptions?: Array<{ value: string; label: string }>;
    announcements?: AnnouncementPayload[];
    activeEnrollmentPhase?: string | null;
};

type AdminApiResponse =
    | { status: 'success'; data?: BackendAdminDataPayload }
    | { status: 'error'; message?: string };

export type AdminDataType = typeof mockAdminData;

const normalizeSubjects = (subjects?: Record<string, Array<Partial<Subject> & { semester?: string | null }>>): YearLevelSubjects => {
    if (!subjects) {
        return {};
    }

    const allowedSemesters: SemesterValue[] = ['1st-sem', '2nd-sem', 'summer'];

    const normalized: YearLevelSubjects = {};

    for (const [yearKey, entries] of Object.entries(subjects)) {
        if (!Array.isArray(entries)) {
            normalized[yearKey] = [];
            continue;
        }

        normalized[yearKey] = entries.map((entry) => {
            const fallbackSemester = (typeof entry.semester === 'string' && allowedSemesters.includes(entry.semester as SemesterValue))
                ? (entry.semester as SemesterValue)
                : '1st-sem';

            const prerequisitesFromArray = Array.isArray((entry as Record<string, unknown>).prerequisites)
                ? ((entry as Record<string, unknown>).prerequisites as unknown[])
                    .filter((value) => typeof value === 'string' && value.trim() !== '')
                    .map((value) => (value as string).trim().toUpperCase())
                : [];

            const fallbackSingle = typeof entry.prerequisite === 'string' && entry.prerequisite.trim() !== ''
                ? entry.prerequisite.trim().toUpperCase()
                : null;

            const mergedPrereqs = [...prerequisitesFromArray];
            if (fallbackSingle && !mergedPrereqs.includes(fallbackSingle)) {
                mergedPrereqs.push(fallbackSingle);
            }

            const uniquePrereqs = Array.from(new Set(mergedPrereqs));

            return {
                id: Number.isFinite(Number(entry.id)) ? Number(entry.id) : 0,
                code: typeof entry.code === 'string' ? entry.code : '',
                description: typeof entry.description === 'string' ? entry.description : '',
                units: Number.isFinite(Number(entry.units)) ? Number(entry.units) : 0,
                prerequisites: uniquePrereqs,
                prerequisite: uniquePrereqs[0] ?? null,
                semester: fallbackSemester,
            } satisfies Subject;
        });
    }

    return normalized;
};

const normalizeGrades = (grades?: StudentGrades): StudentGrades => {
    if (!grades) {
        return {};
    }

    const normalized: StudentGrades = {};

    for (const [studentId, entries] of Object.entries(grades)) {
        normalized[studentId] = entries.map((entry) => ({
            ...entry,
            grade: typeof entry.grade === 'number' ? entry.grade : null,
            terms: entry.terms ?? {},
        }));
    }

    return normalized;
};

const normalizeAnnouncements = (entries?: AnnouncementPayload[]): AdminAnnouncement[] => {
    if (!Array.isArray(entries)) {
        return [];
    }

    const toId = (value: unknown): number | null => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    const normalized = entries
        .map((entry) => {
            const createdByRaw = entry.createdBy && typeof entry.createdBy === 'object' ? entry.createdBy : null;

            const createdById = createdByRaw && 'id' in createdByRaw
                ? toId((createdByRaw as Record<string, unknown>).id ?? null)
                : toId(entry.created_by ?? null);

            const nameCandidates: Array<string> = [];
            if (createdByRaw && 'name' in createdByRaw && typeof (createdByRaw as Record<string, unknown>).name === 'string') {
                nameCandidates.push(((createdByRaw as Record<string, unknown>).name as string).trim());
            }
            if (typeof entry.createdByName === 'string') {
                nameCandidates.push(entry.createdByName.trim());
            }
            if (typeof entry.created_by_name === 'string') {
                nameCandidates.push(entry.created_by_name.trim());
            }
            nameCandidates.push('System');

            const createdByName = nameCandidates.find((value) => value !== '') ?? 'System';

            const emailCandidates: Array<string> = [];
            if (createdByRaw && 'email' in createdByRaw && typeof (createdByRaw as Record<string, unknown>).email === 'string') {
                emailCandidates.push(((createdByRaw as Record<string, unknown>).email as string).trim());
            }
            if (typeof entry.createdByEmail === 'string') {
                emailCandidates.push(entry.createdByEmail.trim());
            }
            if (typeof entry.created_by_email === 'string') {
                emailCandidates.push(entry.created_by_email.trim());
            }

            const createdByEmail = emailCandidates.find((value) => value !== '') ?? null;

            const createdAt = typeof entry.createdAt === 'string' && entry.createdAt !== ''
                ? entry.createdAt
                : (typeof entry.created_at === 'string' ? entry.created_at : '');

            const title = typeof entry.title === 'string' ? entry.title : '';
            const message = typeof entry.message === 'string' ? entry.message : '';
            const rawAudience = typeof entry.audience === 'string' ? entry.audience : 'Students';
            const audience: AdminAnnouncement['audience'] = rawAudience === 'All' || rawAudience === 'Instructors'
                ? rawAudience
                : 'Students';

            return {
                id: Number.isFinite(Number(entry.id)) ? Number(entry.id) : 0,
                title,
                message,
                audience,
                createdAt,
                createdBy: {
                    id: createdById,
                    name: createdByName,
                    email: createdByEmail !== null && createdByEmail !== '' ? createdByEmail : null,
                },
            } as AdminAnnouncement;
        })
        .filter((announcement) => announcement.title !== '' && announcement.message !== '');

    normalized.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return normalized;
};

type TeachingAssignmentPayload = Partial<TeachingAssignment> & {
    block?: string;
    subjectCode?: string;
    subjectDescription?: string;
    instructorName?: string;
};

const normalizeTeachingAssignments = (
    entries: TeachingAssignmentPayload[] | undefined,
    schedules: Record<string, ScheduleSubject[]>,
    academicYear: string,
    semester: string,
    instructors: Instructor[],
): TeachingAssignment[] => {
    if (Array.isArray(entries) && entries.length > 0) {
        return entries
            .map((entry, index) => {
                const instructorDetails = resolveInstructorDetails(entry.instructorId ?? null, entry.instructorName ?? null, instructors);
                return {
                    id: typeof entry.id === 'string' && entry.id.trim() !== ''
                        ? entry.id
                        : `${academicYear}|${semester}|${entry.block ?? 'block'}|${entry.subjectCode ?? 'subject'}|${index}`,
                    academicYear: entry.academicYear?.trim() || academicYear,
                    semester: entry.semester?.trim() || semester,
                    block: entry.block ?? 'Unassigned',
                    subjectCode: entry.subjectCode ?? 'Unknown Subject',
                    subjectDescription: entry.subjectDescription ?? entry.subjectCode ?? 'Unnamed Subject',
                    instructorId: instructorDetails?.id ?? entry.instructorId ?? null,
                    instructorName: instructorDetails?.name ?? entry.instructorName ?? 'TBA',
                    instructorEmail: instructorDetails?.email ?? entry.instructorEmail ?? null,
                } satisfies TeachingAssignment;
            })
            .filter((assignment) => assignment.block && assignment.subjectCode);
    }

    return deriveTeachingAssignments(schedules, academicYear, semester, instructors);
};

const mergeTeachingAssignments = (
    previous: TeachingAssignment[] | undefined,
    incoming: TeachingAssignment[] | undefined,
): TeachingAssignment[] => {
    const assignmentMap = new Map<string, TeachingAssignment>();
    (previous ?? []).forEach((assignment) => {
        assignmentMap.set(assignment.id, assignment);
    });
    (incoming ?? []).forEach((assignment) => {
        assignmentMap.set(assignment.id, assignment);
    });

    return Array.from(assignmentMap.values()).sort((a, b) => {
        if (a.academicYear === b.academicYear) {
            if (a.semester === b.semester) {
                if (a.block === b.block) {
                    return a.subjectCode.localeCompare(b.subjectCode);
                }
                return a.block.localeCompare(b.block);
            }
            return a.semester.localeCompare(b.semester);
        }
        return b.academicYear.localeCompare(a.academicYear);
    });
};

const TEACHING_ASSIGNMENTS_STORAGE_KEY = 'bsit_teaching_assignments_history_v1';

const normalizeStoredTeachingAssignment = (entry: Partial<TeachingAssignment> | null | undefined): TeachingAssignment | null => {
    if (!entry || typeof entry !== 'object') {
        return null;
    }

    const sanitize = (value: unknown, fallback = ''): string => {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed === '' ? fallback : trimmed;
        }
        return fallback;
    };

    const subjectCode = sanitize(entry.subjectCode);
    if (subjectCode === '') {
        return null;
    }

    const academicYear = sanitize(entry.academicYear, 'Unspecified AY');
    const semester = sanitize(entry.semester, 'Unspecified Semester');
    const block = sanitize(entry.block, 'Unassigned');
    const subjectDescription = sanitize(entry.subjectDescription, subjectCode);
    const instructorName = sanitize(entry.instructorName, 'TBA');
    const instructorEmail = sanitize(entry.instructorEmail) || null;
    const instructorId = typeof entry.instructorId === 'number' && Number.isFinite(entry.instructorId)
        ? entry.instructorId
        : null;

    const normalizedId = typeof entry.id === 'string' && entry.id.trim() !== ''
        ? entry.id.trim()
        : `${academicYear}|${semester}|${block}|${subjectCode}|${instructorEmail ?? instructorName}`;

    return {
        id: normalizedId,
        academicYear,
        semester,
        block,
        subjectCode,
        subjectDescription,
        instructorId,
        instructorName,
        instructorEmail,
    } satisfies TeachingAssignment;
};

const readTeachingAssignmentsFromStorage = (): TeachingAssignment[] => {
    if (typeof window === 'undefined') {
        return [];
    }

    try {
        const raw = window.localStorage.getItem(TEACHING_ASSIGNMENTS_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((entry) => normalizeStoredTeachingAssignment(entry))
            .filter((assignment): assignment is TeachingAssignment => Boolean(assignment));
    } catch (error) {
        console.warn('[AdminProvider] Failed to read teaching assignments history from storage.', error);
        return [];
    }
};

const computeAssignmentsSignature = (assignments: TeachingAssignment[] = []): string => (
    assignments.map((assignment) => assignment.id).join('|')
);

const normalizeApplications = (entries?: BackendApplicationRecord[]): Application[] => {
    if (!Array.isArray(entries)) {
        return [];
    }

    const toBoolean = (value: unknown, fallback = false): boolean => {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'number') {
            return value === 1;
        }
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
                return true;
            }
            if (normalized === '0' || normalized === 'false' || normalized === 'no') {
                return false;
            }
        }
        return fallback;
    };

    const normalizeStatus = (value: unknown): ApplicationStatus => {
        if (value === 'New' || value === 'Old' || value === 'Transferee') {
            return value;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim().toLowerCase();
            if (trimmed === 'new') {
                return 'New';
            }
            if (trimmed === 'transferee') {
                return 'Transferee';
            }
        }
        return 'Old';
    };

    const normalizeDocumentStatus = (value: unknown): ApplicationDocument['status'] => {
        if (value === 'Pending' || value === 'Rejected' || value === 'Submitted') {
            return value;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim().toLowerCase();
            if (trimmed === 'pending') {
                return 'Pending';
            }
            if (trimmed === 'rejected') {
                return 'Rejected';
            }
        }
        return 'Submitted';
    };

    return entries.map((entry) => {
        const credentialsRaw = entry.credentials ?? {};
        const documentsRaw = Array.isArray(entry.documents) ? entry.documents : [];

        const courseValue = typeof entry.course === 'string' ? entry.course.trim().toUpperCase() : '';
        const yearValue = Number(entry.year);
        const studentUserIdValue = Number(entry.studentUserId);

        const blockValue = typeof entry.block === 'string' && entry.block.trim() !== ''
            ? entry.block.trim()
            : null;

        const documents = documentsRaw
            .filter((doc): doc is Partial<ApplicationDocument> => !!doc && typeof doc === 'object')
            .map((doc) => {
                const sizeValue = typeof doc.fileSize === 'number'
                    ? doc.fileSize
                    : Number(doc.fileSize);
                const normalizedSize = Number.isFinite(sizeValue) && sizeValue >= 0 ? Number(sizeValue) : null;

                return {
                    id: Number.isFinite(Number(doc.id)) ? Number(doc.id) : 0,
                    name: typeof doc.name === 'string' ? doc.name : '',
                    status: normalizeDocumentStatus(doc.status),
                    fileName: typeof doc.fileName === 'string' ? doc.fileName : '',
                    filePath: typeof doc.filePath === 'string' ? doc.filePath : '',
                    fileType: typeof doc.fileType === 'string' && doc.fileType !== '' ? doc.fileType : null,
                    fileSize: normalizedSize,
                    uploadedAt: typeof doc.uploadedAt === 'string' && doc.uploadedAt !== '' ? doc.uploadedAt : null,
                    updatedAt: typeof doc.updatedAt === 'string' && doc.updatedAt !== '' ? doc.updatedAt : null,
                } satisfies ApplicationDocument;
            });

        return {
            id: Number.isFinite(Number(entry.id)) ? Number(entry.id) : 0,
            studentId: typeof entry.studentId === 'string' ? entry.studentId : '',
            studentUserId: Number.isFinite(studentUserIdValue) && studentUserIdValue > 0 ? studentUserIdValue : undefined,
            name: typeof entry.name === 'string' ? entry.name : '',
            course: courseValue === 'ACT' ? 'ACT' : 'BSIT',
            year: Number.isFinite(yearValue) && yearValue > 0 ? Number(yearValue) : 0,
            status: normalizeStatus(entry.status),
            block: blockValue,
            credentials: {
                birthCertificate: toBoolean(credentialsRaw.birthCertificate, false),
                grades: toBoolean(credentialsRaw.grades, false),
                goodMoral: toBoolean(credentialsRaw.goodMoral, false),
                registrationForm: toBoolean(credentialsRaw.registrationForm, false),
            },
            rejectionReason: typeof entry.rejectionReason === 'string' && entry.rejectionReason !== ''
                ? entry.rejectionReason
                : null,
            submittedAt: typeof entry.submittedAt === 'string' && entry.submittedAt !== ''
                ? entry.submittedAt
                : null,
            formSnapshot: entry.formSnapshot ?? null,
            documents,
        } satisfies Application;
    });
};

const normalizeReports = (reports?: AdminReportsPayload): AdminReportsPayload => {
    if (!reports) {
        return { terms: [], byTerm: {} };
    }

    const safeNumber = (value: unknown): number => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const terms: AdminReportTerm[] = Array.isArray(reports.terms)
        ? reports.terms
              .filter((term): term is AdminReportTerm => (
                  term !== null
                  && typeof term === 'object'
                  && typeof term.academicYear === 'string'
                  && term.academicYear.trim() !== ''
                  && typeof term.semester === 'string'
                  && term.semester.trim() !== ''
              ))
              .map((term) => ({
                  academicYear: term.academicYear,
                  semester: term.semester,
                  semesterLabel: term.semesterLabel || term.semester,
              }))
        : [];

    const byTerm: AdminReportsPayload['byTerm'] = {};
    if (reports.byTerm && typeof reports.byTerm === 'object') {
        for (const [key, value] of Object.entries(reports.byTerm)) {
            if (!value || typeof value !== 'object') {
                continue;
            }

            const academicYear = typeof value.academicYear === 'string' ? value.academicYear : '';
            const semester = typeof value.semester === 'string' ? value.semester : '';
            if (academicYear === '' || semester === '') {
                continue;
            }

            const summary = value.summary ?? {};
            const yearLevelDistribution = Array.isArray(value.yearLevelDistribution)
                ? value.yearLevelDistribution.map((entry) => ({
                    yearLevel: safeNumber(entry?.yearLevel ?? 0),
                    yearKey: typeof entry?.yearKey === 'string' ? entry.yearKey : 'unassigned',
                    label: typeof entry?.label === 'string' && entry.label !== '' ? entry.label : 'Unassigned',
                    students: safeNumber(entry?.students ?? 0),
                }))
                : [];

            const masterList = Array.isArray(value.masterList)
                ? value.masterList.map((entry) => ({
                    id: typeof entry?.id === 'string' ? entry.id : '',
                    name: typeof entry?.name === 'string' ? entry.name : '',
                    course: typeof entry?.course === 'string' ? entry.course : '',
                    year: safeNumber(entry?.year ?? 0),
                    status: typeof entry?.status === 'string' && entry.status !== '' ? entry.status : 'Old',
                    block: typeof entry?.block === 'string' ? entry.block : null,
                    email: typeof entry?.email === 'string' ? entry.email : null,
                    enrollmentStatus: typeof entry?.enrollmentStatus === 'string' ? entry.enrollmentStatus : '',
                }))
                : [];

            byTerm[key] = {
                academicYear,
                semester,
                semesterLabel: typeof value.semesterLabel === 'string' && value.semesterLabel !== ''
                    ? value.semesterLabel
                    : semester,
                summary: {
                    totalStudents: safeNumber(summary.totalStudents ?? 0),
                    totalEnrollees: safeNumber(summary.totalEnrollees ?? 0),
                    newStudents: safeNumber(summary.newStudents ?? 0),
                    oldStudents: safeNumber(summary.oldStudents ?? 0),
                    transferees: safeNumber(summary.transferees ?? 0),
                    onHoldStudents: safeNumber(summary.onHoldStudents ?? 0),
                    notEnrolledStudents: safeNumber(summary.notEnrolledStudents ?? 0),
                    graduatedStudents: safeNumber(summary.graduatedStudents ?? 0),
                },
                yearLevelDistribution,
                masterList,
            };
        }
    }

    return { terms, byTerm };
};

const buildGetCompletedSubjects = (
    subjects: YearLevelSubjects,
    grades: StudentGrades,
): AdminDataType['getCompletedSubjects'] => {
    const flattenedSubjects = Object.values(subjects).flat();
    return (studentId: string) => {
        const studentGrades = grades[studentId] ?? [];
        return studentGrades
            .filter((grade) => typeof grade.grade === 'number' && grade.grade <= 3)
            .map((grade) => {
                const subjectDetails = flattenedSubjects.find((subject) => subject.code === grade.subjectCode);
                return {
                    code: grade.subjectCode,
                    units: subjectDetails?.units ?? 0,
                };
            })
            .filter((subject) => subject.units > 0);
    };
};

const createAdminDataFromPayload = (
    payload?: BackendAdminDataPayload | null,
): AdminDataType => {
    const subjects = normalizeSubjects(payload?.subjectsByYear);
    const grades = normalizeGrades(payload?.grades);
    const schedules = normalizeSchedules(payload?.schedules);

    const parseDate = (value?: string | null): Date | null => {
        if (!value) {
            return null;
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const academicYear = payload?.academicYear ?? mockAdminData.academicYear;
    const semester = payload?.semester ?? mockAdminData.semester;
    const enrollmentStartDate = parseDate(payload?.enrollmentStartDate ?? null) ?? mockAdminData.enrollmentStartDate;
    const enrollmentEndDate = parseDate(payload?.enrollmentEndDate ?? null) ?? mockAdminData.enrollmentEndDate;
    const activeEnrollmentPhase = (() => {
        if (typeof payload?.activeEnrollmentPhase === 'string' && payload.activeEnrollmentPhase.trim() !== '') {
            return payload.activeEnrollmentPhase.trim().toLowerCase();
        }
        return mockAdminData.activeEnrollmentPhase;
    })();

    const phasedEnrollmentSchedule = (() => {
        const incoming = payload?.phasedEnrollmentSchedule;
        if (!incoming || typeof incoming !== 'object') {
            return mockAdminData.phasedEnrollmentSchedule;
        }

        const normalized: typeof mockAdminData.phasedEnrollmentSchedule = {};
        for (const [key, entry] of Object.entries(incoming)) {
            if (!entry || typeof entry !== 'object') {
                continue;
            }
            const parsedDate = parseDate(typeof entry.date === 'string' ? entry.date : null);
            normalized[key] = {
                date: parsedDate ?? (mockAdminData.phasedEnrollmentSchedule[key]?.date ?? enrollmentStartDate),
                startTime: typeof entry.startTime === 'string' && entry.startTime !== ''
                    ? entry.startTime
                    : (mockAdminData.phasedEnrollmentSchedule[key]?.startTime ?? ''),
                endTime: typeof entry.endTime === 'string' && entry.endTime !== ''
                    ? entry.endTime
                    : (mockAdminData.phasedEnrollmentSchedule[key]?.endTime ?? ''),
            };
        }

        return Object.keys(normalized).length > 0 ? normalized : mockAdminData.phasedEnrollmentSchedule;
    })();

    const academicYearOptions = (() => {
        if (Array.isArray(payload?.academicYearOptions) && payload.academicYearOptions.length > 0) {
            return payload.academicYearOptions;
        }
        return mockAdminData.academicYearOptions;
    })();

    const semesterOptions = (() => {
        if (Array.isArray(payload?.semesterOptions) && payload.semesterOptions.length > 0) {
            return payload.semesterOptions;
        }
        return mockAdminData.semesterOptions;
    })();

    const adminUsers = Array.isArray(payload?.adminUsers)
        ? payload.adminUsers.map((admin) => ({
            ...admin,
            avatar: normalizeAvatarValue(admin.avatar),
        }))
        : [];

    const instructors = Array.isArray(payload?.instructors)
        ? payload.instructors.map((instructor) => ({
            ...instructor,
            avatar: normalizeAvatarValue(instructor.avatar),
        }))
        : [];

    const students = Array.isArray(payload?.students)
        ? payload.students.map((student) => ({
            ...student,
            avatar: normalizeAvatarValue(student.avatar),
            documents: Array.isArray(student.documents)
                ? student.documents.map((doc) => ({
                    ...doc,
                    status: typeof doc.status === 'string' && doc.status.trim() !== ''
                        ? doc.status
                        : 'Submitted',
                }))
                : [],
            promotionHoldReason: student.promotionHoldReason ?? null,
        }))
        : [];

    const announcements = normalizeAnnouncements(payload?.announcements);

    const reports = normalizeReports(payload?.reports);

    const pendingApplications = normalizeApplications(payload?.pendingApplications);
    const approvedApplications = normalizeApplications(payload?.approvedApplications);
    const rejectedApplications = normalizeApplications(payload?.rejectedApplications);

    return {
        ...mockAdminData,
        academicYear,
        semester,
        enrollmentStartDate,
        enrollmentEndDate,
        phasedEnrollmentSchedule,
        activeEnrollmentPhase,
        academicYearOptions,
        semesterOptions,
        adminUsers,
        availableSubjects: payload?.availableSubjects ?? [],
        instructors,
        blocks: payload?.blocks ?? [],
        subjects,
        schedules,
        teachingAssignments: normalizeTeachingAssignments(
            payload?.teachingAssignments as TeachingAssignmentPayload[] | undefined,
            schedules,
            academicYear,
            semester,
            instructors,
        ),
        students,
        grades,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        announcements,
        reports,
        getCompletedSubjects: buildGetCompletedSubjects(subjects, grades),
    };
};

const fetchAdminDataFromBackend = async (signal?: AbortSignal): Promise<AdminDataType> => {
    const response = await fetch(ADMIN_DATA_ENDPOINT, {
        cache: 'no-store',
        credentials: 'include',
        signal,
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch data from the server (${response.status})`);
    }

    const payload: AdminApiResponse = await response.json();

    if (payload.status !== 'success') {
        throw new Error(payload.message ?? 'Backend returned an error status.');
    }

    return createAdminDataFromPayload(payload.data ?? null);
};

interface AdminContextType {
    adminData: AdminDataType;
    setAdminData: React.Dispatch<React.SetStateAction<AdminDataType>>;
  loading: boolean;
  error: string | null;
  refreshAdminData: () => Promise<AdminDataType>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
    const teachingAssignmentsHistoryRef = useRef<TeachingAssignment[]>([]);
    const historySignatureRef = useRef<string>('');
    const historyLoadedRef = useRef<boolean>(false);

    const [adminData, rawSetAdminData] = useState<AdminDataType>(createAdminDataFromPayload(null));
    const [hasRestoredUser, setHasRestoredUser] = useState(false);

    const {
        data: fetchedAdminData,
        isPending: isAdminDataPending,
        error: adminQueryError,
        refetch: refetchAdminQuery,
    } = useQuery({
        queryKey: ['admin-data'],
        queryFn: ({ signal }) => fetchAdminDataFromBackend(signal),
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
        retry: 1,
    });

    const storeAssignmentsHistory = useCallback((assignments: TeachingAssignment[]) => {
        teachingAssignmentsHistoryRef.current = assignments;
        const signature = computeAssignmentsSignature(assignments);
        if (signature === historySignatureRef.current) {
            return;
        }
        historySignatureRef.current = signature;
        if (!historyLoadedRef.current || typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage.setItem(TEACHING_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(assignments));
        } catch (storageError) {
            console.warn('[AdminProvider] Unable to persist teaching assignments history.', storageError);
        }
    }, []);

    const consolidateTeachingAssignments = useCallback((
        nextAssignments?: TeachingAssignment[],
        prevAssignments?: TeachingAssignment[],
    ): TeachingAssignment[] => {
        const combined = mergeTeachingAssignments(prevAssignments, nextAssignments);
        const withHistory = mergeTeachingAssignments(teachingAssignmentsHistoryRef.current, combined);
        storeAssignmentsHistory(withHistory);
        return withHistory;
    }, [storeAssignmentsHistory]);

    const setAdminDataWithHistory = useCallback((updater: React.SetStateAction<AdminDataType>) => {
        rawSetAdminData((prev) => {
            const nextState = typeof updater === 'function'
                ? (updater as (current: AdminDataType) => AdminDataType)(prev)
                : updater;
            const consolidatedAssignments = consolidateTeachingAssignments(nextState.teachingAssignments, prev.teachingAssignments);
            if (nextState.teachingAssignments !== consolidatedAssignments) {
                return { ...nextState, teachingAssignments: consolidatedAssignments };
            }
            return nextState;
        });
    }, [consolidateTeachingAssignments, rawSetAdminData]);

    useEffect(() => {
        const storedHistory = readTeachingAssignmentsFromStorage();
        if (storedHistory.length > 0) {
            teachingAssignmentsHistoryRef.current = storedHistory;
            historySignatureRef.current = computeAssignmentsSignature(storedHistory);
            rawSetAdminData((prev) => ({
                ...prev,
                teachingAssignments: mergeTeachingAssignments(prev.teachingAssignments, storedHistory),
            }));
        }
        historyLoadedRef.current = true;
        storeAssignmentsHistory(teachingAssignmentsHistoryRef.current);
    }, [storeAssignmentsHistory, rawSetAdminData]);

    useEffect(() => {
        if (!fetchedAdminData) {
            return;
        }
        setAdminDataWithHistory((prev) => ({
            ...fetchedAdminData,
            currentUser: prev.currentUser ?? fetchedAdminData.currentUser ?? null,
        }));
    }, [fetchedAdminData, setAdminDataWithHistory]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
            return;
        }

        let channel: BroadcastChannel | null = null;
        try {
            channel = new BroadcastChannel(DATA_SYNC_CHANNEL);
        } catch (error) {
            console.warn('[AdminProvider] Unable to subscribe to data sync channel.', error);
            return;
        }

        const handler = (event: MessageEvent<{ topic?: string }>) => {
            if (event.data?.topic === 'admin-data') {
                refetchAdminQuery();
            }
        };

        channel.addEventListener('message', handler);
        return () => {
            channel?.removeEventListener('message', handler);
            channel?.close();
        };
    }, [refetchAdminQuery]);

    const refreshAdminData = useCallback(async () => {
        const result = await refetchAdminQuery();
        if (result.data) {
            return result.data;
        }
        if (result.error) {
            throw result.error instanceof Error ? result.error : new Error('Unable to refresh admin data.');
        }
        throw new Error('Unable to refresh admin data.');
    }, [refetchAdminQuery]);


    useEffect(() => {
        // Restore the logged-in user from session storage exactly once.
        if (isAdminDataPending || hasRestoredUser) {
            return;
        }

        try {
            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                if (user && typeof user === 'object') {
                    const normalizedUser = {
                        ...user,
                        avatar: normalizeAvatarValue((user as AdminUser).avatar),
                    } as AdminUser;
                    setAdminDataWithHistory(prev => {
                        if (prev.currentUser && prev.currentUser.email === normalizedUser.email) {
                            return prev;
                        }
                        return { ...prev, currentUser: normalizedUser };
                    });
                }
            }
        } catch (error) {
            console.error('Failed to parse user from sessionStorage', error);
        } finally {
            setHasRestoredUser(true);
        }
    }, [isAdminDataPending, hasRestoredUser, setAdminDataWithHistory]);

        const loading = isAdminDataPending && !fetchedAdminData;
        const error = adminQueryError
                ? (adminQueryError instanceof Error
                        ? adminQueryError.message
                        : 'Unexpected error while fetching admin data.')
                : null;

    if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }
  if (error) {
    return <div>Error: {error}</div>;
  }

    return (
        <AdminContext.Provider value={{ adminData, setAdminData: setAdminDataWithHistory, loading, error, refreshAdminData }}>
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
