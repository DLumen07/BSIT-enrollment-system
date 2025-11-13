
'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export type StudentRegisteredSubject = {
  code: string;
  description: string;
  units: number;
  schedule: string;
  instructor: string;
};

export type StudentScheduleEntry = {
  id: number;
  code: string;
  description: string;
  day: string;
  startTime: string;
  endTime: string;
  instructor: string;
  room: string;
  color: string;
};

export type GradeTermKey = 'prelim' | 'midterm' | 'final';

export type StudentGradeTerm = {
  term: GradeTermKey;
  grade: number | null;
  weight: number | null;
  encodedAt: string | null;
};

export type StudentGradeRecord = {
  id: number;
  academicYear: string;
  semester: string;
  subjectCode: string;
  subjectDescription: string;
  units: number;
  grade: number | null;
  remark: string | null;
  gradedAt: string | null;
  terms: Partial<Record<GradeTermKey, StudentGradeTerm>>;
};

export type StudentDataType = {
  personal: {
    firstName: string;
    lastName: string;
    middleName: string;
    birthdate: string;
    sex: string;
    civilStatus: string;
    nationality: string;
    religion: string;
    dialect: string;
  };
  contact: {
    email: string;
    phoneNumber: string;
  };
  address: {
    currentAddress: string;
    permanentAddress: string;
  };
  family: {
    fathersName: string;
    fathersOccupation: string;
    mothersName: string;
    mothersOccupation: string;
    guardiansName: string;
  };
  additional: {
    emergencyContactName: string;
    emergencyContactAddress: string;
    emergencyContactNumber: string;
  };
  education: {
    elementarySchool: string;
    elemYearGraduated: string;
    secondarySchool: string;
    secondaryYearGraduated: string;
    collegiateSchool: string;
  };
  academic: {
    studentId: string;
    course: string;
    yearLevel: string;
    block: string;
    status: string;
    enrollmentStatus: string;
    dateEnrolled: string;
    specialization: string;
  };
  enrollment: {
    isEnrolled: boolean;
    registeredSubjects: StudentRegisteredSubject[];
  };
  schedule: StudentScheduleEntry[];
  grades: StudentGradeRecord[];
};

interface StudentContextType {
  studentData: StudentDataType | null;
  setStudentData: React.Dispatch<React.SetStateAction<StudentDataType | null>>;
  loading: boolean;
  error: string | null;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

const buildUrlHelper = (baseUrl: string) => {
  return (endpoint: string) => `${baseUrl}/${endpoint.replace(/^\//, '')}`;
};

export const StudentProvider = ({ children }: { children: React.ReactNode }) => {
  const searchParams = useSearchParams();
  const studentEmail = searchParams.get('email');
  const [studentData, setStudentData] = useState<StudentDataType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => {
    return (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
      .replace(/\/$/, '')
      .trim();
  }, []);

  const buildApiUrl = useMemo(() => buildUrlHelper(apiBaseUrl), [apiBaseUrl]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const handleCleanup = () => {
      isMounted = false;
      controller.abort();
    };

    const resolveStudentEmail = (): string | null => {
      if (studentEmail) {
        return studentEmail;
      }
      if (typeof window !== 'undefined') {
        const cached = window.sessionStorage.getItem('bsit_student_email');
        return cached && cached.trim() !== '' ? cached : null;
      }
      return null;
    };

    const effectiveEmail = resolveStudentEmail();

    if (!effectiveEmail) {
      setStudentData(null);
      setError('Missing student email in the URL.');
      setLoading(false);
      return handleCleanup;
    }

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('bsit_student_email', effectiveEmail);
    }

    const fetchStudentProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildApiUrl(`student_profile.php?email=${encodeURIComponent(effectiveEmail)}`),
          {
            method: 'GET',
            credentials: 'include',
            signal: controller.signal,
          },
        );

        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch (parseError) {
          payload = null;
        }

        if (!response.ok) {
          const message =
            payload && typeof payload === 'object' && payload !== null && 'message' in payload && typeof (payload as Record<string, unknown>).message === 'string'
              ? String((payload as Record<string, unknown>).message)
              : `Failed to load student profile (status ${response.status}).`;
          throw new Error(message);
        }

        if (!payload || typeof payload !== 'object' || !('status' in payload)) {
          throw new Error('Unexpected response format from the server.');
        }

        const typedPayload = payload as { status?: string; data?: StudentDataType | null; message?: string };

        if (typedPayload.status !== 'success' || !typedPayload.data) {
          throw new Error(typedPayload.message ?? 'Student profile not found.');
        }

        if (!isMounted) {
          return;
        }

        setStudentData(typedPayload.data);
        setError(null);
      } catch (fetchError) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }
        setStudentData(null);
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to load student profile.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStudentProfile();

    return handleCleanup;
  }, [studentEmail, buildApiUrl]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center px-6 text-center">
        <div className="space-y-2">
          <p className="text-lg font-semibold">Unable to load student profile.</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="flex h-screen w-full items-center justify-center px-6 text-center">
        <div className="space-y-2">
          <p className="text-lg font-semibold">Student profile not found.</p>
          <p className="text-sm text-muted-foreground">Please verify the link or contact the administrator for assistance.</p>
        </div>
      </div>
    );
  }

  return (
    <StudentContext.Provider value={{ studentData, setStudentData, loading: false, error: null }}>
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = (): StudentContextType => {
  const context = useContext(StudentContext);
  if (context === undefined) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};
