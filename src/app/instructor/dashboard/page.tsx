
'use client';
import { useInstructor } from '@/app/instructor/context/instructor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { BookOpen, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function InstructorDashboardPage() {
    const { instructorData } = useInstructor();
    const { personal, schedule, classes } = instructorData;

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
                <h1 className="text-2xl font-bold tracking-tight">Welcome, {personal.name}!</h1>
                 <p className="text-muted-foreground">
                    Here's what's happening today.
                </p>
            </div>
             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                <Card className="rounded-xl lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Today's Schedule</CardTitle>
                        <CardDescription>Your upcoming classes for today.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {schedule.length > 0 ? (
                             <div className="space-y-4">
                                {schedule.map(subject => (
                                    <div key={subject.id} className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-20 text-right">
                                            <p className="font-semibold text-sm">{formatTime(subject.startTime)}</p>
                                            <p className="text-xs text-muted-foreground">{formatTime(subject.endTime)}</p>
                                        </div>
                                        <div className="relative w-full pl-4">
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-full"></div>
                                            <p className="font-semibold">{subject.code} - {subject.block}</p>
                                            <p className="text-sm text-muted-foreground">{subject.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-xl h-full">
                                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="font-semibold">No classes scheduled for today.</p>
                                <p className="text-sm text-muted-foreground">Enjoy your day!</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                         <Button asChild variant="outline" className="w-full">
                            <Link href="/instructor/dashboard/schedule">View Full Schedule</Link>
                        </Button>
                    </CardFooter>
                </Card>
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>My Classes</CardTitle>
                        <CardDescription>Overview of classes you are handling.</CardDescription>
                    </CardHeader>
                     <CardContent className="space-y-4">
                        {classes.map((c) => (
                            <div key={c.subjectCode} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                                <div>
                                    <p className="font-semibold">{c.subjectCode} - {c.block}</p>
                                    <p className="text-xs text-muted-foreground">{c.subjectDescription}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    <span>{c.studentCount}</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter>
                         <Button asChild variant="outline" className="w-full">
                            <Link href="/instructor/dashboard/classes">Manage Classes</Link>
                        </Button>
                    </CardFooter>
                </Card>
             </div>
        </main>
    );
}
