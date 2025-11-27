
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Users, Clock, BookOpen, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { useStudent } from '@/app/student/context/student-context';
import type { StudentDataType } from '@/app/student/context/student-context';
import { Badge } from '@/components/ui/badge';

const profileCompletionConfig = {
    completed: { label: 'Completed', color: 'hsl(var(--primary))' },
    remaining: { label: 'Remaining', color: 'hsl(var(--muted))' },
} satisfies ChartConfig

const collectProfileFieldValues = (student: StudentDataType): Array<string | null | undefined> => (
    [
        student.personal.firstName,
        student.personal.lastName,
        student.personal.middleName,
        student.personal.birthdate,
        student.personal.sex,
        student.personal.civilStatus,
        student.personal.nationality,
        student.personal.religion,
        student.personal.dialect,
        student.contact.email,
        student.contact.phoneNumber,
        student.address.currentAddress,
        student.address.permanentAddress,
        student.family.fathersName,
        student.family.fathersOccupation,
        student.family.mothersName,
        student.family.mothersOccupation,
        student.family.guardiansName,
        student.family.guardiansOccupation,
        student.family.guardiansAddress,
        student.additional.emergencyContactName,
        student.additional.emergencyContactAddress,
        student.additional.emergencyContactNumber,
        student.additional.livingWithFamily,
        student.additional.boarding,
        student.education.elementarySchool,
        student.education.elemYearGraduated,
        student.education.secondarySchool,
        student.education.secondaryYearGraduated,
        student.education.collegiateSchool,
        student.education.collegiateYearGraduated,
    ]
);

const calculateProfileCompletion = (student: StudentDataType): number => {
    const values = collectProfileFieldValues(student);
    if (values.length === 0) {
        return 0;
    }

    const filled = values.filter((value) => typeof value === 'string' && value.trim() !== '').length;
    const rawPercent = (filled / values.length) * 100;
    return Math.min(100, Math.max(0, Math.round(rawPercent)));
};

const formatSemesterLabel = (semester?: string | null): string | null => {
    if (!semester) {
        return null;
    }

    const normalized = semester.toLowerCase();
    if (normalized === '1st-sem') {
        return '1st Semester';
    }
    if (normalized === '2nd-sem') {
        return '2nd Semester';
    }
    if (normalized === 'summer') {
        return 'Summer';
    }
    return semester;
};


