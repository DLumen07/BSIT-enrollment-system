
'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudent } from '@/app/student/context/student-context';
import type { GradeTermKey, StudentGradeRecord } from '@/app/student/context/student-context';
import { cn } from '@/lib/utils';

const semesterLabelMap: Record<string, string> = {
  '1st-sem': '1st Semester',
  '2nd-sem': '2nd Semester',
  summer: 'Summer Term',
};

const semesterSortOrder: Record<string, number> = {
  '1st-sem': 1,
  '2nd-sem': 2,
  summer: 3,
};

const normalizeSemesterCode = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (normalized === '1st-sem' || normalized === '1st semester' || normalized === 'first semester') {
    return '1st-sem';
  }
  if (normalized === '2nd-sem' || normalized === '2nd semester' || normalized === 'second semester') {
    return '2nd-sem';
  }
  if (normalized === 'summer' || normalized === 'midyear' || normalized === 'mid-year') {
    return 'summer';
  }
  return value.trim();
};

const getSemesterLabel = (code: string, fallback: string): string => {
  const mapped = semesterLabelMap[code];
  if (mapped) {
    return mapped;
  }
  const cleaned = fallback.trim();
  return cleaned !== '' ? cleaned : 'Semester';
};

const formatNumericValue = (value: number | null): string => {
  if (value === null || Number.isNaN(value)) {
    return 'N/A';
  }
  const fixed = value.toFixed(2);
  return fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};

const determineStanding = (gpa: number | null): string => {
  if (gpa === null) {
    return 'Pending Evaluation';
  }
  if (gpa <= 1.75) {
    return "Dean's Lister";
  }
  if (gpa <= 2.25) {
    return 'Good Standing';
  }
  if (gpa <= 3.0) {
    return 'Satisfactory';
  }
  return 'Needs Improvement';
};

const termOrder: GradeTermKey[] = ['prelim', 'midterm', 'final'];
const termLabels: Record<GradeTermKey, string> = {
  prelim: 'Prelim',
  midterm: 'Midterm',
  final: 'Final',
};

const compareAcademicYearDesc = (a: string, b: string): number => {
  const parseYear = (value: string): number | null => {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4})/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  };

  const aYear = parseYear(a);
  const bYear = parseYear(b);

  if (aYear !== null && bYear !== null && aYear !== bYear) {
    return bYear - aYear;
  }

  return b.localeCompare(a);
};

type GradeGroup = {
  key: string;
  academicYear: string;
  semesterCode: string;
  rawSemester: string;
  label: string;
  subjects: StudentGradeRecord[];
  gpa: number | null;
  totalUnits: number;
  standing: string;
};

