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
import { 
  Printer, FileText, Users, TrendingUp, CreditCard, 
  PieChart, List, Filter, Download, School, 
  GraduationCap, ArrowUpRight, Wallet, UserPlus, UserCheck, ArrowRightLeft
} from 'lucide-react';
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
      <div className="flex-1 p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="no-print flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Enrollment Reports</h1>
            <p className="text-slate-400 mt-1">Generate and view enrollment statistics and master lists.</p>
          </div>
          <Button onClick={handlePrint} className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
        </div>

        <Card className="no-print rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Filter className="h-5 w-5" />
                </div>
                <div>
                    <CardTitle className="text-lg font-semibold text-white">Report Filters</CardTitle>
                    <CardDescription className="text-slate-400">Select the academic year and semester to generate a report.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex flex-col gap-6 sm:flex-row">
            <div className="flex-1 space-y-2">
              <label htmlFor="academic-year" className="text-sm font-medium text-slate-300">Academic Year</label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger id="academic-year" className="h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20">
                  <SelectValue placeholder="Select Academic Year" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                  {availableAcademicYears.map((yearOption) => (
                    <SelectItem key={yearOption} value={yearOption} className="focus:bg-white/10 focus:text-white">
                      {yearOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <label htmlFor="semester" className="text-sm font-medium text-slate-300">Semester</label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger id="semester" className="h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20">
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                  {availableSemesters.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="focus:bg-white/10 focus:text-white">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div id="print-section" className="space-y-8">
          <div className="mb-8 hidden text-center print:block">
            <h1 className="text-2xl font-bold">Enrollment Report</h1>
            <p>Academic Year {academicYear}, {semesterLabel}</p>
          </div>

          {!hasReportData ? (
            <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm">
              <CardContent className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <div className="p-3 rounded-full bg-slate-800/50 text-slate-500">
                    <FileText className="h-8 w-8" />
                </div>
                <p>No enrollment records found for Academic Year {academicYear}, {semesterLabel}.</p>
                <p className="text-sm text-slate-500">Select a different term to view data.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden relative group hover:border-blue-500/30 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="h-16 w-16 text-blue-500" />
                  </div>
                  <CardHeader className="pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-400" />
                        Total Enrollees
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-4xl font-bold text-white tracking-tight">{summary.totalEnrollees.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden relative group hover:border-emerald-500/30 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <UserPlus className="h-16 w-16 text-emerald-500" />
                  </div>
                  <CardHeader className="pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-emerald-400" />
                        New Students
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-4xl font-bold text-emerald-400 tracking-tight">{summary.newStudents.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden relative group hover:border-indigo-500/30 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <UserCheck className="h-16 w-16 text-indigo-500" />
                  </div>
                  <CardHeader className="pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-indigo-400" />
                        Old Students
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-4xl font-bold text-indigo-400 tracking-tight">{summary.oldStudents.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden relative group hover:border-purple-500/30 transition-colors">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ArrowRightLeft className="h-16 w-16 text-purple-500" />
                  </div>
                  <CardHeader className="pb-2 relative z-10">
                    <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-purple-400" />
                        Transferees
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <p className="text-4xl font-bold text-purple-400 tracking-tight">{summary.transferees.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-white">Accounting Overview (RA 10931)</CardTitle>
                            <CardDescription className="text-slate-400">Projected UniFAST coverage based on the current enrollment roster.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Per Student Assessment</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(perStudentAssessment)}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Enrolled Students</p>
                      <p className="text-2xl font-bold text-white">{summary.totalEnrollees.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Projected UniFAST Coverage</p>
                      <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalProjectedCoverage)}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-white/5">
                        <TableRow className="hover:bg-white/5 border-white/10">
                          <TableHead className="text-slate-400 font-medium">Fee Description</TableHead>
                          <TableHead className="text-right text-slate-400 font-medium">Per Student</TableHead>
                          <TableHead className="text-right text-slate-400 font-medium">Projected Coverage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aggregatedFeeItems.map((fee) => (
                          <TableRow key={fee.description} className="hover:bg-white/5 border-white/5">
                            <TableCell className="font-medium text-slate-300">{fee.description}</TableCell>
                            <TableCell className="text-right text-slate-300">{formatCurrency(fee.amount)}</TableCell>
                            <TableCell className="text-right text-slate-400">{formatCurrency(fee.total)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-white/5 font-semibold border-white/10">
                          <TableCell className="text-white">Total Assessment</TableCell>
                          <TableCell className="text-right text-white">{formatCurrency(perStudentAssessment)}</TableCell>
                          <TableCell className="text-right text-emerald-400">{formatCurrency(totalProjectedCoverage)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                <Card className="rounded-xl lg:col-span-2 border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                  <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                            <PieChart className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-white">Distribution</CardTitle>
                            <CardDescription className="text-slate-400">Students by Year Level</CardDescription>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {yearLevelData.length === 0 ? (
                      <p className="text-sm text-slate-400">No enrolled students recorded for this term.</p>
                    ) : (
                      <ChartContainer config={yearLevelChartConfig} className="min-h-[200px] w-full">
                        <BarChart data={yearLevelData} layout="vertical">
                          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.1)" />
                          <YAxis dataKey="level" type="category" tickLine={false} axisLine={false} tickMargin={10} className="text-sm fill-slate-400" stroke="#94a3b8" />
                          <XAxis dataKey="students" type="number" hide />
                          <Tooltip 
                            content={<ChartTooltipContent hideLabel />} 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                          />
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
                <Card className="rounded-xl lg:col-span-3 border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                  <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                            <List className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-white">Master List</CardTitle>
                            <CardDescription className="text-slate-400">Official list of enrolled students.</CardDescription>
                        </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-white/5">
                          <TableRow className="hover:bg-white/5 border-white/10">
                            <TableHead className="text-slate-400 font-medium">Student ID</TableHead>
                            <TableHead className="text-slate-400 font-medium">Name</TableHead>
                            <TableHead className="text-slate-400 font-medium">Course &amp; Year</TableHead>
                            <TableHead className="text-slate-400 font-medium">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {masterList.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-sm text-slate-500 py-8">
                                No enrolled students recorded for this term.
                              </TableCell>
                            </TableRow>
                          ) : (
                            masterList.map((student) => (
                              <TableRow key={`${student.id}-${student.email ?? 'unknown'}`} className="hover:bg-white/5 border-white/5">
                                <TableCell className="text-slate-300 font-mono text-xs">{student.id}</TableCell>
                                <TableCell className="font-medium text-slate-200">{student.name}</TableCell>
                                <TableCell className="text-slate-400 text-sm">
                                  {student.course}
                                  {student.year > 0 ? ` - ${student.year}` : ''}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline"
                                    className={
                                        student.status === 'New' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                        student.status === 'Transferee' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                        "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    }
                                  >
                                    {student.status}
                                  </Badge>
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
      </div>
    </>
  );
}