export default function StudentDashboardPage() {
  const { studentData } = useStudent();
  const [isClassmatesDialogOpen, setIsClassmatesDialogOpen] = useState(false);
    const classmates = useMemo(() => {
        if (!studentData?.classmates) {
            return [];
        }
        return [...studentData.classmates].sort((a, b) => a.name.localeCompare(b.name));
    }, [studentData?.classmates]);
  
  if (!studentData) {
    return <div>Loading...</div>; // Or a loading spinner
  }

  const { isEnrolled } = studentData.enrollment;
  const { block } = studentData.academic;
  const allStudentSchedule = studentData.schedule;
    const profileCompletionPercent = useMemo(() => calculateProfileCompletion(studentData), [studentData]);
    const profileCompletionChartData = useMemo(() => ([
        { name: 'Completed', value: profileCompletionPercent, fill: 'hsl(var(--primary))' },
        { name: 'Remaining', value: Math.max(0, 100 - profileCompletionPercent), fill: 'hsl(var(--muted))' },
    ]), [profileCompletionPercent]);

  const [todaysSchedule, setTodaysSchedule] = useState<typeof allStudentSchedule>([]);

  useEffect(() => {
    const dayOfWeek = new Date().toLocaleString('en-us', { weekday: 'long' });
    const scheduleForToday = allStudentSchedule.filter(subject => subject.day === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    setTodaysSchedule(scheduleForToday);
  }, [allStudentSchedule]);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  }

    const formatAnnouncementTimestamp = (isoString: string): string => {
        if (!isoString) {
            return 'Recently posted';
        }
        const parsed = new Date(isoString);
        if (Number.isNaN(parsed.getTime())) {
            return 'Recently posted';
        }
        return parsed.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const displayedAnnouncements = studentData.announcements.slice(0, 5);

    const latestEnrollmentRecord = useMemo(() => {
        const history = studentData.records?.enrollmentHistory ?? [];
        if (history.length === 0) {
            return null;
        }

        const sortedHistory = [...history].sort((a, b) => {
            const aTime = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
            const bTime = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
            return bTime - aTime;
        });

        return sortedHistory[0];
    }, [studentData.records?.enrollmentHistory]);

    const fallbackTerm = studentData.currentTerm ?? null;
    const academicYearDisplay = latestEnrollmentRecord?.academicYear
        ?? (fallbackTerm?.academicYear ?? null);
    const semesterDisplay = formatSemesterLabel(latestEnrollmentRecord?.semester ?? fallbackTerm?.semester ?? null);
    const enrollmentTermSummary = academicYearDisplay && semesterDisplay
        ? `A.Y. ${academicYearDisplay}, ${semesterDisplay}`
        : academicYearDisplay
            ? `A.Y. ${academicYearDisplay}`
            : semesterDisplay;

  return (
    <main className="flex-1 p-4 sm:p-6">
        <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">Welcome, {studentData.personal.firstName}!</h1>
            {isEnrolled && (
                 <p className="text-muted-foreground">
                    Here's a summary of your current academic status.
                </p>
            )}
            {!isEnrolled && (
                 <p className="text-muted-foreground">
                    It looks like you haven't enrolled yet. Please complete your enrollment to access all features.
                </p>
            )}
        </div>

        {!isEnrolled && (
            <Alert className="mt-6 border-primary rounded-xl">
                <Info className="h-4 w-4" />
                <AlertTitle>Important Notice</AlertTitle>
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    You are not yet officially enrolled for the current academic year. Please proceed to the enrollment page to complete the process.
                    <Button asChild variant="default" className="mt-2 sm:mt-0 rounded-xl">
                        <Link href="/student/dashboard/enrollment">Go to Enrollment</Link>
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-6">
            <Card className="rounded-xl lg:col-span-2">
                <CardHeader>
                    <CardTitle>Today's Schedule</CardTitle>
                    <CardDescription>Your classes for today.</CardDescription>
                </CardHeader>
                <CardContent>
                    {todaysSchedule.length > 0 ? (
                        <div className="space-y-4">
                            {todaysSchedule.map(subject => (
                                <div key={subject.id} className="flex items-start gap-4">
                                    <div className="flex-shrink-0 w-16 text-right">
                                        <p className="font-semibold text-sm">{formatTime(subject.startTime)}</p>
                                        <p className="text-xs text-muted-foreground">{formatTime(subject.endTime)}</p>
                                    </div>
                                    <div className="relative w-full pl-4">
                                         <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-full"></div>
                                         <p className="font-semibold">{subject.code}</p>
                                         <p className="text-sm text-muted-foreground">{subject.description}</p>
                                         <p className="text-xs text-muted-foreground">{subject.instructor}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-xl h-full">
                            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="font-semibold">No classes today!</p>
                            <p className="text-sm text-muted-foreground">Enjoy your day off.</p>
                        </div>
                    )}
                </CardContent>
                 {todaysSchedule.length > 0 && (
                    <CardFooter>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/student/dashboard/schedule">View Full Schedule</Link>
                        </Button>
                    </CardFooter>
                 )}
            </Card>
            <div className="space-y-6 lg:col-span-2">
                <div className="grid gap-6 sm:grid-cols-2">
                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>Enrollment Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isEnrolled ? (
                                <>
                                    <p className="font-semibold text-green-500">Enrolled</p>
                                    <p className="text-sm text-muted-foreground">
                                        {enrollmentTermSummary ?? 'Academic term details unavailable'}
                                    </p>
                                </>
                            ) : (
                                <p className="font-semibold text-destructive">Not Enrolled</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl flex flex-col">
                        <CardHeader>
                            <CardTitle>Current Block</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            {isEnrolled ? (
                                <p className="font-semibold">{block}</p>
                            ) : (
                                <p className="text-sm text-muted-foreground">N/A</p>
                            )}
                        </CardContent>
                        {isEnrolled && (
                             <CardFooter>
                                <Dialog open={isClassmatesDialogOpen} onOpenChange={setIsClassmatesDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full">
                                            <Users className="mr-2 h-4 w-4" />
                                            View Classmates
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Classmates in {block}</DialogTitle>
                                            <DialogDescription>
                                                List of all students enrolled in this block.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="max-h-[60vh] overflow-y-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Student Name</TableHead>
                                                        <TableHead>Student ID</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {classmates.length > 0 ? (
                                                        classmates.map((student) => (
                                                            <TableRow key={`${student.studentId}-${student.email ?? 'email'}`}>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar className="h-8 w-8">
                                                                            <AvatarImage src={student.avatarUrl ?? undefined} alt={student.name} data-ai-hint="person avatar" />
                                                                            <AvatarFallback>
                                                                                {(student.name || student.studentId || '?').charAt(0).toUpperCase()}
                                                                            </AvatarFallback>
                                                                        </Avatar>
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium">{student.name || 'Unnamed student'}</span>
                                                                            {student.email && (
                                                                                <span className="text-xs text-muted-foreground">{student.email}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>{student.studentId || '—'}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                                                                No classmates are listed for this block yet.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsClassmatesDialogOpen(false)}>Close</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardFooter>
                        )}
                    </Card>
                    <Card className="rounded-xl sm:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="space-y-1.5">
                                <CardTitle>Profile Completion</CardTitle>
                                <CardDescription>Keep your information up to date.</CardDescription>
                            </div>
                            <Button asChild size="sm" variant="ghost">
                                <Link href="/student/dashboard/profile">
                                    <UserCheck className="mr-2 h-4 w-4" /> Go to Profile
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center">
                            <ChartContainer
                                config={profileCompletionConfig}
                                className="mx-auto aspect-square w-full max-w-[200px]"
                            >
                                <PieChart>
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Pie
                                        data={profileCompletionChartData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={60}
                                        strokeWidth={5}
                                        cornerRadius={40}
                                    >
                                        {profileCompletionChartData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                     <text
                                        x="50%"
                                        y="50%"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="fill-foreground text-2xl font-bold"
                                    >
                                        {profileCompletionPercent}%
                                    </text>
                                </PieChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
                 <Card className="rounded-xl sm:col-span-2">
                    <CardHeader>
                        <CardTitle>Announcements</CardTitle>
                        <CardDescription>Latest news and updates.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {displayedAnnouncements.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No announcements are available right now. Check back soon for updates.</p>
                        ) : (
                            <div className="space-y-3">
                                {displayedAnnouncements.map((announcement) => {
                                    const authorName = announcement.createdBy.name?.trim() ?? '';
                                    return (
                                        <div key={announcement.id} className="rounded-lg border p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold leading-tight">{announcement.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatAnnouncementTimestamp(announcement.createdAt)}{authorName !== '' ? ` • ${authorName}` : ''}
                                                    </p>
                                                </div>
                                                <Badge variant="secondary">{announcement.audience}</Badge>
                                            </div>
                                            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{announcement.message}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {studentData.announcements.length > displayedAnnouncements.length && (
                            <p className="mt-3 text-xs text-muted-foreground">Showing the latest {displayedAnnouncements.length} announcements.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    </main>
  );
}

    