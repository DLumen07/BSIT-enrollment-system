
'use client';
import { useState, useEffect } from 'react';
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
import { studentSchedule as allStudentSchedule } from './schedule/page';
import { PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';


const mockClassmates = [
    { id: '2022-0234', name: 'Bob Williams', avatar: 'https://picsum.photos/seed/bw-student/40/40' },
    { id: '2022-0456', name: 'Samantha Green', avatar: 'https://picsum.photos/seed/sg-student/40/40' },
    { id: '2022-0789', name: 'Michael Chen', avatar: 'https://picsum.photos/seed/mc-student/40/40' },
    { id: '2022-1111', name: 'Emily Davis', avatar: 'https://picsum.photos/seed/ed-student/40/40' },
     { id: '2022-0001', name: 'You', avatar: 'https://picsum.photos/seed/student-avatar/40/40' },
];

const profileCompletionData = [{ name: 'Completed', value: 75, fill: 'hsl(var(--primary))' }, { name: 'Remaining', value: 25, fill: 'hsl(var(--muted))' }];
const profileCompletionConfig = {
    completed: { label: 'Completed', color: 'hsl(var(--primary))' },
    remaining: { label: 'Remaining', color: 'hsl(var(--muted))' },
} satisfies ChartConfig


export default function StudentDashboardPage() {
  const [isEnrolled, setIsEnrolled] = useState(true);
  const [isClassmatesDialogOpen, setIsClassmatesDialogOpen] = useState(false);
  const [todaysSchedule, setTodaysSchedule] = useState<typeof allStudentSchedule>([]);

  useEffect(() => {
    const dayOfWeek = new Date().toLocaleString('en-us', { weekday: 'long' });
    const scheduleForToday = allStudentSchedule.filter(subject => subject.day === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    setTodaysSchedule(scheduleForToday);
  }, []);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  }

  return (
    <main className="flex-1 p-4 sm:p-6">
        <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">Welcome, Student!</h1>
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
                                    <p className="text-sm text-muted-foreground">A.Y. 2024-2025, 1st Sem</p>
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
                                <p className="font-semibold">BSIT 2-A</p>
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
                                            <DialogTitle>Classmates in BSIT 2-A</DialogTitle>
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
                                                    {mockClassmates.sort((a, b) => a.name.localeCompare(b.name)).map(student => (
                                                        <TableRow key={student.id}>
                                                            <TableCell>
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar className="h-8 w-8">
                                                                        <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person avatar"/>
                                                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="font-medium">{student.name}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{student.id}</TableCell>
                                                        </TableRow>
                                                    ))}
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
                                        data={profileCompletionData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={60}
                                        strokeWidth={5}
                                        cornerRadius={40}
                                    >
                                        {profileCompletionData.map((entry) => (
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
                                        {profileCompletionData[0].value}%
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
                        <p className="text-sm">Midterm examinations are next week. Good luck!</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    </main>
  );
}
