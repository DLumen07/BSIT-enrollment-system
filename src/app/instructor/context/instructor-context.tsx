
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAdmin } from '@/app/admin/context/admin-context';
import type { Subject as ScheduleSubject } from '@/app/admin/dashboard/schedule/[blockId]/page';
import type { Student, Subject } from '@/app/admin/context/admin-context';
import { useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
type GradeTerm = {
  term: GradeTermKey;
  grade: number | null;
  weight: number | null;
  encodedAt: string | null;
};

type Grade = {
  id?: number | null;
  subjectCode: string;
  subjectDescription?: string | null;
  units?: number | null;
  grade: number | null;
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
};

const TERM_KEYS: GradeTermKey[] = ['prelim', 'midterm', 'final'];

const normalizeGradeTerms = (terms: unknown): Grade['terms'] => {
  if (!terms || typeof terms !== 'object') {
    return {};
  }

  const rawTerms = terms as Record<string, unknown>;
  const normalized: Grade['terms'] = {};

  TERM_KEYS.forEach((key) => {
    const value = rawTerms[key];
    if (value && typeof value === 'object') {
      const entry = value as Record<string, unknown>;
      normalized[key] = {
        term: key,
        grade: typeof entry.grade === 'number' ? entry.grade : null,
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
  if (!payload || typeof payload !== 'object') {
    return {
      subjectCode: '',
      grade: null,
      terms: {},
    };
  }

  const record = payload as Record<string, unknown>;

  const subjectCode = typeof record.subjectCode === 'string' ? record.subjectCode : '';

  return {
    id: typeof record.id === 'number' ? record.id : null,
    subjectCode,
    subjectDescription:
      typeof record.subjectDescription === 'string' ? record.subjectDescription : null,
    units: typeof record.units === 'number' ? record.units : null,
    grade: typeof record.grade === 'number' ? record.grade : null,
    academicYear: typeof record.academicYear === 'string' ? record.academicYear : null,
    semester: typeof record.semester === 'string' ? record.semester : null,
    remark: typeof record.remark === 'string' && record.remark.trim() !== '' ? record.remark : null,
    gradedAt:
      typeof record.gradedAt === 'string' && record.gradedAt.trim() !== ''
        ? record.gradedAt
        : null,
    terms: normalizeGradeTerms(record.terms ?? null),
  };
};

interface InstructorContextType {
  instructorData: InstructorDataType | null;
  setInstructorData: React.Dispatch<React.SetStateAction<InstructorDataType | null>>;
  updateStudentGrade: (studentId: string, subjectCode: string, term: GradeTermKey, grade: number) => Promise<void>;
}

const InstructorContext = createContext<InstructorContextType | undefined>(undefined);

export const InstructorProvider = ({ children }: { children: React.ReactNode }) => {
  const { adminData, setAdminData } = useAdmin();
  const [instructorData, setInstructorData] = useState<InstructorDataType | null>(null);
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

        for (const blockName in adminData.schedules) {
            const blockSchedule = adminData.schedules[blockName];
            const subjectsInBlock = blockSchedule.filter(sub => sub.instructor === currentInstructor.name);
            
            subjectsInBlock.forEach(sub => {
                instructorSchedule.push({ ...sub, block: blockName });
            });

            if (subjectsInBlock.length > 0) {
                 const uniqueSubjects = [...new Map(subjectsInBlock.map(item => [item.code, item])).values()];
                 uniqueSubjects.forEach(subject => {
                    instructorClasses.push({
                        block: blockName,
                        subjectCode: subject.code,
                        subjectDescription: subject.description,
                        studentCount: adminData.students.filter(s => s.block === blockName).length,
                    });
                 });
            }
        }

        setInstructorData({
            personal: {
                id: currentInstructor.id,
                name: currentInstructor.name,
                email: currentInstructor.email,
                avatar: currentInstructor.avatar,
            },
            schedule: instructorSchedule,
            classes: instructorClasses,
            grades: adminData.grades,
        });
      }
    }
  }, [adminData, instructorEmail]);

  const updateStudentGrade = useCallback(async (studentId: string, subjectCode: string, term: GradeTermKey, grade: number) => {
    if (!instructorData) {
      throw new Error('Instructor data is not loaded yet.');
    }

    if (!adminData) {
      throw new Error('Academic term information is not available yet.');
    }

    if (!TERM_KEYS.includes(term)) {
      throw new Error('Invalid grading term specified.');
    }

    const payload = {
      studentIdNumber: studentId,
      subjectCode,
      term,
      grade,
      academicYear: adminData.academicYear,
      semester: adminData.semester,
      instructorEmail: instructorData.personal.email,
    };

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

    const normalizedGrade: Grade = {
      ...normalizedGradePayload,
      subjectCode: resolvedSubjectCode,
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
  }, [adminData, buildApiUrl, instructorData, setAdminData]);

  if (!instructorData) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
        </div>
    );
  }

  return (
    <InstructorContext.Provider value={{ instructorData, setInstructorData, updateStudentGrade }}>
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
