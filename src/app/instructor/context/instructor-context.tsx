
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAdmin } from '@/app/admin/context/admin-context';
import type { Subject as ScheduleSubject } from '@/app/admin/dashboard/schedule/[blockId]/page';
import type { AdminAnnouncement, Student, Subject } from '@/app/admin/context/admin-context';
import { useSearchParams } from 'next/navigation';
import Loading from '@/app/loading';
import { resolveMediaUrl } from '@/lib/utils';
import { notifyDataChanged, DATA_SYNC_CHANNEL } from '@/lib/live-sync';

type InstructorPersonal = {
    id: number;
    name: string;
    email: string;
    avatar: string;
};

type InstructorClass = {
    block: string;
    subjectCode: string;
    subjectDescription: string;
    studentCount: number;
};

export type GradeTermKey = 'prelim' | 'midterm' | 'final';
type GradeValue = number | 'INC' | null;

type GradeTerm = {
  term: GradeTermKey;
  grade: GradeValue;
  weight: number | null;
  encodedAt: string | null;
};

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
  terms: Partial<Record<GradeTermKey, GradeTerm>>;
};

type StudentGrades = { [studentId: string]: Grade[] };

type InstructorDataType = {
    personal: InstructorPersonal;
    schedule: (ScheduleSubject & { block: string })[];
    classes: InstructorClass[];
    grades: StudentGrades;
    announcements: AdminAnnouncement[];
    allSubjects: string[];
};

const TERM_KEYS: GradeTermKey[] = ['prelim', 'midterm', 'final'];

const normalizeSubjectCode = (code?: string | null): string =>
  typeof code === 'string' ? code.trim().toUpperCase() : '';

const isStudentEnrolledInSubject = (
  student: Student,
  subjectCode: string,
  gradesByStudent: StudentGrades,
  academicYear: string,
  semester: string,
) => {
  const normalizedTarget = normalizeSubjectCode(subjectCode);
  if (!normalizedTarget) {
    return false;
  }

  const enlistedMatch = (student.enlistedSubjects ?? []).some(
    (subject) => normalizeSubjectCode(subject.code) === normalizedTarget,
  );
  if (enlistedMatch) {
    return true;
  }

  const studentGrades = gradesByStudent[student.studentId] ?? [];
  return studentGrades.some((grade) => {
    if (normalizeSubjectCode(grade.subjectCode) !== normalizedTarget) {
      return false;
    }
    const gradeYear = grade.academicYear ?? academicYear;
    const gradeSemester = grade.semester ?? semester;
    return gradeYear === academicYear && gradeSemester === semester;
  });
};

const normalizeGradeTerms = (terms: unknown, remark?: string | null): Grade['terms'] => {
  if (!terms || typeof terms !== 'object') {
    return {};
  }

  const rawTerms = terms as Record<string, unknown>;
  const normalized: Grade['terms'] = {};
  const normalizedRemark = typeof remark === 'string' ? remark.trim().toUpperCase() : null;

  TERM_KEYS.forEach((key) => {
    const value = rawTerms[key];
    if (value && typeof value === 'object') {
      const entry = value as Record<string, unknown>;
      const gradeValueRaw = entry.grade ?? null;
      let gradeValue: GradeValue = null;
      if (typeof gradeValueRaw === 'number') {
        gradeValue = gradeValueRaw;
      } else if (typeof gradeValueRaw === 'string' && gradeValueRaw.trim().toUpperCase() === 'INC') {
        gradeValue = 'INC';
      } else if (!entry.hasOwnProperty('grade') && normalizedRemark === 'INC') {
        gradeValue = 'INC';
      }
      normalized[key] = {
        term: key,
        grade: gradeValue,
        weight: typeof entry.weight === 'number' ? entry.weight : null,
        encodedAt:
          typeof entry.encodedAt === 'string' && entry.encodedAt.trim() !== ''
            ? entry.encodedAt
            : null,
      };
    }
  });

  return normalized;
};

