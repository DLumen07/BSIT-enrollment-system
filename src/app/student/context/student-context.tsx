
'use client';
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { resolveMediaUrl } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { DATA_SYNC_CHANNEL } from '@/lib/live-sync';

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
  block?: string | null;
};

export type GradeTermKey = 'prelim' | 'midterm' | 'final';

type StudentGradeValue = number | 'INC' | null;

export type StudentGradeTerm = {
  term: GradeTermKey;
  grade: StudentGradeValue;
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
  grade: StudentGradeValue;
  remark: string | null;
  gradedAt: string | null;
  terms: Partial<Record<GradeTermKey, StudentGradeTerm>>;
};

export type StudentEnrollmentHistoryEntry = {
  academicYear: string;
  semester: string;
  status: string;
  recordedAt: string;
  gwa: number | null;
  notes: string | null;
};

export type StudentDocumentRecord = {
  id: number;
  name: string;
  status: 'Submitted' | 'Pending' | 'Rejected';
  fileName: string;
  filePath: string;
  fileType: string | null;
  fileSize: number | null;
  uploadedAt: string | null;
  updatedAt: string | null;
};

export type StudentRecords = {
  enrollmentHistory: StudentEnrollmentHistoryEntry[];
  documents: StudentDocumentRecord[];
};

export type StudentCurrentTerm = {
  academicYear: string | null;
  semester: string | null;
  enrollmentStartDate: string | null;
  enrollmentEndDate: string | null;
};

export type StudentClassmate = {
  studentId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
};

export type StudentAnnouncement = {
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

export type StudentDataType = {
  personal: {
    firstName: string;
    lastName: string;
    middleName: string;
    avatarUrl: string | null;
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
    guardiansOccupation: string;
    guardiansAddress: string;
  };
  additional: {
    emergencyContactName: string;
    emergencyContactAddress: string;
    emergencyContactNumber: string;
    livingWithFamily: string;
    boarding: string;
    differentlyAbled: string;
    disability: string;
    minorityGroup: string;
    minority: string;
  };
  education: {
    elementarySchool: string;
    elemYearGraduated: string;
    secondarySchool: string;
    secondaryYearGraduated: string;
    collegiateSchool: string;
    collegiateYearGraduated: string;
  };
  academic: {
    studentId: string;
    course: string;
    yearLevel: string;
    block: string;
    status: string;
    statusDisplay: string;
    enrollmentTrack: string;
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
  announcements: StudentAnnouncement[];
  records: StudentRecords;
  classmates: StudentClassmate[];
  currentTerm: StudentCurrentTerm;
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

const TERM_KEYS: GradeTermKey[] = ['prelim', 'midterm', 'final'];

const normalizeStudentGradeValue = (value: unknown, remark?: string | null): StudentGradeValue => {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return null;
    }
    return Number(value.toFixed(2));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    if (trimmed.toUpperCase() === 'INC') {
      return 'INC';
    }
    const numeric = parseFloat(trimmed);
    if (!Number.isNaN(numeric)) {
      return Number(numeric.toFixed(2));
    }
  }

  if (typeof remark === 'string' && remark.trim().toUpperCase() === 'INC') {
    return 'INC';
  }

  return null;
};

const normalizeStudentGradeTerms = (
  terms: unknown,
  remark?: string | null,
): StudentGradeRecord['terms'] => {
  if (!terms || typeof terms !== 'object') {
    return {};
  }

  const normalizedRemark = typeof remark === 'string' ? remark.trim().toUpperCase() : null;
  const rawTerms = terms as Record<string, unknown>;
  const normalized: StudentGradeRecord['terms'] = {};

  TERM_KEYS.forEach((key) => {
    const entry = rawTerms[key];
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const record = entry as Record<string, unknown>;
    const gradeValue = normalizeStudentGradeValue(record.grade, normalizedRemark);
    normalized[key] = {
      term: key,
      grade: gradeValue,
      weight: typeof record.weight === 'number' ? record.weight : null,
      encodedAt:
        typeof record.encodedAt === 'string' && record.encodedAt.trim() !== ''
          ? record.encodedAt.trim()
          : null,
    } satisfies StudentGradeTerm;
  });

  return normalized;
};

const normalizeStudentGrades = (grades: StudentGradeRecord[] | undefined): StudentGradeRecord[] => {
  if (!Array.isArray(grades)) {
    return [];
  }

  return grades.map((entry) => {
    const remark = typeof entry.remark === 'string' ? entry.remark : null;
    return {
      ...entry,
      grade: normalizeStudentGradeValue(entry.grade, remark),
      remark,
      terms: normalizeStudentGradeTerms(entry.terms, remark),
    } satisfies StudentGradeRecord;
  });
};

const normalizeClassmates = (rawClassmates: unknown, apiBaseUrl: string): StudentClassmate[] => {
  if (!Array.isArray(rawClassmates)) {
    return [];
  }

  return rawClassmates
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const studentId = typeof record.studentId === 'string' ? record.studentId.trim() : '';
      const name = typeof record.name === 'string' ? record.name.trim() : '';
      const email = typeof record.email === 'string' ? record.email.trim() : '';
      const avatarRaw = typeof record.avatarUrl === 'string' ? record.avatarUrl.trim() : '';
      if (studentId === '' && name === '') {
        return null;
      }
      return {
        studentId,
        name,
        email: email !== '' ? email : null,
        avatarUrl: resolveMediaUrl(avatarRaw, apiBaseUrl),
      } satisfies StudentClassmate;
    })
    .filter((entry): entry is StudentClassmate => entry !== null);
};

