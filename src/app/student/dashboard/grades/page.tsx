
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
import { GraduationCap, BookOpen, Award, TrendingUp, AlertCircle, FileText, Calculator } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

const formatGradeDisplay = (value: StudentGradeRecord['grade'] | null): string => {
  if (value === 'INC') {
    return 'INC';
  }
  if (typeof value === 'number') {
    return formatNumericValue(value);
  }
  if (value === null) {
    return 'N/A';
  }
  return String(value);
};

const determineStanding = (gwa: number | null): string => {
  if (gwa === null) {
    return 'Pending Evaluation';
  }
  if (gwa <= 1.75) {
    return "Dean's Lister";
  }
  if (gwa <= 2.25) {
    return 'Good Standing';
  }
  if (gwa <= 3.0) {
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
  gwa: number | null;
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
        gwa: null,
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

    const gwa = gradedUnits > 0 ? weighted / gradedUnits : null;
    group.totalUnits = totalUnits;
    group.gwa = gwa;
    group.standing = determineStanding(gwa);
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

  return (
    <main className="flex-1 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <GraduationCap className="h-6 w-6 text-blue-500" />
        </div>
        <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight">My Grades</h1>
            <p className="text-muted-foreground">
            Review your academic performance across academic years and semesters.
            </p>
        </div>
      </div>

      {gradeGroups.length === 0 ? (
        <Card className="rounded-xl border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-sm">
          <CardHeader className="flex flex-col items-center text-center py-16">
            <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <CardTitle className="text-xl font-semibold">No Grades Recorded Yet</CardTitle>
            <CardDescription className="max-w-md mt-2 text-base">
              Once grades are posted for your subjects, they will appear here grouped by academic year and semester.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Tabs defaultValue={gradeGroups[0].key} className="w-full">
        <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-muted/50 p-1 text-muted-foreground">
            {gradeGroups.map((group) => (
                <TabsTrigger
                key={group.key}
                value={group.key}
                className="rounded-lg px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                {group.label}
                </TabsTrigger>
            ))}
            </TabsList>
        </div>
        
        {gradeGroups.map((group) => (
          <TabsContent key={group.key} value={group.key} className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary Card */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="rounded-2xl border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-sm overflow-hidden">
                  <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                  <CardHeader className="relative z-10 pb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-blue-500/10">
                            <Award className="h-4 w-4 text-blue-500" />
                        </div>
                        <CardTitle className="text-lg">Semester Summary</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-6 pt-4">
                    <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">GWA</span>
                        <div className="text-5xl font-bold text-foreground mt-2 tracking-tighter">
                            {formatNumericValue(group.gwa)}
                        </div>
                        <Badge variant="outline" className="mt-4 border-blue-500/20 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full">
                            {group.standing}
                        </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="h-4 w-4 text-orange-500" />
                                <span className="text-xs font-medium text-muted-foreground">Total Units</span>
                            </div>
                            <p className="text-2xl font-bold">{group.totalUnits}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                <span className="text-xs font-medium text-muted-foreground">Passed</span>
                            </div>
                            <p className="text-2xl font-bold">
                                {group.subjects.filter(s => {
                                    const grade = typeof s.grade === 'number' ? s.grade : 5.0;
                                    return grade <= 3.0 && s.grade !== 'INC';
                                }).length}
                                <span className="text-sm text-muted-foreground font-normal ml-1">/ {group.subjects.length}</span>
                            </p>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Grades Table */}
              <div className="lg:col-span-2">
                <Card className="rounded-2xl border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-sm h-full">
                  <CardHeader className="border-b border-white/10 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-purple-500/10">
                                <Calculator className="h-4 w-4 text-purple-500" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Grade Details</CardTitle>
                                <CardDescription>Subject breakdown for {group.label}</CardDescription>
                            </div>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-hidden">
                      {group.subjects.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-white/5 border-white/10 hover:bg-white/10">
                              <TableHead className="w-[120px] font-medium text-muted-foreground pl-6">Code</TableHead>
                              <TableHead className="font-medium text-muted-foreground">Description</TableHead>
                              <TableHead className="text-right font-medium text-muted-foreground w-[100px]">Grade</TableHead>
                              <TableHead className="text-right font-medium text-muted-foreground w-[120px] pr-6">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.subjects.map((subject) => {
                              const remarkNormalized = subject.remark?.trim().toUpperCase() ?? null;
                              const gradeValue = subject.grade ?? (remarkNormalized === 'INC' ? 'INC' : null);
                              const numericGradeValue = typeof gradeValue === 'number' ? gradeValue : null;
                              const isFailing =
                                (numericGradeValue !== null && numericGradeValue > 3) ||
                                gradeValue === 'INC' ||
                                remarkNormalized === 'FAILED';
                              const isPassing = numericGradeValue !== null && numericGradeValue <= 3.0;
                              
                              const hasTermGrades = termOrder.some((term) => subject.terms?.[term]?.grade !== undefined && subject.terms?.[term]?.grade !== null);
                              const termSummary = termOrder
                                .map((term) => {
                                  const rawTermGrade = subject.terms?.[term]?.grade ?? null;
                                  const termGrade = rawTermGrade ?? (remarkNormalized === 'INC' ? 'INC' : null);
                                  return `${termLabels[term]}: ${formatGradeDisplay(termGrade)}`;
                                })
                                .join(' • ');
                                
                              return (
                                <TableRow key={`${subject.subjectCode}-${subject.id}`} className="border-white/10 hover:bg-white/5 transition-colors">
                                  <TableCell className="font-medium text-foreground pl-6">
                                    <Badge variant="outline" className="border-white/10 bg-white/5 font-mono text-xs rounded-md">
                                        {subject.subjectCode || '—'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium text-sm text-foreground">{subject.subjectDescription || 'Subject information unavailable'}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {subject.units ? (
                                        <span className="text-xs text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">
                                            {subject.units} unit{subject.units === 1 ? '' : 's'}
                                        </span>
                                        ) : null}
                                        {hasTermGrades ? (
                                        <span className="text-[10px] text-muted-foreground border-l border-white/10 pl-2">
                                            {termSummary}
                                        </span>
                                        ) : null}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className={cn(
                                        "text-lg font-bold",
                                        isFailing ? "text-red-500" : isPassing ? "text-green-500" : "text-foreground"
                                    )}>
                                        {formatGradeDisplay(gradeValue)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right pr-6">
                                    {isFailing ? (
                                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 rounded-md">
                                            {subject.remark || 'Failed'}
                                        </Badge>
                                    ) : isPassing ? (
                                        <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 shadow-none rounded-md">
                                            Passed
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-white/10 text-muted-foreground hover:bg-white/20 rounded-md">
                                            {subject.remark || 'Ongoing'}
                                        </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="p-3 rounded-full bg-white/5 mb-3">
                                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No grades recorded</p>
                            <p className="text-xs text-muted-foreground mt-1">Grades for this term have not been posted yet.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      )}
    </main>
  );
}
