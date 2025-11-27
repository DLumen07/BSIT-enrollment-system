'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Edit } from 'lucide-react';
import {
  useAdmin,
  type AdminReportMasterListEntry,
  type Student,
  type TeachingAssignment,
} from '@/app/admin/context/admin-context';
import { useInstructor, type GradeTermKey } from '@/app/instructor/context/instructor-context';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type GradeDisplayValue = number | 'INC' | null;
type StudentTermGrades = Partial<Record<GradeTermKey, { grade: GradeDisplayValue }>>;
type HistoryStudent = {
  id: string;
  studentId: string;
  name: string;
  avatar: string;
  block: string;
  grades: {
    finalGrade: GradeDisplayValue;
    remark: string | null;
    terms: StudentTermGrades;
  };
};
type HistoryClassRecord = {
  id: string;
  subjectCode: string;
  subjectDescription: string;
  academicYear: string;
  semester: string;
  blockName: string;
  studentCount: number;
  students: HistoryStudent[];
};
type HistoryCollections = {
  historyEntries: HistoryClassRecord[];
  subjectOptions: { code: string; description: string }[];
  termOptions: { value: string; label: string }[];
  blockOptions: string[];
};

const TERM_ORDER: GradeTermKey[] = ['prelim', 'midterm', 'final'];
const TERM_LABELS: Record<GradeTermKey, string> = {
  prelim: 'Prelim',
  midterm: 'Midterm',
  final: 'Final',
};

const GRADE_SEQUENCE = [
  '1.00',
  '1.25',
  '1.50',
  '1.75',
  '2.00',
  '2.25',
  '2.50',
  '2.75',
  '3.00',
  '3.25',
  '3.50',
  '3.75',
  '4.00',
  '4.25',
  '4.50',
  '4.75',
  '5.00',
  'INC',
] as const;
type GradeSequenceValue = (typeof GRADE_SEQUENCE)[number];

const EMPTY_HISTORY_RESULT: HistoryCollections = {
  historyEntries: [],
  subjectOptions: [],
  termOptions: [],
  blockOptions: [],
};

const clampToGradeSequence = (value?: string): GradeSequenceValue => {
  if (!value) {
    return GRADE_SEQUENCE[0];
  }
  const trimmed = value.trim();
  if (trimmed.toUpperCase() === 'INC') {
    return 'INC';
  }
  const numeric = parseFloat(trimmed);
  if (Number.isNaN(numeric)) {
    return GRADE_SEQUENCE[0];
  }
  const offset = Math.round((numeric - 1) / 0.25);
  const index = Math.min(Math.max(offset, 0), GRADE_SEQUENCE.length - 2);
  return GRADE_SEQUENCE[index];
};

const normalizeGradeValue = (value: unknown): GradeDisplayValue => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }
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
    if (Number.isNaN(numeric)) {
      return null;
    }
    return Number(numeric.toFixed(2));
  }
  return null;
};

const formatGrade = (value: GradeDisplayValue): string => {
  if (value === null || typeof value === 'undefined') {
    return '—';
  }
  if (value === 'INC') {
    return 'INC';
  }
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};

const buildLabelKey = (academicYear: string, semester: string) => `${academicYear}::${semester}`;

const buildHistoryCollections = (historyMap: Map<string, HistoryClassRecord>): HistoryCollections => {
  const historyEntries = Array.from(historyMap.values())
    .map((entry) => ({
      ...entry,
      students: entry.students.sort((a, b) => a.name.localeCompare(b.name)),
      studentCount: entry.students.length,
    }))
    .sort((a, b) => {
      if (a.academicYear === b.academicYear) {
        return a.semester.localeCompare(b.semester);
      }
      return b.academicYear.localeCompare(a.academicYear);
    });

  const subjectOptions = Array.from(
    new Map(historyEntries.map((entry) => [entry.subjectCode, entry.subjectDescription])).entries(),
  ).map(([code, description]) => ({ code, description }));

  const seenTerms = new Set<string>();
  const termOptions: { value: string; label: string }[] = [];
  historyEntries.forEach((entry) => {
    const value = buildLabelKey(entry.academicYear, entry.semester);
    if (!seenTerms.has(value)) {
      seenTerms.add(value);
      termOptions.push({ value, label: `${entry.academicYear} • ${entry.semester}` });
    }
  });

  const blockOptions = Array.from(new Set(historyEntries.map((entry) => entry.blockName))).sort();

  return { historyEntries, subjectOptions, termOptions, blockOptions };
};