const buildGradeGroups = (grades: StudentGradeRecord[]): GradeGroup[] => {
  if (!grades || grades.length === 0) {
    return [];
  }

  const groupMap = new Map<string, GradeGroup>();

  grades.forEach((entry) => {
    const academicYear = entry.academicYear && entry.academicYear.trim() !== '' ? entry.academicYear : 'Unspecified';
    const semesterCode = normalizeSemesterCode(entry.semester ?? '');
    const key = `${academicYear}__${semesterCode}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        academicYear,
        semesterCode,
        rawSemester: entry.semester ?? '',
        label: '',
        subjects: [],
        gpa: null,
        totalUnits: 0,
        standing: 'Pending Evaluation',
      });
    }

    groupMap.get(key)!.subjects.push(entry);
  });

  const groups = Array.from(groupMap.values());

  groups.forEach((group) => {
    let totalUnits = 0;
    let weighted = 0;
    let gradedUnits = 0;

    group.subjects.forEach((subject) => {
      const units = subject.units ?? 0;
      totalUnits += units;
      if (typeof subject.grade === 'number' && units > 0) {
        weighted += subject.grade * units;
        gradedUnits += units;
      }
    });

    const gpa = gradedUnits > 0 ? weighted / gradedUnits : null;
    group.totalUnits = totalUnits;
    group.gpa = gpa;
    group.standing = determineStanding(gpa);
    group.label = `A.Y. ${group.academicYear}, ${getSemesterLabel(group.semesterCode, group.rawSemester)}`;
  });

  groups.sort((a, b) => {
    const yearDiff = compareAcademicYearDesc(a.academicYear, b.academicYear);
    if (yearDiff !== 0) {
      return yearDiff;
    }
    const orderA = semesterSortOrder[a.semesterCode] ?? 99;
    const orderB = semesterSortOrder[b.semesterCode] ?? 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.label.localeCompare(b.label);
  });

  return groups;
};

export default function GradesPage() {
  const { studentData } = useStudent();

  const gradeGroups = useMemo(() => buildGradeGroups(studentData?.grades ?? []), [studentData?.grades]);

  if (!studentData) {
    return null;
  }

  if (gradeGroups.length === 0) {
    return (
      <main className="flex-1 p-4 sm:p-6">
        <div className="space-y-0.5 mb-6">
          <h1 className="text-2xl font-bold tracking-tight">My Grades</h1>
          <p className="text-muted-foreground">
            View your academic performance from previous semesters.
          </p>
        </div>
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>No Grades Recorded Yet</CardTitle>
            <CardDescription>
              Once grades are posted for your subjects, they will appear here grouped by academic year and semester.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="space-y-0.5 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Grades</h1>
        <p className="text-muted-foreground">
          Review your academic performance across academic years and semesters.
        </p>
      </div>

      <Tabs defaultValue={gradeGroups[0].key} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:w-auto md:inline-grid">
          {gradeGroups.map((group) => (
            <TabsTrigger key={group.key} value={group.key}>
              {group.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {gradeGroups.map((group) => (
          <TabsContent key={group.key} value={group.key}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Grade Details</CardTitle>
                    <CardDescription>
                      Subject grades for {group.label}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg">
                      {group.subjects.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Subject Code</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Final Grade</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.subjects.map((subject) => {
                              const gradeValue = typeof subject.grade === 'number' ? subject.grade : null;
                              const isFailing = (gradeValue !== null && gradeValue > 3) || (subject.remark?.toLowerCase() === 'failed');
                              const hasTermGrades = termOrder.some((term) => typeof subject.terms?.[term]?.grade === 'number');
                              const termSummary = termOrder
                                .map((term) => {
                                  const termGrade = subject.terms?.[term]?.grade ?? null;
                                  return `${termLabels[term]}: ${formatNumericValue(termGrade)}`;
                                })
                                .join(' • ');
                              return (
                                <TableRow key={`${subject.subjectCode}-${subject.id}`}>
                                  <TableCell className="font-medium">{subject.subjectCode || '—'}</TableCell>
                                  <TableCell>
                                    <div className="font-medium">{subject.subjectDescription || 'Subject information unavailable'}</div>
                                    {subject.units ? (
                                      <p className="text-xs text-muted-foreground">{subject.units} unit{subject.units === 1 ? '' : 's'}</p>
                                    ) : null}
                                    {hasTermGrades ? (
                                      <p className="mt-1 text-xs text-muted-foreground">{termSummary}</p>
                                    ) : null}
                                  </TableCell>
                                  <TableCell className={cn('text-right font-semibold', isFailing && 'text-destructive')}>
                                    {formatNumericValue(gradeValue)}
                                    {subject.remark ? (
                                      <span className="ml-2 text-xs text-muted-foreground">{subject.remark}</span>
                                    ) : null}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="p-4 text-sm text-muted-foreground">No grades recorded for this term yet.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Semester Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Units</p>
                      <p className="text-lg font-bold">{group.totalUnits}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">General Point Average (GPA)</p>
                      <p className="text-lg font-bold">{formatNumericValue(group.gpa)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Academic Standing</p>
                      <p className="text-lg font-bold">{group.standing}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}
