
'use client';

import React from 'react';
import { useInstructor } from '@/app/instructor/context/instructor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { BookOpen, Clock, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
};

const getDayIndex = (day?: string | null) => {
    if (!day) return -1;
    return DAY_ORDER.findIndex((d) => d.toLowerCase() === day.toLowerCase());
};

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

export default function InstructorDashboardPage() {
    const { instructorData } = useInstructor();
    const searchParams = useSearchParams();
    const emailQuery = searchParams.toString();

    const [now, setNow] = React.useState(() => new Date());

    React.useEffect(() => {
        const interval = window.setInterval(() => setNow(new Date()), 60_000);
        return () => window.clearInterval(interval);
    }, []);

    if (!instructorData) return null;

    const { personal, schedule, classes, announcements } = instructorData;

    const todayWeekday = React.useMemo(
        () => now.toLocaleDateString(undefined, { weekday: 'long' }),
        [now],
    );
    const todayLabel = React.useMemo(
        () => now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
        [now],
    );
    const currentTimeLabel = React.useMemo(
        () => now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
        [now],
    );

    const todaysClasses = React.useMemo(() => {
        const lower = todayWeekday.toLowerCase();
        return schedule
            .filter((subject) => subject.day && subject.day.toLowerCase() === lower)
            .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
    }, [schedule, todayWeekday]);

    const nextScheduledClass = React.useMemo(() => {
        if (schedule.length === 0) {
            return null;
        }
        const todayIndex = getDayIndex(todayWeekday);
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const ordered = [...schedule]
            .map((subject) => {
                const dayIndex = getDayIndex(subject.day ?? null);
                const [hour = 0, minute = 0] = subject.startTime?.split(':').map(Number) ?? [];
                return {
                    subject,
                    dayIndex,
                    minutes: hour * 60 + minute,
                };
            })
            .filter((entry) => entry.dayIndex >= 0)
            .sort((a, b) => {
                const deltaA = (a.dayIndex - todayIndex + 7) % 7;
                const deltaB = (b.dayIndex - todayIndex + 7) % 7;
                if (deltaA === deltaB) {
                    return a.minutes - b.minutes;
                }
                return deltaA - deltaB;
            });

        const upcomingToday = ordered.find(
            (entry) => entry.dayIndex === todayIndex && entry.minutes >= currentMinutes,
        );
        return (upcomingToday ?? ordered[0] ?? null)?.subject ?? null;
    }, [schedule, todayWeekday, now]);

    const displayedAnnouncements = React.useMemo(() => announcements.slice(0, 5), [announcements]);

    return (
        <main className="flex-1 p-4 sm:p-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Welcome, {personal.name}!</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{todayLabel}</span>
                    </div>
                    <span aria-hidden="true">•</span>
                    <span>{currentTimeLabel}</span>
                </div>
                <p className="text-muted-foreground">Here is your schedule snapshot for today.</p>
            </div>
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                <Card className="rounded-xl lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Today's Schedule</CardTitle>
                        <CardDescription>{todayWeekday} classes based on the master schedule.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {todaysClasses.length > 0 ? (
                            <div className="space-y-4">
                                {todaysClasses.map((subject) => (
                                    <div key={`${subject.id}-${subject.startTime}`} className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-20 text-right">
                                            <p className="font-semibold text-sm">{formatTime(subject.startTime)}</p>
                                            <p className="text-xs text-muted-foreground">{formatTime(subject.endTime)}</p>
                                        </div>
                                        <div className="relative w-full pl-4">
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-full" aria-hidden="true" />
                                            <p className="font-semibold">{subject.code} • {subject.block}</p>
                                            <p className="text-sm text-muted-foreground">{subject.description} • {subject.room ?? 'Room TBA'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-xl h-full">
                                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="font-semibold">No classes on {todayWeekday}.</p>
                                {nextScheduledClass ? (
                                    <p className="text-sm text-muted-foreground">
                                        Your next class is {nextScheduledClass.code} ({nextScheduledClass.block}) on{' '}
                                        {nextScheduledClass.day} at {formatTime(nextScheduledClass.startTime)}.
                                    </p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">You have no classes assigned yet.</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                         <Button asChild variant="outline" className="w-full">
                            <Link href={`/instructor/dashboard/schedule?${emailQuery}`}>View Full Schedule</Link>
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
                            <div key={`${c.subjectCode}-${c.block}`} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
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
                            <Link href={`/instructor/dashboard/classes?${emailQuery}`}>Manage Classes</Link>
                        </Button>
                    </CardFooter>
                </Card>
             </div>
            <Card className="rounded-xl mt-6">
                <CardHeader>
                    <CardTitle>Announcements</CardTitle>
                    <CardDescription>Updates from the admin team.</CardDescription>
                </CardHeader>
                <CardContent>
                    {displayedAnnouncements.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No announcements for instructors are available right now.</p>
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
                    {announcements.length > displayedAnnouncements.length && (
                        <p className="mt-3 text-xs text-muted-foreground">Showing the latest {displayedAnnouncements.length} announcements.</p>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