const buildGradeFromPayload = (payload: unknown): Grade => {
  const record = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const subjectCode = typeof record.subjectCode === 'string' ? record.subjectCode : '';
  const remarkRaw = typeof record.remark === 'string' ? record.remark.trim() : null;
  const normalizedRemark = remarkRaw ? remarkRaw.toUpperCase() : null;

  let finalGrade: GradeValue = null;
  if (typeof record.grade === 'number') {
    finalGrade = record.grade;
  } else if (typeof record.grade === 'string' && record.grade.trim().toUpperCase() === 'INC') {
    finalGrade = 'INC';
  } else if (normalizedRemark === 'INC') {
    finalGrade = 'INC';
  }

  return {
    id: typeof record.id === 'number' ? record.id : null,
    subjectCode,
    subjectDescription:
      typeof record.subjectDescription === 'string' ? record.subjectDescription : null,
    units: typeof record.units === 'number' ? record.units : null,
    grade: finalGrade,
    academicYear: typeof record.academicYear === 'string' ? record.academicYear : null,
    semester: typeof record.semester === 'string' ? record.semester : null,
    remark: remarkRaw,
    gradedAt:
      typeof record.gradedAt === 'string' && record.gradedAt.trim() !== ''
        ? record.gradedAt.trim()
        : null,
    terms: normalizeGradeTerms(record.terms ?? null, remarkRaw),
  };
};

interface InstructorContextType {
  instructorData: InstructorDataType | null;
  setInstructorData: React.Dispatch<React.SetStateAction<InstructorDataType | null>>;
  updateStudentGrade: (studentId: string, subjectCode: string, term: GradeTermKey, grade: GradeValue) => Promise<void>;
  refreshData: () => Promise<void>;
  isRefreshing: boolean;
}

const InstructorContext = createContext<InstructorContextType | undefined>(undefined);