const InstructorClassesHistoryPage = () => {
  const { adminData } = useAdmin();
  const { instructorData, updateStudentGrade } = useInstructor();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [termFilter, setTermFilter] = useState('all');
  const [blockFilter, setBlockFilter] = useState('all');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [gradeEdit, setGradeEdit] = useState<{ studentId: string; subjectCode: string; term: GradeTermKey; grade: string } | null>(null);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');

  const instructorId = instructorData?.personal.id ?? null;
  const normalizedInstructorEmail = instructorData?.personal.email?.trim().toLowerCase() ?? '';
  const normalizedInstructorName = instructorData?.personal.name?.trim().toLowerCase() ?? '';

  const normalizeSubjectCode = (code?: string | null) =>
    typeof code === 'string' ? code.trim().toUpperCase() : '';

  const assignmentInsights = useMemo(() => {
    const canIdentifyInstructor = instructorId !== null || normalizedInstructorEmail !== '' || normalizedInstructorName !== '';
    if (!adminData?.teachingAssignments || !canIdentifyInstructor) {
      return {
        assignments: [] as TeachingAssignment[],
        subjectBlocksByTerm: new Map<string, Map<string, Set<string>>>(),
        subjectBlockMap: new Map<string, string[]>(),
        subjectCodeSet: new Set<string>(),
      };
    }

    const matches = (adminData.teachingAssignments ?? []).filter((assignment) => {
      const assignmentInstructorId =
        typeof assignment.instructorId === 'number' && Number.isFinite(assignment.instructorId)
          ? assignment.instructorId
          : null;
      if (assignmentInstructorId !== null && instructorId !== null) {
        return assignmentInstructorId === instructorId;
      }

      const assignmentEmail = assignment.instructorEmail?.trim().toLowerCase() ?? '';
      if (assignmentEmail !== '' && normalizedInstructorEmail !== '') {
        return assignmentEmail === normalizedInstructorEmail;
      }
      if (assignmentEmail !== '' || normalizedInstructorEmail !== '') {
        return false;
      }

      const instructorHasReliableIdentity = instructorId !== null || normalizedInstructorEmail !== '';
      const assignmentHasReliableIdentity = assignmentInstructorId !== null || assignmentEmail !== '';
      if (instructorHasReliableIdentity || assignmentHasReliableIdentity) {
        return false;
      }

      const assignmentName = assignment.instructorName?.trim().toLowerCase() ?? '';
      if (!assignmentName || !normalizedInstructorName) {
        return false;
      }
      return assignmentName === normalizedInstructorName;
    });

    const subjectBlocksByTerm = new Map<string, Map<string, Set<string>>>();
    const subjectBlockSets = new Map<string, Set<string>>();

    matches.forEach((assignment) => {
      const termKey = buildLabelKey(assignment.academicYear, assignment.semester);
      const subjectMap = subjectBlocksByTerm.get(termKey) ?? new Map<string, Set<string>>();
      const blockSet = subjectMap.get(assignment.subjectCode) ?? new Set<string>();
      blockSet.add(assignment.block);
      subjectMap.set(assignment.subjectCode, blockSet);
      subjectBlocksByTerm.set(termKey, subjectMap);

      const subjectSet = subjectBlockSets.get(assignment.subjectCode) ?? new Set<string>();
      subjectSet.add(assignment.block);
      subjectBlockSets.set(assignment.subjectCode, subjectSet);
    });

    const subjectBlockMap = new Map<string, string[]>();
    const subjectCodeSet = new Set<string>();
    subjectBlockSets.forEach((blockSet, subjectCode) => {
      subjectBlockMap.set(subjectCode, Array.from(blockSet));
      subjectCodeSet.add(subjectCode);
    });

    return {
      assignments: matches,
      subjectBlocksByTerm,
      subjectBlockMap,
      subjectCodeSet,
    };
  }, [adminData?.teachingAssignments, instructorId, normalizedInstructorEmail, normalizedInstructorName]);

  const { historyEntries, subjectOptions, termOptions, blockOptions } = useMemo(() => {
    if (!instructorData || !adminData) {
      return EMPTY_HISTORY_RESULT;
    }

    const persistedAssignments = assignmentInsights.assignments;
    const termAssignmentsIndex = assignmentInsights.subjectBlocksByTerm;
    const persistedSubjectCodes = assignmentInsights.subjectCodeSet;

    const historyMap = new Map<string, HistoryClassRecord>();
    const entryStudentTracker = new Map<string, Set<string>>();
    const ensureHistoryRecord = (mapKey: string, factory: () => HistoryClassRecord) => {
      if (!historyMap.has(mapKey)) {
        historyMap.set(mapKey, factory());
      }
      if (!entryStudentTracker.has(mapKey)) {
        entryStudentTracker.set(mapKey, new Set());
      }
      return {
        entry: historyMap.get(mapKey)!,
        seenStudents: entryStudentTracker.get(mapKey)!,
      };
    };
    const assignmentSeededKeys = new Set<string>();
    const gradesByStudent = adminData.grades ?? {};

    if (persistedAssignments.length > 0) {
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

      persistedAssignments.forEach((assignment) => {
        const normalizedAssignmentSubject = normalizeSubjectCode(assignment.subjectCode);
        const mapKey = `${assignment.subjectCode}|${assignment.block}|${assignment.academicYear}|${assignment.semester}`;
        const { entry, seenStudents } = ensureHistoryRecord(mapKey, () => ({
          id: mapKey,
          subjectCode: assignment.subjectCode,
          subjectDescription: assignment.subjectDescription,
          academicYear: assignment.academicYear,
          semester: assignment.semester,
          blockName: assignment.block,
          studentCount: 0,
          students: [],
        }));
        if (entry.students.length > 0) {
          return;
        }

        const roster = studentsByBlock.get(assignment.block) ?? [];
        roster.forEach((student) => {
          if (seenStudents.has(student.studentId)) {
            return;
          }
          const isCurrentlyEnlisted = (student.enlistedSubjects ?? []).some((subject) =>
            normalizeSubjectCode(subject.code) === normalizedAssignmentSubject,
          );
          const gradeRecord = (gradesByStudent[student.studentId] ?? []).find((record) => {
            if (record.subjectCode !== assignment.subjectCode) {
              return false;
            }
            const recordYear = record.academicYear ?? assignment.academicYear;
            const recordSemester = record.semester ?? assignment.semester;
            return recordYear === assignment.academicYear && recordSemester === assignment.semester;
          }) ?? null;

          if (!gradeRecord && !isCurrentlyEnlisted) {
            return;
          }

          const rawRemark = gradeRecord?.remark ?? null;
          const remarkIsInc = rawRemark?.trim().toUpperCase() === 'INC';
          const normalizedTerms: StudentTermGrades = {};
          const rawTerms = (gradeRecord?.terms ?? {}) as Partial<Record<GradeTermKey, { grade?: unknown }>>;
          if (gradeRecord) {
            Object.entries(rawTerms).forEach(([termKey, termData]) => {
              if (!TERM_ORDER.includes(termKey as GradeTermKey)) {
                return;
              }
              normalizedTerms[termKey as GradeTermKey] = { grade: normalizeGradeValue(termData?.grade) };
            });
          }

          seenStudents.add(student.studentId);
          entry.students.push({
            id: student.studentId,
            studentId: student.studentId,
            name: student.name,
            avatar: student.avatar,
            block: assignment.block,
            grades: {
              finalGrade:
                gradeRecord !== null
                  ? normalizeGradeValue(gradeRecord.grade) ?? (remarkIsInc ? 'INC' : null)
                  : null,
              remark: rawRemark,
              terms: normalizedTerms,
            },
          });
        });

        assignmentSeededKeys.add(mapKey);
      });
    }

    const instructorRecord = adminData.instructors.find((inst) => inst.email === instructorData.personal.email);
    const scheduleSubjectBlockMap = new Map<string, string[]>();
    const scheduleSubjectCodes = new Set<string>();

    instructorData.classes.forEach((cls) => {
      const existing = scheduleSubjectBlockMap.get(cls.subjectCode) ?? [];
      if (!existing.includes(cls.block)) {
        scheduleSubjectBlockMap.set(cls.subjectCode, [...existing, cls.block]);
      }
      scheduleSubjectCodes.add(cls.subjectCode);
    });
    instructorData.schedule.forEach((session) => scheduleSubjectCodes.add(session.code));

    const subjectDescriptions = new Map<string, string>();
    Object.values(adminData.subjects ?? {}).forEach((collection) => {
      collection.forEach((subject) => {
        subjectDescriptions.set(subject.code, subject.description);
      });
    });
    (adminData.availableSubjects ?? []).forEach((subject) => {
      if (!subjectDescriptions.has(subject.id)) {
        const [, maybeDescription] = subject.label.split(' - ');
        subjectDescriptions.set(subject.id, maybeDescription ?? subject.label);
      }
    });

    const masterListByTerm: Record<string, Record<string, AdminReportMasterListEntry>> = {};
    Object.values(adminData.reports?.byTerm ?? {}).forEach((termData) => {
      if (!termData?.academicYear || !termData.semester) {
        return;
      }
      const label = buildLabelKey(termData.academicYear, termData.semester);
      const roster = masterListByTerm[label] ?? {};
      (termData.masterList ?? []).forEach((entry) => {
        if (entry?.id) {
          roster[entry.id] = entry;
        }
      });
      masterListByTerm[label] = roster;
    });

    const studentsById = new Map<string, Student>();
    adminData.students.forEach((student) => {
      studentsById.set(student.studentId, student);
    });

    const normalizeBlockName = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');
    const inferBlockName = (
      studentBlock: string | undefined,
      subjectCode: string,
      course?: string,
      year?: number,
      overrideBlocks?: string[],
    ) => {
      const explicit = normalizeBlockName(studentBlock);
      if (explicit) {
        return explicit;
      }

      const candidates = (overrideBlocks && overrideBlocks.length > 0)
        ? overrideBlocks
        : scheduleSubjectBlockMap.get(subjectCode) ?? [];
      if (candidates.length === 0) {
        return 'Unassigned';
      }
      if (candidates.length === 1) {
        return candidates[0];
      }

      const lowerCourse = typeof course === 'string' ? course.toLowerCase() : null;
      if (lowerCourse) {
        const matchByCourse = candidates.find((block) => block.toLowerCase().includes(lowerCourse));
        if (matchByCourse) {
          return matchByCourse;
        }
      }

      if (typeof year === 'number' && Number.isFinite(year)) {
        const matchByYear = candidates.find((block) => block.includes(String(year)));
        if (matchByYear) {
          return matchByYear;
        }
      }

      return candidates[0];
    };

    const taughtSubjectCodes = persistedSubjectCodes.size > 0 ? persistedSubjectCodes : scheduleSubjectCodes;

    if (taughtSubjectCodes.size === 0) {
      return buildHistoryCollections(historyMap);
    }

    Object.entries(gradesByStudent).forEach(([studentId, studentGrades]) => {
      const studentRecord = studentsById.get(studentId);
      const records = Array.isArray(studentGrades) ? studentGrades : [];
      records.forEach((record) => {
        if (!taughtSubjectCodes.has(record.subjectCode)) {
          return;
        }

        const academicYear = record.academicYear ?? 'Unspecified AY';
        const semester = record.semester ?? 'Unspecified Semester';
        const termKey = buildLabelKey(academicYear, semester);
        const rosterEntry = masterListByTerm[termKey]?.[studentId];
        const subjectDescription =
          record.subjectDescription ?? subjectDescriptions.get(record.subjectCode) ?? record.subjectCode;

        const termSubjectAssignments = termAssignmentsIndex.get(termKey);
        if (!termSubjectAssignments) {
          return;
        }
        const allowedBlocks = termSubjectAssignments.get(record.subjectCode);
        if (!allowedBlocks || allowedBlocks.size === 0) {
          return;
        }
        const overrideBlocks = Array.from(allowedBlocks);

        const sourceBlock = rosterEntry?.block ?? studentRecord?.block;
        const sourceCourse = rosterEntry?.course ?? studentRecord?.course;
        const sourceYear = rosterEntry?.year ?? studentRecord?.year;
        const blockName = inferBlockName(sourceBlock, record.subjectCode, sourceCourse, sourceYear, overrideBlocks);
        const mapKey = `${record.subjectCode}|${blockName}|${academicYear}|${semester}`;

        if (!assignmentSeededKeys.has(mapKey)) {
          return;
        }

        const { entry, seenStudents } = ensureHistoryRecord(mapKey, () => ({
          id: mapKey,
          subjectCode: record.subjectCode,
          subjectDescription,
          academicYear,
          semester,
          blockName,
          studentCount: 0,
          students: [],
        }));

        const rawRemark = record.remark ?? null;
        const remarkIsInc = rawRemark?.trim().toUpperCase() === 'INC';
        const normalizedTerms: StudentTermGrades = {};
        const rawTerms = (record.terms ?? {}) as Partial<Record<GradeTermKey, { grade?: unknown }>>;
        Object.entries(rawTerms).forEach(([termKey, termData]) => {
          if (!TERM_ORDER.includes(termKey as GradeTermKey)) {
            return;
          }
          normalizedTerms[termKey as GradeTermKey] = { grade: normalizeGradeValue(termData?.grade) };
        });

        const resolvedName = studentRecord?.name ?? rosterEntry?.name ?? studentId;
        const resolvedAvatar = studentRecord?.avatar ?? '';
        const resolvedId = studentRecord?.id ? String(studentRecord.id) : `${studentId}-${mapKey}`;

        if (seenStudents.has(studentId)) {
          return;
        }
        seenStudents.add(studentId);
        entry.students.push({
          id: resolvedId,
          studentId,
          name: resolvedName,
          avatar: resolvedAvatar,
          block: blockName,
          grades: {
            finalGrade: normalizeGradeValue(record.grade) ?? (remarkIsInc ? 'INC' : null),
            remark: rawRemark,
            terms: normalizedTerms,
          },
        });
      });
    });

    return buildHistoryCollections(historyMap);
  }, [adminData, assignmentInsights, instructorData]);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return historyEntries.filter((entry) => {
      const matchesSubject = subjectFilter === 'all' || entry.subjectCode === subjectFilter;
      const matchesTerm = termFilter === 'all' || buildLabelKey(entry.academicYear, entry.semester) === termFilter;
      const matchesBlock = blockFilter === 'all' || entry.blockName === blockFilter;
      if (!matchesSubject || !matchesTerm || !matchesBlock) {
        return false;
      }

      if (query === '') {
        return true;
      }

      const subjectText = `${entry.subjectCode} ${entry.subjectDescription} ${entry.blockName}`.toLowerCase();
      if (subjectText.includes(query)) {
        return true;
      }

      return entry.students.some((student) =>
        student.name.toLowerCase().includes(query) ||
        student.studentId.toLowerCase().includes(query) ||
        student.block.toLowerCase().includes(query),
      );
    });
  }, [historyEntries, searchQuery, subjectFilter, termFilter, blockFilter]);

  const activeHistory = useMemo(() => {
    if (!selectedHistoryId) {
      return null;
    }
    return historyEntries.find((entry) => entry.id === selectedHistoryId) ?? null;
  }, [historyEntries, selectedHistoryId]);

  const handleOpenRoster = (historyId: string) => {
    setSelectedHistoryId(historyId);
    setIsRosterOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setIsRosterOpen(open);
    if (!open) {
      setSelectedHistoryId(null);
      setGradeEdit(null);
      setRosterSearchQuery('');
    }
  };

  const handleSaveGrade = useCallback(async () => {
    if (!gradeEdit || isSaving) {
      return;
    }

    const rawGrade = gradeEdit.grade.trim();
    const isIncomplete = rawGrade.toUpperCase() === 'INC';
    let parsedGrade: number | 'INC' = 'INC';

    if (!isIncomplete) {
      const numericGrade = parseFloat(rawGrade);
      if (Number.isNaN(numericGrade) || numericGrade < 1.0 || numericGrade > 5.0) {
        toast({
          variant: 'destructive',
          title: 'Invalid grade value',
          description: 'Please enter a valid grade between 1.0 and 5.0 or type INC.',
        });
        return;
      }
      parsedGrade = numericGrade;
    }

    try {
      setIsSaving(true);
      await updateStudentGrade(gradeEdit.studentId, gradeEdit.subjectCode, gradeEdit.term, parsedGrade);
      toast({
        title: 'Grade saved',
        description: `${TERM_LABELS[gradeEdit.term]} grade updated for ${gradeEdit.studentId}.`,
      });
      setGradeEdit(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save grade right now.';
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  }, [gradeEdit, isSaving, toast, updateStudentGrade]);

  const handleStepGrade = useCallback((direction: 1 | -1) => {
    setGradeEdit((current) => {
      if (!current) {
        return current;
      }
      const normalized = clampToGradeSequence(current.grade);
      const currentIndex = GRADE_SEQUENCE.indexOf(normalized);
      const nextIndex = Math.min(Math.max(currentIndex + direction, 0), GRADE_SEQUENCE.length - 1);
      return { ...current, grade: GRADE_SEQUENCE[nextIndex] };
    });
  }, []);

  const handleCancelEdit = () => {
    if (!isSaving) {
      setGradeEdit(null);
    }
  };

  const handleStartEdit = (
    studentId: string,
    subjectCode: string,
    term: GradeTermKey,
    value: GradeDisplayValue,
  ) => {
    setGradeEdit({
      studentId,
      subjectCode,
      term,
      grade: value === 'INC' ? 'INC' : typeof value === 'number' ? value.toString() : '',
    });
  };


  const filteredRosterStudents = useMemo(() => {
    if (!activeHistory) {
      return [] as HistoryStudent[];
    }
    const query = rosterSearchQuery.trim().toLowerCase();
    if (query === '') {
      return activeHistory.students;
    }
    return activeHistory.students.filter((student) => {
      return (
        student.name.toLowerCase().includes(query) ||
        student.studentId.toLowerCase().includes(query) ||
        student.block.toLowerCase().includes(query)
      );
    });
  }, [activeHistory, rosterSearchQuery]);

  return (
    <>
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Classes History</h1>
          <p className="text-muted-foreground">
            Review previous classes you handled, drill down by block, and update retroactive term grades when needed.
          </p>
        </div>

        <Card className="rounded-2xl border border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Archived Classes</CardTitle>
            <CardDescription>Filter by subject, term, block, or search for a specific student.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <Input
                placeholder="Search subject, block, or student"
                className="w-full lg:max-w-sm rounded-xl"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search history"
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="w-full sm:w-48 rounded-xl">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All subjects</SelectItem>
                    {subjectOptions.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.code} • {option.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={termFilter} onValueChange={setTermFilter}>
                  <SelectTrigger className="w-full sm:w-48 rounded-xl">
                    <SelectValue placeholder="Term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All terms</SelectItem>
                    {termOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={blockFilter} onValueChange={setBlockFilter}>
                  <SelectTrigger className="w-full sm:w-48 rounded-xl">
                    <SelectValue placeholder="Block" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All blocks</SelectItem>
                    {blockOptions.map((block) => (
                      <SelectItem key={block} value={block}>
                        {block}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No historical classes matched your filters yet.
              </div>
            ) : (
              <div className="border rounded-2xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Block</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="font-semibold">{entry.subjectCode}</div>
                          <div className="text-sm text-muted-foreground">{entry.subjectDescription}</div>
                        </TableCell>
                        <TableCell>{entry.blockName}</TableCell>
                        <TableCell>{entry.academicYear}</TableCell>
                        <TableCell>{entry.semester}</TableCell>
                        <TableCell>{entry.studentCount}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full"
                            onClick={() => handleOpenRoster(entry.id)}
                          >
                            View Roster
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isRosterOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-3xl rounded-3xl border border-border/50">
          <DialogHeader>
            <DialogTitle>
              {activeHistory ? `${activeHistory.subjectCode} • ${activeHistory.academicYear}` : 'Class Roster'}
            </DialogTitle>
            <DialogDescription>
              {activeHistory ? `${activeHistory.subjectDescription} (${activeHistory.semester} • ${activeHistory.blockName})` : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {activeHistory ? (
              <>
                <Input
                  placeholder="Search student name, ID, or block"
                  className="rounded-xl"
                  value={rosterSearchQuery}
                  onChange={(event) => setRosterSearchQuery(event.target.value)}
                  aria-label="Search roster"
                />
                <div className="max-h-[60vh] overflow-y-auto rounded-2xl border shadow-sm">
                  {filteredRosterStudents.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No students matched your search.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Block</TableHead>
                          {TERM_ORDER.map((term) => (
                            <TableHead key={`history-term-${term}`} className="text-right">
                              {TERM_LABELS[term]}
                            </TableHead>
                          ))}
                          <TableHead className="text-right">Final Grade</TableHead>
                          <TableHead className="text-right">Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRosterStudents.map((student) => (
                          <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person avatar" />
                              <AvatarFallback>
                                {(student.name || student.studentId || '?').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{student.studentId}</TableCell>
                        <TableCell>{student.block}</TableCell>
                        {TERM_ORDER.map((termKey) => {
                          const termEntry = student.grades.terms?.[termKey];
                          const termValue = termEntry?.grade ?? null;
                          const isEditing =
                            gradeEdit?.studentId === student.studentId &&
                            gradeEdit?.subjectCode === activeHistory.subjectCode &&
                            gradeEdit?.term === termKey;
                          return (
                            <TableCell key={`${student.id}-${termKey}`} className="text-right align-middle">
                              {isEditing ? (
                                <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end sm:items-center">
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="1.0-5.0 or INC"
                                      value={gradeEdit?.grade ?? ''}
                                      onChange={(event) =>
                                        setGradeEdit((current) =>
                                          current ? { ...current, grade: event.target.value } : current,
                                        )
                                      }
                                      className="h-8 w-28 rounded-md"
                                      autoFocus
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                          event.preventDefault();
                                          void handleSaveGrade();
                                        }
                                        if (event.key === 'ArrowUp') {
                                          event.preventDefault();
                                          handleStepGrade(1);
                                        }
                                        if (event.key === 'ArrowDown') {
                                          event.preventDefault();
                                          handleStepGrade(-1);
                                        }
                                      }}
                                    />
                                    <div className="flex flex-col gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-6"
                                        onClick={() => handleStepGrade(1)}
                                        disabled={isSaving}
                                        aria-label="Increase grade"
                                      >
                                        <ChevronUp className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-6"
                                        onClick={() => handleStepGrade(-1)}
                                        disabled={isSaving}
                                        aria-label="Decrease grade"
                                      >
                                        <ChevronDown className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => { void handleSaveGrade(); }} disabled={isSaving}>
                                      {isSaving ? 'Saving…' : 'Save'}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                      disabled={isSaving}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-end items-center gap-2 group">
                                  <span className="font-semibold">{formatGrade(termValue)}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    onClick={() =>
                                      handleStartEdit(
                                        student.studentId,
                                        activeHistory.subjectCode,
                                        termKey,
                                        termValue,
                                      )
                                    }
                                    aria-label={`Edit ${TERM_LABELS[termKey]} grade for ${student.name}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-semibold">{formatGrade(student.grades.finalGrade)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {student.grades.remark ?? '—'}
                        </TableCell>
                      </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a class to view its roster.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => handleDialogChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstructorClassesHistoryPage;
