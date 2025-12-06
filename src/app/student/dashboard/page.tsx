
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Users, Clock, BookOpen, UserCheck, FileText, Layers, GraduationCap, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
        student.additional.differentlyAbled,
        student.additional.disability,
        student.additional.minorityGroup,
        student.additional.minority,
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
    const [showPasswordUpdatePrompt, setShowPasswordUpdatePrompt] = useState(false);
    const searchParams = useSearchParams();
    const classmates = useMemo(() => {
        if (!studentData?.classmates) {
            return [];
        }
        return [...studentData.classmates].sort((a, b) => a.name.localeCompare(b.name));
    }, [studentData?.classmates]);

    useEffect(() => {
        if (searchParams?.get('needsPasswordUpdate') === '1') {
                setShowPasswordUpdatePrompt(true);
        }
    }, [searchParams]);
  
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
    <>
    <Dialog open={showPasswordUpdatePrompt} onOpenChange={setShowPasswordUpdatePrompt}>
        <DialogContent className="max-w-md border-white/10 bg-[#020617] text-white">
            <DialogHeader>
                <DialogTitle className="text-2xl font-semibold">Secure your account</DialogTitle>
                <DialogDescription className="text-slate-400">
                    You signed in using a temporary password. Please update your password in Settings as soon as possible.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-slate-300">
                <p>Updating your password ensures no one else can access your student portal using the temporary credential.</p>
                <p>If you already changed your password, you can dismiss this reminder.</p>
            </div>
            <DialogFooter className="gap-2">
                <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={() => setShowPasswordUpdatePrompt(false)}>
                    Later
                </Button>
                <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                    <Link href="/student/dashboard/settings?needsPasswordUpdate=1">Go to Settings</Link>
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <main className="flex-1 p-4 sm:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back, {studentData.personal.firstName}!</h1>
            <p className="text-muted-foreground">
                {isEnrolled 
                    ? `You are currently enrolled for ${enrollmentTermSummary ?? 'the current term'}.`
                    : "You are not officially enrolled yet. Please complete your enrollment."}
            </p>
        </div>

        {!isEnrolled && (
            <Alert className="border-primary/50 bg-primary/5 text-primary rounded-xl">
                <Info className="h-4 w-4" />
                <AlertTitle>Enrollment Pending</AlertTitle>
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    Please proceed to the enrollment page to complete your registration.
                    <Button asChild variant="default" size="sm" className="mt-2 sm:mt-0 rounded-lg">
                        <Link href="/student/dashboard/enrollment">Enroll Now</Link>
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="group relative overflow-hidden rounded-xl border-white/10 bg-gradient-to-br from-blue-500/5 to-orange-500/5 hover:from-blue-500/10 hover:to-orange-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
                <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Enrollment Status</CardTitle>
                    <UserCheck className={`h-4 w-4 ${isEnrolled ? 'text-green-500' : 'text-red-500'}`} />
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-2xl font-bold text-foreground">{isEnrolled ? 'Enrolled' : 'Not Enrolled'}</div>
                    <p className="text-xs text-muted-foreground mt-1">{studentData.academic.statusDisplay || 'Status unknown'}</p>
                </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-xl border-white/10 bg-gradient-to-br from-blue-500/5 to-orange-500/5 hover:from-blue-500/10 hover:to-orange-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
                <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Current Block</CardTitle>
                    <Layers className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-2xl font-bold text-foreground">{block || 'N/A'}</div>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">Section</p>
                        {isEnrolled && (
                            <Dialog open={isClassmatesDialogOpen} onOpenChange={setIsClassmatesDialogOpen}>
                                <DialogTrigger asChild>
                                    <button className="text-xs text-blue-400 hover:text-blue-300 hover:underline focus:outline-none">
                                        View Classmates
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md border-white/10 bg-[#020617]">
                                    <DialogHeader>
                                        <DialogTitle>Classmates in {block}</DialogTitle>
                                        <DialogDescription>
                                            List of all students enrolled in this block.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-white/10 hover:bg-white/5">
                                                    <TableHead>Student Name</TableHead>
                                                    <TableHead>Student ID</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {classmates.length > 0 ? (
                                                    classmates.map((student) => (
                                                        <TableRow key={`${student.studentId}-${student.email ?? 'email'}`} className="border-white/10 hover:bg-white/5">
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
                                                    <TableRow className="border-white/10 hover:bg-white/5">
                                                        <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                                                            No classmates are listed for this block yet.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsClassmatesDialogOpen(false)} className="border-white/10 hover:bg-white/5">Close</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-xl border-white/10 bg-gradient-to-br from-blue-500/5 to-orange-500/5 hover:from-blue-500/10 hover:to-orange-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
                <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Enrolled Subjects</CardTitle>
                    <BookOpen className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-2xl font-bold text-foreground">{allStudentSchedule.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total subjects this term</p>
                </CardContent>
            </Card>

            <Card className="group relative overflow-hidden rounded-xl border-white/10 bg-gradient-to-br from-blue-500/5 to-orange-500/5 hover:from-blue-500/10 hover:to-orange-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
                <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Profile Completion</CardTitle>
                    <FileText className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-2xl font-bold text-foreground">{profileCompletionPercent}%</div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                        <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                            style={{ width: `${profileCompletionPercent}%` }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Schedule */}
            <Card className="lg:col-span-2 rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Calendar className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Today's Schedule</CardTitle>
                            <CardDescription>Your classes for today.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {todaysSchedule.length > 0 ? (
                        <div className="space-y-4">
                            {todaysSchedule.map(subject => (
                                <div key={subject.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                    <div className="flex-shrink-0 w-20 text-right">
                                        <p className="font-semibold text-sm text-foreground">{formatTime(subject.startTime)}</p>
                                        <p className="text-xs text-muted-foreground">{formatTime(subject.endTime)}</p>
                                    </div>
                                    <div className="relative w-full pl-4 border-l-2 border-blue-500/50">
                                         <p className="font-semibold text-foreground">{subject.code}</p>
                                         <p className="text-sm text-muted-foreground">{subject.description}</p>
                                         <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-[10px] border-white/10 bg-white/5 text-muted-foreground">
                                                {subject.room || 'TBA'}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">• {subject.instructor}</span>
                                         </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/10 rounded-xl bg-white/5">
                            <div className="p-4 rounded-full bg-white/5 mb-4">
                                <BookOpen className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="font-semibold text-lg">No classes today!</p>
                            <p className="text-sm text-muted-foreground">Enjoy your free time.</p>
                        </div>
                    )}
                </CardContent>
                 {todaysSchedule.length > 0 && (
                    <CardFooter>
                        <Button asChild variant="ghost" className="w-full hover:bg-white/5 hover:text-blue-400">
                            <Link href="/student/dashboard/schedule">View Full Schedule <Clock className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardFooter>
                 )}
            </Card>

            {/* Announcements & Profile Chart */}
            <div className="space-y-6">
                 <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-orange-500/10">
                                <Info className="h-4 w-4 text-orange-500" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Announcements</CardTitle>
                                <CardDescription>Latest updates</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {displayedAnnouncements.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No announcements available.</p>
                        ) : (
                            <div className="space-y-3">
                                {displayedAnnouncements.map((announcement) => {
                                    const authorName = announcement.createdBy.name?.trim() ?? '';
                                    return (
                                        <div key={announcement.id} className="rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-0 text-[10px] px-1.5 py-0 h-5">
                                                    {announcement.audience}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {formatAnnouncementTimestamp(announcement.createdAt)}
                                                </span>
                                            </div>
                                            <p className="font-medium text-sm leading-tight mb-1">{announcement.title}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{announcement.message}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                    {studentData.announcements.length > 0 && (
                        <CardFooter>
                             <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
                                View All Announcements
                             </Button>
                        </CardFooter>
                    )}
                </Card>

                <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                    <CardHeader className="relative z-10 pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Profile Status</CardTitle>
                            <UserCheck className="h-4 w-4 text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-20 w-20 relative flex-shrink-0">
                                <ChartContainer
                                    config={profileCompletionConfig}
                                    className="aspect-square w-full"
                                >
                                    <PieChart>
                                        <defs>
                                            <linearGradient id="profileGradient" x1="0" y1="0" x2="1" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" />
                                                <stop offset="100%" stopColor="#8b5cf6" />
                                            </linearGradient>
                                        </defs>
                                        <Pie
                                            data={profileCompletionChartData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={28}
                                            outerRadius={38}
                                            strokeWidth={0}
                                            cornerRadius={4}
                                            startAngle={90}
                                            endAngle={-270}
                                        >
                                            {profileCompletionChartData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry.name === 'Completed' ? 'url(#profileGradient)' : 'rgba(255,255,255,0.05)'} 
                                                />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xl font-bold text-foreground">{profileCompletionPercent}%</span>
                                </div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {profileCompletionPercent === 100 
                                        ? "Great job! Your profile is fully updated." 
                                        : "Complete your profile to ensure accurate records."}
                                </p>
                                <Button asChild variant="outline" size="sm" className="h-7 text-xs w-full border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-400">
                                    <Link href="/student/dashboard/profile">Update Profile</Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </main>
        </>
  );
}

    