export const normalizeStudentPayload = (rawData: StudentDataType, apiBaseUrl: string): StudentDataType => {
  const announcements = Array.isArray(rawData.announcements) ? rawData.announcements : [];
  const grades = normalizeStudentGrades(rawData.grades);

  const records: StudentRecords = rawData.records && typeof rawData.records === 'object'
    ? {
        enrollmentHistory: Array.isArray(rawData.records.enrollmentHistory)
          ? rawData.records.enrollmentHistory
          : [],
        documents: Array.isArray(rawData.records.documents)
          ? rawData.records.documents
          : [],
      }
    : { enrollmentHistory: [], documents: [] };

  const academicFallback: StudentDataType['academic'] = {
    studentId: '',
    course: '',
    yearLevel: '',
    block: '',
    status: '',
    statusDisplay: '',
    enrollmentTrack: 'Regular',
    enrollmentStatus: '',
    dateEnrolled: '',
    specialization: '',
  };

  const academicRaw = rawData.academic ?? academicFallback;
  const academic = {
    ...academicFallback,
    ...academicRaw,
    statusDisplay:
      typeof academicRaw.statusDisplay === 'string' && academicRaw.statusDisplay.trim() !== ''
        ? academicRaw.statusDisplay
        : academicRaw.status,
    enrollmentTrack:
      typeof academicRaw.enrollmentTrack === 'string' && academicRaw.enrollmentTrack.trim() !== ''
        ? academicRaw.enrollmentTrack
        : 'Regular',
  } satisfies StudentDataType['academic'];

  const classmates = normalizeClassmates(
    (rawData as unknown as { classmates?: unknown }).classmates,
    apiBaseUrl,
  );

  const rawCurrentTerm = (rawData as unknown as { currentTerm?: StudentCurrentTerm | null }).currentTerm ?? null;
  const currentTerm: StudentCurrentTerm = {
    academicYear:
      rawCurrentTerm && typeof rawCurrentTerm.academicYear === 'string'
        ? rawCurrentTerm.academicYear.trim() || null
        : null,
    semester:
      rawCurrentTerm && typeof rawCurrentTerm.semester === 'string'
        ? rawCurrentTerm.semester.trim() || null
        : null,
    enrollmentStartDate:
      rawCurrentTerm && typeof rawCurrentTerm.enrollmentStartDate === 'string'
        ? rawCurrentTerm.enrollmentStartDate.trim() || null
        : null,
    enrollmentEndDate:
      rawCurrentTerm && typeof rawCurrentTerm.enrollmentEndDate === 'string'
        ? rawCurrentTerm.enrollmentEndDate.trim() || null
        : null,
  };

  const basePersonal = rawData.personal ?? ({} as StudentDataType['personal']);
  const personal = {
    ...basePersonal,
    avatarUrl: resolveMediaUrl(basePersonal.avatarUrl ?? null, apiBaseUrl),
  } satisfies StudentDataType['personal'];

  return {
    ...rawData,
    personal,
    academic,
    announcements,
    records,
    classmates,
    currentTerm,
    grades,
  };
};

