
'use client';
import Link from 'next/link';
import {
  ChevronRight,
  Search,
  ArrowUpRight,
  AlertTriangle,
  UserX,
  Users,
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
    color: "hsl(var(--accent))",
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
  New: 'hsl(var(--chart-1))',
  Old: 'hsl(var(--chart-2))',
  Transferee: 'hsl(var(--chart-3))',
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
    <Card className="rounded-xl transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2">
      <CardHeader>
        <CardTitle>Total Users</CardTitle>
        <CardDescription>All system users</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{totalUsers}</p>
      </CardContent>
    </Card>
  );

  return (
    <>
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/dashboard/students" className="focus:outline-none">
            <Card className="rounded-xl transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2">
              <CardHeader>
                <CardTitle>Total Students</CardTitle>
                <CardDescription>All active students</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalStudents}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/dashboard/manage-blocks" className="focus:outline-none">
            <Card className="rounded-xl transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2">
              <CardHeader>
                <CardTitle>Total Blocks</CardTitle>
                <CardDescription>Available block sections</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalBlocks}</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/dashboard/manage-applications" className="focus:outline-none">
            <Card className="rounded-xl transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2">
              <CardHeader>
                <CardTitle>Pending Applications</CardTitle>
                <CardDescription>Awaiting review</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{pendingApplications.length}</p>
              </CardContent>
            </Card>
          </Link>
          {canAccessTotalUsers ? (
            <Link href="/admin/dashboard/users" className="focus:outline-none">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="flex flex-col lg:col-span-2 rounded-xl">
            <CardHeader>
              <CardTitle>Student Population by Year Level</CardTitle>
              <CardDescription>Distribution of students across all year levels.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {yearLevelData.length > 0 ? (
                <ChartContainer config={yearLevelChartConfig} className="min-h-[200px] w-full">
                  <BarChart accessibilityLayer data={yearLevelData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="level" tickLine={false} tickMargin={10} axisLine={false} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="students" fill="var(--color-students)" radius={4} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No student enrollment data available yet.</p>
              )}
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="leading-none text-muted-foreground">Showing student counts for the current academic year.</div>
            </CardFooter>
          </Card>
          <Card className="flex flex-col rounded-xl">
            <CardHeader>
              <CardTitle>Student Demographics</CardTitle>
              <CardDescription>Breakdown by student status.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center">
              {studentStatusData.length > 0 ? (
                <ChartContainer config={studentStatusConfig} className="min-h-[200px] w-full max-w-[250px]">
                  <PieChart accessibilityLayer>
                    <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                    <Pie data={studentStatusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} strokeWidth={2}>
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
                          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            {payload.map((entry, index) => (
                              <li key={`item-${index}`} className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span>{entry.value}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      }}
                      verticalAlign="bottom"
                      align="left"
                      wrapperStyle={{ paddingTop: '1rem', boxSizing: 'content-box' }}
                    />
                  </PieChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No student status data available yet.</p>
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-3 rounded-xl">
            <CardHeader>
              <CardTitle>Scheduling Health</CardTitle>
              <CardDescription>A summary of current scheduling issues that need attention.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={shouldScrollSchedulingHealth ? 'max-h-[360px] overflow-y-auto pr-2' : undefined}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Block</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Issue Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedulingIssues.length > 0 ? (
                    schedulingIssues.map((issue) => (
                      <TableRow key={issue.id} className={issue.priority === 'high' ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                        <TableCell className="font-medium">{issue.block}</TableCell>
                        <TableCell>{issue.subject}</TableCell>
                        <TableCell>
                          <Badge variant={issue.type === 'Conflict' ? 'destructive' : 'secondary'}>
                            {issue.type === 'Conflict' ? <AlertTriangle className="mr-1 h-3 w-3" /> : <UserX className="mr-1 h-3 w-3" />}
                            {issue.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{issue.details}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm" className="rounded-full hover:border-accent">
                            <Link href={`/admin/dashboard/schedule/${encodeURIComponent(issue.block)}`}>
                              View Schedule
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        All schedules look good. No issues detected.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
