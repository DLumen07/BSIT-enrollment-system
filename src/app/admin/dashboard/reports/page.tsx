'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAdmin, type AdminReportSummary } from '../../context/admin-context';
import { UNIFAST_FEE_ITEMS, UNIFAST_FEE_TOTALS, formatCurrency } from '@/lib/unifast-fees';

const DEFAULT_SUMMARY: AdminReportSummary = {
  totalStudents: 0,
  totalEnrollees: 0,
  newStudents: 0,
  oldStudents: 0,
  transferees: 0,
  onHoldStudents: 0,
  notEnrolledStudents: 0,
  graduatedStudents: 0,
};

const YEAR_LEVEL_COLOR_MAP: Record<number, string> = {
  1: 'hsl(var(--chart-1))',
  2: 'hsl(var(--chart-2))',
  3: 'hsl(var(--chart-3))',
  4: 'hsl(var(--chart-4))',
};

const FALLBACK_YEAR_COLOR = 'hsl(var(--chart-5))';

const yearLevelChartConfig: ChartConfig = {
  students: { label: 'Students' },
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
  .replace(/\/$/, '')
  .trim();

export default function ReportsPage() {
  const { adminData } = useAdmin();
  const {
    academicYear: globalAcademicYear,
    semester: globalSemester,
    academicYearOptions,
    semesterOptions,
    reports,
    students,
  } = adminData;

  const [academicYear, setAcademicYear] = React.useState(globalAcademicYear);
  const [semester, setSemester] = React.useState(globalSemester);

  React.useEffect(() => {
    setAcademicYear(globalAcademicYear);
    setSemester(globalSemester);
  }, [globalAcademicYear, globalSemester]);

  React.useEffect(() => {
    const selectedKey = `${academicYear}::${semester}`;
    if (reports.byTerm[selectedKey]) {
      return;
    }
    const fallback = reports.terms.find((term) => term.academicYear === academicYear);
    if (fallback && fallback.semester !== semester) {
      setSemester(fallback.semester);
    }
  }, [academicYear, semester, reports.byTerm, reports.terms]);

  const availableAcademicYears = React.useMemo(() => {
    if (reports.terms.length === 0) {
      return academicYearOptions;
    }
    const merged = new Set<string>([...academicYearOptions, ...reports.terms.map((term) => term.academicYear)]);
    return Array.from(merged);
  }, [academicYearOptions, reports.terms]);

  const availableSemesters = React.useMemo(() => {
    const relevantTerms = reports.terms.filter((term) => term.academicYear === academicYear);
    if (relevantTerms.length === 0) {
      return semesterOptions;
    }
    const allowed = new Set(relevantTerms.map((term) => term.semester));
    const filtered = semesterOptions.filter((option) => allowed.has(option.value));
    return filtered.length > 0 ? filtered : semesterOptions;
  }, [reports.terms, academicYear, semesterOptions]);

  const termKey = `${academicYear}::${semester}`;
  const currentReport = reports.byTerm[termKey];

  const derivedCurrentTermReport = React.useMemo(() => {
    if (
      academicYear !== globalAcademicYear
      || semester !== globalSemester
      || !Array.isArray(students)
      || students.length === 0
    ) {
      return null;
    }

    const enrolledStudents = students.filter((student) => student.status === 'Enrolled');
    if (enrolledStudents.length === 0) {
      return null;
    }

    const normalizeProfileStatus = (value?: string | null) => {
      if (!value) {
        return 'Old';
      }
      const normalized = value.trim();
      return normalized === '' ? 'Old' : normalized;
    };

    const newStudentsCount = enrolledStudents.filter((student) => normalizeProfileStatus(student.profileStatus) === 'New').length;
    const oldStudentsCount = enrolledStudents.filter((student) => normalizeProfileStatus(student.profileStatus) === 'Old').length;
    const transfereeCount = enrolledStudents.filter((student) => normalizeProfileStatus(student.profileStatus) === 'Transferee').length;

    const rosterTotals = {
      onHold: students.filter((student) => {
        const status = (student.currentTermStatus ?? '').toLowerCase();
        return status.includes('hold') || Boolean(student.promotionHoldReason);
      }).length,
      notEnrolled: students.filter((student) => student.status === 'Not Enrolled').length,
      graduated: students.filter((student) => student.status === 'Graduated').length,
    };

    const summary: AdminReportSummary = {
      totalStudents: students.length,
      totalEnrollees: enrolledStudents.length,
      newStudents: newStudentsCount,
      oldStudents: oldStudentsCount,
      transferees: transfereeCount,
      onHoldStudents: rosterTotals.onHold,
      notEnrolledStudents: rosterTotals.notEnrolled,
      graduatedStudents: rosterTotals.graduated,
    };

    const yearLevelBuckets = new Map<number, number>();
    enrolledStudents.forEach((student) => {
      const yearLevel = Number(student.year) || 0;
      if (yearLevel <= 0) {
        return;
      }
      yearLevelBuckets.set(yearLevel, (yearLevelBuckets.get(yearLevel) ?? 0) + 1);
    });

    const suffixForYear = (year: number): string => {
      if (year === 1) return 'st';
      if (year === 2) return 'nd';
      if (year === 3) return 'rd';
      return 'th';
    };

    const yearLevelDistribution = Array.from(yearLevelBuckets.entries())
      .map(([yearLevel, count]) => ({
        yearLevel,
        yearKey: `${yearLevel}y`,
        label: `${yearLevel}${suffixForYear(yearLevel)} Year`,
        students: count,
      }))
      .sort((a, b) => a.yearLevel - b.yearLevel);

    const masterList = enrolledStudents.map((student) => ({
      id: student.studentId,
      name: student.name,
      course: student.course,
      year: student.year ?? 0,
      status: normalizeProfileStatus(student.profileStatus),
      block: student.block ?? null,
      email: student.email ?? null,
      enrollmentStatus: student.status,
    }));

    return {
      summary,
      yearLevelDistribution,
      masterList,
    };
  }, [academicYear, semester, globalAcademicYear, globalSemester, students]);

  const fallbackSemesterLabel = React.useMemo(() => {
    if (currentReport) {
      return currentReport.semesterLabel;
    }
    const fallbackTerm = reports.terms.find((term) => term.academicYear === academicYear && term.semester === semester);
    if (fallbackTerm) {
      return fallbackTerm.semesterLabel;
    }
    const option = semesterOptions.find((item) => item.value === semester);
    return option?.label ?? 'Unknown Semester';
  }, [currentReport, reports.terms, academicYear, semester, semesterOptions]);

  const resolvedReport = React.useMemo(() => {
    if (derivedCurrentTermReport) {
      return {
        academicYear,
        semester,
        semesterLabel: fallbackSemesterLabel,
        summary: derivedCurrentTermReport.summary,
        yearLevelDistribution: derivedCurrentTermReport.yearLevelDistribution,
        masterList: derivedCurrentTermReport.masterList,
      };
    }
    return currentReport ?? null;
  }, [derivedCurrentTermReport, academicYear, semester, fallbackSemesterLabel, currentReport]);

  const summary = resolvedReport?.summary ?? DEFAULT_SUMMARY;

  const yearLevelData = React.useMemo(
    () =>
      resolvedReport?.yearLevelDistribution.map((entry) => ({
        level: entry.label,
        students: entry.students,
        fill: YEAR_LEVEL_COLOR_MAP[entry.yearLevel] ?? FALLBACK_YEAR_COLOR,
      })) ?? [],
    [resolvedReport],
  );

    const perStudentAssessment = UNIFAST_FEE_TOTALS.amount;
    const totalProjectedCoverage = summary.totalEnrollees * perStudentAssessment;
    const aggregatedFeeItems = React.useMemo(
      () =>
        UNIFAST_FEE_ITEMS.map((item) => ({
          ...item,
          total: item.amount * summary.totalEnrollees,
        })),
      [summary.totalEnrollees],
    );

  const masterList = resolvedReport?.masterList ?? [];

  const semesterLabel = resolvedReport?.semesterLabel ?? fallbackSemesterLabel;

  const handlePrint = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!academicYear || !semester) {
      console.warn('Missing academic year or semester for report printing.');
      return;
    }

    const params = new URLSearchParams({
      academic_year: academicYear,
      semester,
    });

    const printUrl = `${API_BASE_URL}/print_enrollment_report.php?${params.toString()}`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    const cleanup = () => {
      setTimeout(() => {
        iframe.remove();
      }, 1500);
    };

    iframe.addEventListener('load', cleanup, { once: true });
    iframe.src = printUrl;
    document.body.appendChild(iframe);
  }, [academicYear, semester]);

  const getStatusVariant = (status: string) => (status === 'New' || status === 'Transferee' ? 'secondary' : 'default');

  const hasReportData = Boolean(resolvedReport);

  return (
    <>
      <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-section, #print-section * {
                        visibility: visible;
                    }
                    #print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none;
                    }
                }
            `}</style>
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="no-print flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight">Enrollment Reports</h1>
            <p className="text-muted-foreground">Generate and view enrollment statistics and master lists.</p>
          </div>
          <Button onClick={handlePrint} className="rounded-xl">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>

        <Card className="no-print rounded-xl">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Select the academic year and semester to generate a report.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <label htmlFor="academic-year" className="text-sm font-medium">Academic Year</label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger id="academic-year" className="rounded-xl">
                  <SelectValue placeholder="Select Academic Year" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availableAcademicYears.map((yearOption) => (
                    <SelectItem key={yearOption} value={yearOption}>
                      {yearOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label htmlFor="semester" className="text-sm font-medium">Semester</label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger id="semester" className="rounded-xl">
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availableSemesters.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div id="print-section" className="space-y-6">
          <div className="mb-8 hidden text-center print:block">
            <h1 className="text-2xl font-bold">Enrollment Report</h1>
            <p>Academic Year {academicYear}, {semesterLabel}</p>
          </div>

          {!hasReportData ? (
            <Card className="rounded-xl">
              <CardContent className="py-10 text-center text-muted-foreground">
                No enrollment records found for Academic Year {academicYear}, {semesterLabel}. Select a different term to view data.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle>Total Enrollees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{summary.totalEnrollees.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle>New Students</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{summary.newStudents.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle>Old Students</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{summary.oldStudents.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle>Transferees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{summary.transferees.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>Accounting Overview (RA 10931)</CardTitle>
                  <CardDescription>Projected UniFAST coverage based on the current enrollment roster.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border bg-muted/40 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Per Student Assessment</p>
                      <p className="text-2xl font-semibold">{formatCurrency(perStudentAssessment)}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Enrolled Students</p>
                      <p className="text-2xl font-semibold">{summary.totalEnrollees.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Projected UniFAST Coverage</p>
                      <p className="text-2xl font-semibold">{formatCurrency(totalProjectedCoverage)}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border overflow-x-auto no-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fee</TableHead>
                          <TableHead className="text-right">Per Student</TableHead>
                          <TableHead className="text-right">Projected Coverage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aggregatedFeeItems.map((fee) => (
                          <TableRow key={fee.description}>
                            <TableCell className="font-medium">{fee.description}</TableCell>
                            <TableCell className="text-right">{formatCurrency(fee.amount)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{formatCurrency(fee.total)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">{formatCurrency(perStudentAssessment)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalProjectedCoverage)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <Card className="rounded-xl lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Student Distribution by Year Level</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {yearLevelData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No enrolled students recorded for this term.</p>
                    ) : (
                      <ChartContainer config={yearLevelChartConfig} className="min-h-[200px] w-full">
                        <BarChart data={yearLevelData} layout="vertical">
                          <CartesianGrid horizontal={false} />
                          <YAxis dataKey="level" type="category" tickLine={false} axisLine={false} tickMargin={10} className="text-sm" />
                          <XAxis dataKey="students" type="number" hide />
                          <Tooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
                          <Bar dataKey="students" radius={4}>
                            {yearLevelData.map((entry) => (
                              <Cell key={entry.level} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
                <Card className="rounded-xl lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Master List</CardTitle>
                    <CardDescription>Official list of enrolled students.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Course &amp; Year</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {masterList.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                                No enrolled students recorded for this term.
                              </TableCell>
                            </TableRow>
                          ) : (
                            masterList.map((student) => (
                              <TableRow key={`${student.id}-${student.email ?? 'unknown'}`}>
                                <TableCell>{student.id}</TableCell>
                                <TableCell className="font-medium">{student.name}</TableCell>
                                <TableCell>
                                  {student.course}
                                  {student.year > 0 ? ` - ${student.year}` : ''}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusVariant(student.status)}>{student.status}</Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