export const InstructorProvider = ({ children }: { children: React.ReactNode }) => {
  const { adminData, setAdminData, refreshAdminData } = useAdmin();
  const [instructorData, setInstructorData] = useState<InstructorDataType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchParams = useSearchParams();
  const instructorEmail = searchParams.get('email');

  const apiBaseUrl = useMemo(() => {
    return (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
      .replace(/\/$/, '')
      .trim();
  }, []);

  const buildApiUrl = useCallback((endpoint: string) => {
    return `${apiBaseUrl}/${endpoint.replace(/^\/+/, '')}`;
  }, [apiBaseUrl]);

  useEffect(() => {
    if (adminData && instructorEmail) {
      const currentInstructor = adminData.instructors.find(inst => inst.email === instructorEmail);
      if (currentInstructor) {
        const instructorSchedule: (ScheduleSubject & { block: string })[] = [];
        const instructorClasses: InstructorClass[] = [];
        const currentAcademicYear = adminData.academicYear ?? 'Unspecified AY';
        const currentSemester = adminData.semester ?? 'Unspecified Semester';
        const gradesByStudent = adminData.grades ?? {};

        const studentsByBlock = new Map<string, Student[]>();
        adminData.students.forEach((student) => {
          const blockName = student.block?.trim();
          if (!blockName) {
            return;
          }
          const roster = studentsByBlock.get(blockName) ?? [];
          roster.push(student);
          studentsByBlock.set(blockName, roster);
        });

        for (const blockName in adminData.schedules) {
            const blockSchedule = adminData.schedules[blockName];
            const subjectsInBlock = blockSchedule.filter(sub => sub.instructor === currentInstructor.name);
            
            subjectsInBlock.forEach(sub => {
                instructorSchedule.push({ ...sub, block: blockName });
            });

            if (subjectsInBlock.length > 0) {
                 const uniqueSubjects = [...new Map(subjectsInBlock.map(item => [item.code, item])).values()];
                 uniqueSubjects.forEach(subject => {
                    const roster = studentsByBlock.get(blockName) ?? [];
                    const eligibleStudents = roster.filter((student) =>
                      isStudentEnrolledInSubject(student, subject.code, gradesByStudent, currentAcademicYear, currentSemester),
                    );
                    instructorClasses.push({
                        block: blockName,
                        subjectCode: subject.code,
                        subjectDescription: subject.description,
                        studentCount: eligibleStudents.length,
                    });
                 });
            }
        }

        const normalizedAvatar = resolveMediaUrl(currentInstructor.avatar ?? null, apiBaseUrl) ?? (currentInstructor.avatar ?? '');

        const relevantAnnouncements = (adminData.announcements ?? []).filter((announcement) =>
          announcement.audience === 'All' || announcement.audience === 'Instructors'
        );

            setInstructorData({
            personal: {
                id: currentInstructor.id,
                name: currentInstructor.name,
                email: currentInstructor.email,
            avatar: normalizedAvatar,
            },
            schedule: instructorSchedule,
            classes: instructorClasses,
            grades: adminData.grades,
            announcements: relevantAnnouncements,
            allSubjects: currentInstructor.subjects || [],
        });
      }
    }
  }, [adminData, instructorEmail]);

  const updateStudentGrade = useCallback(async (studentId: string, subjectCode: string, term: GradeTermKey, grade: GradeValue) => {
    if (!instructorData) {
      throw new Error('Instructor data is not loaded yet.');
    }

    if (!adminData) {
      throw new Error('Academic term information is not available yet.');
    }

    if (!TERM_KEYS.includes(term)) {
      throw new Error('Invalid grading term specified.');
    }

    const payload: Record<string, unknown> = {
      studentIdNumber: studentId,
      subjectCode,
      term,
      grade,
      academicYear: adminData.academicYear,
      semester: adminData.semester,
      instructorEmail: instructorData.personal.email,
    };

    if (grade === 'INC') {
      payload.remark = 'INC';
    }

    const response = await fetch(buildApiUrl('update_student_grade.php'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    let responseBody: any = null;
    try {
      responseBody = await response.json();
    } catch (_error) {
      responseBody = null;
    }

    if (!response.ok || !responseBody || responseBody.status !== 'success') {
      const message = responseBody?.message ?? `Failed to save grade (status ${response.status}).`;
      throw new Error(message);
    }

    const normalizedGradePayload = buildGradeFromPayload(responseBody.data ?? null);
    const resolvedSubjectCode = normalizedGradePayload.subjectCode || subjectCode;
    const hydratedTerms = {
      ...normalizedGradePayload.terms,
    };
    const existingTerm = hydratedTerms[term];
    hydratedTerms[term] = {
      term,
      grade,
      weight: existingTerm?.weight ?? (term === 'final' ? 0.4 : 0.3),
      encodedAt: existingTerm?.encodedAt ?? null,
    };

    const isIncompleteSubmission = grade === 'INC' || normalizedGradePayload.remark?.trim().toUpperCase() === 'INC';

    const normalizedGrade: Grade = {
      ...normalizedGradePayload,
      subjectCode: resolvedSubjectCode,
      grade: isIncompleteSubmission ? 'INC' : normalizedGradePayload.grade,
      remark: isIncompleteSubmission ? 'INC' : normalizedGradePayload.remark,
      terms: hydratedTerms,
    };

    setAdminData(prevAdminData => {
      const baseAdminData = prevAdminData ?? adminData;
      if (!baseAdminData) {
        return prevAdminData;
      }
      const newGrades = { ...baseAdminData.grades };
      const studentGrades = newGrades[studentId] ? [...newGrades[studentId]] : [];
      const gradeIndex = studentGrades.findIndex(g => g.subjectCode === resolvedSubjectCode);
      if (gradeIndex > -1) {
        studentGrades[gradeIndex] = normalizedGrade;
      } else {
        studentGrades.push(normalizedGrade);
      }
      newGrades[studentId] = studentGrades;
      return { ...baseAdminData, grades: newGrades };
    });

    setInstructorData(prevInstructorData => {
      if (!prevInstructorData) {
        return prevInstructorData;
      }
      const newGrades = { ...prevInstructorData.grades };
      const studentGrades = newGrades[studentId] ? [...newGrades[studentId]] : [];
      const gradeIndex = studentGrades.findIndex(g => g.subjectCode === resolvedSubjectCode);
      if (gradeIndex > -1) {
        studentGrades[gradeIndex] = normalizedGrade;
      } else {
        studentGrades.push(normalizedGrade);
      }
      newGrades[studentId] = studentGrades;
      return { ...prevInstructorData, grades: newGrades };
    });

    notifyDataChanged();
  }, [adminData, buildApiUrl, instructorData, setAdminData]);

  // Refresh data function that triggers admin data refresh
  const refreshData = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshAdminData();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refreshAdminData]);

  // Listen for broadcast channel updates from other tabs
  useEffect(() => {
    if (!instructorEmail || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return;
    }

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(DATA_SYNC_CHANNEL);
    } catch (error) {
      console.warn('[InstructorProvider] Unable to subscribe to data sync channel.', error);
      return;
    }

    const handler = (event: MessageEvent<{ topic?: string }>) => {
      if (event.data?.topic === 'admin-data') {
        // Admin data will be refreshed by AdminProvider, instructor data will update via useEffect
        console.log('[InstructorProvider] Received data sync notification');
      }
    };

    channel.addEventListener('message', handler);

    return () => {
      channel?.removeEventListener('message', handler);
      channel?.close();
    };
  }, [instructorEmail]);

  if (!instructorData) {
    return <Loading />;
  }

  return (
    <InstructorContext.Provider value={{ instructorData, setInstructorData, updateStudentGrade, refreshData, isRefreshing }}>
      {children}
    </InstructorContext.Provider>
  );
};

export const useInstructor = (): InstructorContextType => {
  const context = useContext(InstructorContext);
  if (context === undefined) {
    throw new Error('useInstructor must be used within an InstructorProvider');
  }
  return context;
};
