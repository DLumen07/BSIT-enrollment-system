
'use client';
import Link from 'next/link';
import {
  ChevronRight,
  Search,
  ArrowUpRight,
  AlertTriangle,
  UserX,
  Users,
  GraduationCap,
  Layers,
  FileText,
  UserCheck,
  Calendar
} from 'lucide-react';
import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell, Legend } from "recharts"
import Image from 'next/image';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAdmin } from '../context/admin-context';


const yearLevelChartConfig = {
  students: {
    label: "Students",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

type SchedulingIssue = {
  id: string;
  block: string;
  subject: string;
  type: 'No Instructor' | 'Conflict';
  details: string;
  priority: 'high' | 'medium';
};

const STUDENT_STATUS_COLORS: Record<string, string> = {
  New: 'hsl(217.2 91.2% 59.8%)', // Blue
  Old: 'hsl(24 95% 53%)', // Orange
  Transferee: 'hsl(210 40% 96.1%)', // Muted/Whiteish
  Unknown: 'hsl(var(--muted-foreground))',
};

const formatYearLabel = (year: number) => {
  if (year <= 0) {
    return 'Unspecified';
  }
  switch (year) {
    case 1:
      return '1st Year';
    case 2:
      return '2nd Year';
    case 3:
      return '3rd Year';
    case 4:
      return '4th Year';
    default:
      return `${year}th Year`;
  }
};

const toMinutes = (time?: string | null): number | null => {
  if (!time) {
    return null;
  }
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

export default function AdminDashboardPage() {
  const { adminData } = useAdmin();
  const { adminUsers, instructors, students, pendingApplications, blocks } = adminData;
  const currentUserRole = adminData.currentUser?.role ?? null;
  const canAccessTotalUsers = currentUserRole !== 'Moderator';

  const isEnrolled = React.useCallback((status?: string | null) => {
    if (typeof status !== 'string') {
      return false;
    }
    return status.trim().toLowerCase() === 'enrolled';
  }, []);

  const scopedStudents = React.useMemo(() => students.filter((student) => isEnrolled(student.status)), [students, isEnrolled]);

  const totalUsers = adminUsers.length + instructors.length + students.length;
  const totalStudents = scopedStudents.length;
  const totalBlocks = blocks.length;

  const yearLevelData = React.useMemo(() => {
    const counts = new Map<number, number>();
    scopedStudents.forEach((student) => {
      const yearLevel = Number.isFinite(student.year) ? student.year : 0;
      counts.set(yearLevel, (counts.get(yearLevel) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([yearLevel, count]) => ({
        level: formatYearLabel(yearLevel),
        students: count,
      }));
  }, [scopedStudents]);

  const studentStatusData = React.useMemo(() => {
    const counts = new Map<string, number>();
    scopedStudents.forEach((student) => {
      const status = student.profileStatus ?? 'Unknown';
      counts.set(status, (counts.get(status) ?? 0) + 1);
    });

    const preferredOrder = ['New', 'Old', 'Transferee'];

    return Array.from(counts.entries())
      .sort((a, b) => {
        const indexA = preferredOrder.indexOf(a[0]);
        const indexB = preferredOrder.indexOf(b[0]);
        if (indexA === -1 && indexB === -1) {
          return a[0].localeCompare(b[0]);
        }
        if (indexA === -1) {
          return 1;
        }
        if (indexB === -1) {
          return -1;
        }
        return indexA - indexB;
      })
      .map(([status, count]) => ({
        name: status,
        value: count,
        fill: STUDENT_STATUS_COLORS[status] ?? 'hsl(var(--accent))',
      }));
  }, [scopedStudents]);

  const studentStatusConfig = React.useMemo<ChartConfig>(() => {
    return studentStatusData.reduce((config, statusEntry) => {
      config[statusEntry.name] = {
        label: statusEntry.name,
        color: statusEntry.fill,
      };
      return config;
    }, {} as ChartConfig);
  }, [studentStatusData]);

  const schedulingIssues = React.useMemo<SchedulingIssue[]>(() => {
    const schedules = adminData.schedules ?? {};
    const issues: SchedulingIssue[] = [];

    Object.entries(schedules).forEach(([blockName, entries]) => {
      entries.forEach((entry) => {
        if (!entry.instructorId) {
          const subjectLabel = entry.code ?? entry.description ?? 'Subject';
          issues.push({
            id: `missing-${blockName}-${entry.id ?? subjectLabel}-${entry.day ?? 'day'}-${entry.startTime ?? 'time'}`,
            block: blockName,
            subject: subjectLabel,
            type: 'No Instructor',
            details: 'Subject has no assigned instructor.',
            priority: 'high',
          });
        }
      });
    });

    const instructorDayMap = new Map<string, Array<{ blockName: string; entry: any }>>();

    Object.entries(schedules).forEach(([blockName, entries]) => {
      entries.forEach((entry) => {
        if (!entry.instructorId) {
          return;
        }
        const key = `${entry.instructorId}-${(entry.day ?? '').toLowerCase()}`;
        if (!instructorDayMap.has(key)) {
          instructorDayMap.set(key, []);
        }
        instructorDayMap.get(key)!.push({ blockName, entry });
      });
    });

    instructorDayMap.forEach((entries, key) => {
      // Flag overlapping classes for the same instructor on the same day.
      const sorted = [...entries].sort((a, b) => {
        const aStart = toMinutes(a.entry.startTime) ?? 0;
        const bStart = toMinutes(b.entry.startTime) ?? 0;
        return aStart - bStart;
      });

      for (let index = 1; index < sorted.length; index++) {
        const previous = sorted[index - 1];
        const current = sorted[index];
        const previousEnd = toMinutes(previous.entry.endTime);
        const currentStart = toMinutes(current.entry.startTime);

        if (previousEnd === null || currentStart === null) {
          continue;
        }

        if (currentStart < previousEnd) {
          const instructorName = current.entry.instructor || previous.entry.instructor || 'Assigned instructor';
          const subjectLabel = current.entry.code ?? current.entry.description ?? 'Subject';
          const otherSubject = previous.entry.code ?? previous.entry.description ?? 'another class';
          issues.push({
            id: `conflict-${key}-${previous.entry.id ?? 'prev'}-${current.entry.id ?? 'curr'}`,
            block: current.blockName,
            subject: subjectLabel,
            type: 'Conflict',
            details: `${instructorName} overlaps with ${otherSubject} for ${previous.blockName} on ${current.entry.day ?? 'the same day'} (${current.entry.startTime}-${current.entry.endTime}).`,
            priority: 'high',
          });
        }
      }
    });

    return issues;
  }, [adminData.schedules]);

  const shouldScrollSchedulingHealth = schedulingIssues.length > 5;

  const totalUsersCard = (
    <Card className="group relative overflow-hidden rounded-xl border-white/10 bg-gradient-to-br from-blue-500/5 to-purple-500/5 hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
      <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
      <CardHeader className="relative z-10 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Users className="h-5 w-5" />
            </div>
            <div>
                <CardTitle className="text-lg font-semibold text-white">Total Users</CardTitle>
                <CardDescription className="text-slate-400">All system users</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 p-6">
        <div className="text-3xl font-bold text-slate-100">{totalUsers}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Dashboard</h1>
                <p className="text-slate-400 mt-1">
                    Overview of system performance and enrollment statistics.
                </p>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/admin/dashboard/students" className="focus:outline-none block">
            <Card className="group relative overflow-hidden rounded-xl border-white/10 bg-gradient-to-br from-blue-500/5 to-purple-500/5 hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
              <CardHeader className="relative z-10 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                        <GraduationCap className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold text-white">Total Students</CardTitle>
                        <CardDescription className="text-slate-400">Active enrolled</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-6">
                <div className="text-3xl font-bold text-slate-100">{totalStudents}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/dashboard/manage-blocks" className="focus:outline-none block">
            <Card className="group relative overflow-hidden rounded-xl border-white/10 bg-gradient-to-br from-blue-500/5 to-purple-500/5 hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
              <CardHeader className="relative z-10 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold text-white">Total Blocks</CardTitle>
                        <CardDescription className="text-slate-400">Active sections</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-6">
                <div className="text-3xl font-bold text-slate-100">{totalBlocks}</div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/dashboard/manage-applications" className="focus:outline-none block">
            <Card className="group relative overflow-hidden rounded-xl border-white/10 bg-gradient-to-br from-blue-500/5 to-purple-500/5 hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
              <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
              <CardHeader className="relative z-10 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <FileText className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold text-white">Applications</CardTitle>
                        <CardDescription className="text-slate-400">Pending review</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 p-6">
                <div className="text-3xl font-bold text-slate-100">{pendingApplications.length}</div>
              </CardContent>
            </Card>
          </Link>

          {canAccessTotalUsers ? (
            <Link href="/admin/dashboard/users" className="focus:outline-none block">
              {totalUsersCard}
            </Link>
          ) : (
            <div
              className="opacity-70 cursor-not-allowed"
              aria-disabled="true"
              title="Moderators cannot access the user directory"
            >
              {totalUsersCard}
            </div>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Bar Chart */}
          <Card className="flex flex-col lg:col-span-2 rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-white">Student Population</CardTitle>
                  <CardDescription className="text-slate-400">Distribution by year level</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-6">
              {yearLevelData.length > 0 ? (
                <ChartContainer config={yearLevelChartConfig} className="min-h-[250px] w-full">
                  <BarChart accessibilityLayer data={yearLevelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="level" 
                      tickLine={false} 
                      tickMargin={10} 
                      axisLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <ChartTooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      content={<ChartTooltipContent className="bg-slate-900 border-white/10 text-slate-200" />} 
                    />
                    <Bar 
                      dataKey="students" 
                      fill="url(#colorStudents)" 
                      radius={[8, 8, 0, 0]} 
                      maxBarSize={50}
                      animationDuration={2000}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-slate-500">
                  No student enrollment data available yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="flex flex-col rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-white">Demographics</CardTitle>
                  <CardDescription className="text-slate-400">Student status breakdown</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center p-6">
              {studentStatusData.length > 0 ? (
                <ChartContainer config={studentStatusConfig} className="min-h-[250px] w-full">
                  <PieChart accessibilityLayer>
                    <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel className="bg-slate-900 border-white/10 text-slate-200" />} />
                    <Pie 
                      data={studentStatusData} 
                      dataKey="value" 
                      nameKey="name" 
                      innerRadius={65} 
                      outerRadius={100}
                      paddingAngle={4}
                      cornerRadius={6} 
                      strokeWidth={2}
                      stroke="#0f172a"
                      animationDuration={2000}
                      animationEasing="ease-out"
                    >
                      {studentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Legend
                      content={({ payload }) => {
                        if (!payload || payload.length === 0) {
                          return null;
                        }
                        return (
                          <div className="flex flex-wrap justify-center gap-4 mt-4">
                            {payload.map((entry, index) => (
                              <div key={`item-${index}`} className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span>{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                      verticalAlign="bottom"
                      align="center"
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-sm text-slate-500">
                  No student status data available yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduling Health */}
          <Card className="lg:col-span-3 rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-white">Scheduling Health</CardTitle>
                    <CardDescription className="text-slate-400">Current scheduling conflicts and issues</CardDescription>
                  </div>
                </div>
                {schedulingIssues.length > 0 && (
                  <Badge variant="outline" className="border-red-500/20 text-red-500 bg-red-500/5">
                    {schedulingIssues.length} Issues Found
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className={`rounded-xl border border-white/10 overflow-hidden ${shouldScrollSchedulingHealth ? 'max-h-[360px] overflow-y-auto' : ''}`}>
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="hover:bg-white/5 border-white/10">
                      <TableHead className="w-[100px] text-slate-400 font-medium">Block</TableHead>
                      <TableHead className="text-slate-400 font-medium">Subject</TableHead>
                      <TableHead className="text-slate-400 font-medium">Issue Type</TableHead>
                      <TableHead className="text-slate-400 font-medium">Details</TableHead>
                      <TableHead className="text-right text-slate-400 font-medium">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedulingIssues.length > 0 ? (
                      schedulingIssues.map((issue) => (
                        <TableRow key={issue.id} className={`border-white/5 ${issue.priority === 'high' ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-white/5'}`}>
                          <TableCell className="font-medium text-slate-200">{issue.block}</TableCell>
                          <TableCell className="text-slate-400">{issue.subject}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${
                              issue.type === 'Conflict' 
                                ? 'border-red-500/20 text-red-500 bg-red-500/5' 
                                : 'border-orange-500/20 text-orange-500 bg-orange-500/5'
                            }`}>
                              {issue.type === 'Conflict' ? <AlertTriangle className="mr-1 h-3 w-3" /> : <UserX className="mr-1 h-3 w-3" />}
                              {issue.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-400">{issue.details}</TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm" className="hover:bg-blue-500/10 hover:text-blue-500 text-slate-400">
                              <Link href={`/admin/dashboard/schedule/${encodeURIComponent(issue.block)}`}>
                                View Schedule <ArrowUpRight className="ml-2 h-3 w-3" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-500">
                            <div className="p-3 rounded-full bg-emerald-500/10 mb-2">
                              <Calendar className="h-6 w-6 text-emerald-500" />
                            </div>
                            <p className="font-medium text-slate-300">All Clear!</p>
                            <p className="text-sm">No scheduling issues detected.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