export const StudentProvider = ({ children }: { children: React.ReactNode }) => {
  const searchParams = useSearchParams();
  const studentEmail = searchParams.get('email');
  const [studentData, setStudentData] = useState<StudentDataType | null>(null);
  const [resolvedEmail, setResolvedEmail] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => {
    return (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
      .replace(/\/$/, '')
      .trim();
  }, []);

  const buildApiUrl = useMemo(() => buildUrlHelper(apiBaseUrl), [apiBaseUrl]);

  useEffect(() => {
    const nextEmail = studentEmail && studentEmail.trim() !== '' ? studentEmail.trim() : null;
    if (nextEmail) {
      setResolvedEmail(nextEmail);
      setEmailError(null);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('bsit_student_email', nextEmail);
      }
      return;
    }

    if (typeof window !== 'undefined') {
      const cached = window.sessionStorage.getItem('bsit_student_email');
      if (cached && cached.trim() !== '') {
        setResolvedEmail(cached.trim());
        setEmailError(null);
        return;
      }
    }

    setResolvedEmail(null);
    setEmailError('Missing student email in the URL.');
  }, [studentEmail]);

  const fetchStudentProfile = useCallback(async (email: string, signal?: AbortSignal) => {
    const response = await fetch(
      buildApiUrl(`student_profile.php?email=${encodeURIComponent(email)}`),
      {
        method: 'GET',
        credentials: 'include',
        signal,
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

    return normalizeStudentPayload(typedPayload.data, apiBaseUrl);
  }, [apiBaseUrl, buildApiUrl]);

  const {
    data: fetchedStudentData,
    isPending: isStudentDataPending,
    error: studentQueryError,
    refetch: refetchStudentProfile,
  } = useQuery({
    queryKey: ['student-profile', resolvedEmail],
    enabled: Boolean(resolvedEmail),
    queryFn: ({ signal }) => {
      if (!resolvedEmail) {
        throw new Error('Missing student email.');
      }
      return fetchStudentProfile(resolvedEmail, signal);
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  useEffect(() => {
    if (fetchedStudentData) {
      setStudentData(fetchedStudentData);
    }
  }, [fetchedStudentData]);

  useEffect(() => {
    if (!resolvedEmail) {
      setStudentData(null);
    }
  }, [resolvedEmail]);

  useEffect(() => {
    if (!resolvedEmail || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return;
    }

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(DATA_SYNC_CHANNEL);
    } catch (error) {
      console.warn('[StudentProvider] Unable to subscribe to data sync channel.', error);
      return;
    }

    const handler = (event: MessageEvent<{ topic?: string }>) => {
      if (event.data?.topic === 'admin-data' || event.data?.topic === 'student-documents') {
        refetchStudentProfile();
      }
    };

    channel.addEventListener('message', handler);

    return () => {
      channel?.removeEventListener('message', handler);
      channel?.close();
    };
  }, [refetchStudentProfile, resolvedEmail]);

  const combinedError = emailError
    ?? (studentQueryError instanceof Error
      ? studentQueryError.message
      : studentQueryError
        ? 'Unexpected error while loading student profile.'
        : null);

  if ((isStudentDataPending && !studentData) || (!resolvedEmail && !combinedError)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (combinedError && !studentData) {
    return (
      <div className="flex h-screen w-full items-center justify-center px-6 text-center">
        <div className="space-y-2">
          <p className="text-lg font-semibold">Unable to load student profile.</p>
          <p className="text-sm text-muted-foreground">{combinedError}</p>
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
    <StudentContext.Provider value={{ studentData, setStudentData, loading: isStudentDataPending, error: combinedError }}>
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
