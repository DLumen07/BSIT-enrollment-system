
'use client';

import React from 'react';
import { useInstructor } from '@/app/instructor/context/instructor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { BookOpen, Clock, Users, Calendar, Layers } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

    // Stats calculations
    const totalClasses = classes.length;
    const totalStudents = classes.reduce((acc, curr) => acc + curr.studentCount, 0);
    const todaysClassCount = todaysClasses.length;

    return (
        <div className="min-h-screen bg-[#020617] p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Welcome, {personal.name}!</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 mt-1">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{todayLabel}</span>
                        </div>
                        <span aria-hidden="true">•</span>
                        <span>{currentTimeLabel}</span>
                    </div>
                    <p className="text-slate-400 mt-1">Here is your schedule snapshot for today.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Classes */}
                <Card className="group relative overflow-hidden rounded-xl border-white/10 bg-gradient-to-br from-blue-500/5 to-orange-500/5 hover:from-blue-500/10 hover:to-orange-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
                    <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                    <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Total Classes</CardTitle>
                        <BookOpen className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold text-slate-100">{totalClasses}</div>
                        <p className="text-xs text-slate-500 mt-1">Active subjects</p>
                    </CardContent>
                </Card>

                {/* Total Students */}
                <Card className="group relative overflow-hidden rounded-xl border-white/10 bg-gradient-to-br from-blue-500/5 to-orange-500/5 hover:from-blue-500/10 hover:to-orange-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
                    <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                    <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold text-slate-100">{totalStudents}</div>
                        <p className="text-xs text-slate-500 mt-1">All sections</p>
                    </CardContent>
                </Card>

                {/* Today's Classes */}
                <Card className="group relative overflow-hidden rounded-xl border-white/10 bg-gradient-to-br from-blue-500/5 to-orange-500/5 hover:from-blue-500/10 hover:to-orange-500/10 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
                    <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
                    <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Today's Classes</CardTitle>
                        <Calendar className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="text-2xl font-bold text-slate-100">{todaysClassCount}</div>
                        <p className="text-xs text-slate-500 mt-1">{todayWeekday}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                {/* Today's Schedule */}
                <Card className="lg:col-span-2 rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Clock className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-semibold text-white">Today's Schedule</CardTitle>
                                <CardDescription className="text-slate-400">{todayWeekday} classes based on the master schedule.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {todaysClasses.length > 0 ? (
                            <div className="space-y-4">
                                {todaysClasses.map((subject) => (
                                    <div key={`${subject.id}-${subject.startTime}`} className="flex items-start gap-4 group">
                                        <div className="flex-shrink-0 w-20 text-right">
                                            <p className="font-semibold text-sm text-slate-200">{formatTime(subject.startTime)}</p>
                                            <p className="text-xs text-slate-500">{formatTime(subject.endTime)}</p>
                                        </div>
                                        <div className="relative w-full pl-4">
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500/50 group-hover:bg-blue-500 transition-colors rounded-full" aria-hidden="true" />
                                            <div className="rounded-xl bg-white/5 p-3 border border-white/10 group-hover:bg-white/10 transition-colors">
                                                <p className="font-semibold text-slate-200">{subject.code} • {subject.block}</p>
                                                <p className="text-sm text-slate-400">{subject.description} • {subject.room ?? 'Room TBA'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 bg-white/5 rounded-xl h-full">
                                <div className="p-3 rounded-full bg-white/5 mb-4">
                                    <BookOpen className="h-8 w-8 text-slate-500" />
                                </div>
                                <p className="font-semibold text-slate-200">No classes on {todayWeekday}.</p>
                                {nextScheduledClass ? (
                                    <p className="text-sm text-slate-400 mt-1">
                                        Your next class is <span className="text-slate-200 font-medium">{nextScheduledClass.code} ({nextScheduledClass.block})</span> on{' '}
                                        {nextScheduledClass.day} at {formatTime(nextScheduledClass.startTime)}.
                                    </p>
                                ) : (
                                    <p className="text-sm text-slate-400 mt-1">You have no classes assigned yet.</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="p-6 pt-0">
                        <Button asChild className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 border-0">
                            <Link href={`/instructor/dashboard/schedule?${emailQuery}`}>View Full Schedule</Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Right Column: My Classes & Announcements */}
                <div className="space-y-6">
                    {/* My Classes */}
                    <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-orange-500/10">
                                    <Layers className="h-4 w-4 text-orange-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold text-white">My Classes</CardTitle>
                                    <CardDescription className="text-slate-400">Overview of classes.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {classes.map((c) => (
                                <div key={`${c.subjectCode}-${c.block}`} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                                    <div>
                                        <p className="font-semibold text-slate-200">{c.subjectCode} - {c.block}</p>
                                        <p className="text-xs text-slate-400">{c.subjectDescription}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                                        <Users className="h-3.5 w-3.5 text-slate-400" />
                                        <span className="text-slate-200 font-medium">{c.studentCount}</span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter className="p-6 pt-0">
                            <Button asChild className="w-full rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20 border-0">
                                <Link href={`/instructor/dashboard/classes?${emailQuery}`}>Manage Classes</Link>
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Announcements */}
                    <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-purple-500/10">
                                    <BookOpen className="h-4 w-4 text-purple-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold text-white">Announcements</CardTitle>
                                    <CardDescription className="text-slate-400">Updates from the admin team.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {displayedAnnouncements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <p className="text-sm text-slate-500">No announcements for instructors are available right now.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {displayedAnnouncements.map((announcement) => {
                                        const authorName = announcement.createdBy.name?.trim() ?? '';
                                        return (
                                            <div key={announcement.id} className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors">
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div>
                                                        <p className="font-semibold leading-tight text-slate-200">{announcement.title}</p>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            {formatAnnouncementTimestamp(announcement.createdAt)}{authorName !== '' ? ` • ${authorName}` : ''}
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary" className="bg-white/10 text-slate-400 hover:bg-white/20 border-white/10">{announcement.audience}</Badge>
                                                </div>
                                                <Separator className="my-3 bg-white/10" />
                                                <p className="text-sm text-slate-400 whitespace-pre-line leading-relaxed">{announcement.message}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {announcements.length > displayedAnnouncements.length && (
                                <p className="mt-4 text-xs text-center text-slate-500">Showing the latest {displayedAnnouncements.length} announcements.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
