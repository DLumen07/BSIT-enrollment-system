'use client';
import React, { useMemo } from 'react';
import { CalendarClock, Clock, Layers, MapPin, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { useInstructor } from '@/app/instructor/context/instructor-context';
import { useAdmin } from '@/app/admin/context/admin-context';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = Array.from({ length: 12 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`);
const HOUR_HEIGHT_REM = 5;

const SCHEDULE_COLORS = [
    { bg: 'bg-blue-500/10', border: 'border-blue-500/30', accent: 'text-blue-300' },
    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', accent: 'text-emerald-300' },
    { bg: 'bg-amber-500/10', border: 'border-amber-500/30', accent: 'text-amber-200' },
    { bg: 'bg-purple-500/10', border: 'border-purple-500/30', accent: 'text-purple-200' },
    { bg: 'bg-pink-500/10', border: 'border-pink-500/30', accent: 'text-pink-200' },
    { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', accent: 'text-cyan-200' },
];

const getSubjectColor = (code: string) => {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    return SCHEDULE_COLORS[Math.abs(hash) % SCHEDULE_COLORS.length];
};

const timeToPosition = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const totalMinutes = (hour - 7) * 60 + minute;
    return (totalMinutes / 60) * HOUR_HEIGHT_REM;
};

const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
};

export default function InstructorSchedulePage() {
    const { instructorData } = useInstructor();
    const { adminData } = useAdmin();

    if (!instructorData || !adminData) return null;

    const { schedule, personal } = instructorData;
    const { academicYear, semester, semesterOptions } = adminData;
    const semesterLabel = semesterOptions.find((option) => option.value === semester)?.label ?? semester;

    const apiBaseUrl = useMemo(() => {
        return (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
            .replace(/\/$/, '')
            .trim();
    }, []);

    const handlePrint = () => {
        if (typeof window === 'undefined') return;

        const printUrl = `${apiBaseUrl}/print_instructor_schedule.php?email=${encodeURIComponent(personal.email)}`;

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
    };

    const blocksHandled = useMemo(() => {
        const unique = new Set<string>();
        schedule.forEach((entry) => {
            if (entry.block) {
                unique.add(entry.block);
            }
        });
        return Array.from(unique);
    }, [schedule]);

    const sortedByTime = useMemo(() => {
        return [...schedule].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [schedule]);

    const earliestStart = sortedByTime[0]?.startTime ?? null;
    const latestEnd = sortedByTime[sortedByTime.length - 1]?.endTime ?? null;

    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-semibold tracking-tight text-white">Weekly Teaching Schedule</h1>
                <p className="text-sm text-slate-400">
                    {personal.name} • A.Y. {academicYear} • {semesterLabel}
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <ScrollReveal delay={0.1} className="h-full">
                    <Card className="border-white/10 bg-slate-900/70 h-full">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs uppercase tracking-wide text-slate-400">Total Classes</CardDescription>
                            <CardTitle className="text-3xl text-white">{schedule.length}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-400 text-sm">Across all assigned blocks</CardContent>
                    </Card>
                </ScrollReveal>
                <ScrollReveal delay={0.2} className="h-full">
                    <Card className="border-white/10 bg-slate-900/70 h-full">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs uppercase tracking-wide text-slate-400">Blocks Covered</CardDescription>
                            <CardTitle className="text-3xl text-white">{blocksHandled.length || '—'}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-400 text-sm">
                            {blocksHandled.length ? blocksHandled.join(', ') : 'Awaiting assignment'}
                        </CardContent>
                    </Card>
                </ScrollReveal>
                <ScrollReveal delay={0.3} className="h-full">
                    <Card className="border-white/10 bg-slate-900/70 h-full">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs uppercase tracking-wide text-slate-400">Earliest Call Time</CardDescription>
                            <CardTitle className="text-3xl text-white">{earliestStart ? formatTime(earliestStart) : '—'}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-400 text-sm">Based on current term</CardContent>
                    </Card>
                </ScrollReveal>
                <ScrollReveal delay={0.4} className="h-full">
                    <Card className="border-white/10 bg-slate-900/70 h-full">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs uppercase tracking-wide text-slate-400">Latest Wrap-up</CardDescription>
                            <CardTitle className="text-3xl text-white">{latestEnd ? formatTime(latestEnd) : '—'}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-slate-400 text-sm">Ensures alignment with admin grid</CardContent>
                    </Card>
                </ScrollReveal>
            </div>

            <ScrollReveal delay={0.5}>
                <Card className="border-white/10 bg-slate-950/70 backdrop-blur">
                <CardHeader className="gap-4 border-b border-white/5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <CardTitle className="text-white">Teaching Grid</CardTitle>
                            <CardDescription className="text-slate-400">
                                Mirrors the admin block schedule for consistent planning.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                                onClick={handlePrint}
                            >
                                <Printer className="mr-1.5 h-3.5 w-3.5" />
                                Print Schedule
                            </Button>
                            <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                                <CalendarClock className="mr-1.5 h-3.5 w-3.5" /> A.Y. {academicYear}
                            </Badge>
                            <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                                <Layers className="mr-1.5 h-3.5 w-3.5" /> {semesterLabel}
                            </Badge>
                        </div>
                    </div>
                    {blocksHandled.length ? (
                        <div className="flex flex-wrap gap-2">
                            {blocksHandled.map((block) => (
                                <Badge key={block} className="bg-blue-500/10 text-blue-200 border-blue-500/30">
                                    {block}
                                </Badge>
                            ))}
                        </div>
                    ) : null}
                </CardHeader>
                <CardContent className="p-0">
                    {schedule.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
                            <Layers className="h-8 w-8" />
                            <p>No schedule has been assigned for this term yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <div className="min-w-[1000px] p-6">
                                <div className="grid grid-cols-[5rem_repeat(6,1fr)]">
                                    <div className="h-12 border-b border-white/10" />
                                    {days.map((day) => (
                                        <div
                                            key={day}
                                            className="h-12 flex items-center justify-center border-b border-white/10 bg-white/5 first:rounded-tl-lg last:rounded-tr-lg text-sm font-semibold text-white"
                                        >
                                            {day}
                                        </div>
                                    ))}

                                    <div className="col-start-1 row-start-2 relative border-r border-white/10 bg-white/5/50">
                                        {timeSlots.map((time) => (
                                            <div key={time} className="relative" style={{ height: `${HOUR_HEIGHT_REM}rem` }}>
                                                <div className="absolute -top-3 right-3 text-xs font-medium text-slate-400">
                                                    {formatTime(time)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div
                                        className="col-start-2 col-span-6 row-start-2 relative grid grid-cols-6 bg-white/5/20"
                                        style={{ height: `${timeSlots.length * HOUR_HEIGHT_REM}rem` }}
                                    >
                                        {Array.from({ length: 12 }).map((_, index) => (
                                            <div
                                                key={`h-line-${index}`}
                                                className="absolute w-full border-t border-dashed border-white/10"
                                                style={{ top: `${index * HOUR_HEIGHT_REM}rem` }}
                                            />
                                        ))}
                                        {Array.from({ length: 6 }).map((_, index) => (
                                            <div
                                                key={`v-line-${index}`}
                                                className="absolute h-full border-r border-dashed border-white/10"
                                                style={{ left: `${(index + 1) * (100 / 6)}%` }}
                                            />
                                        ))}

                                        {schedule.map((subject) => {
                                            const dayIndex = days.indexOf(subject.day);
                                            if (dayIndex === -1) {
                                                return null;
                                            }

                                            const top = timeToPosition(subject.startTime);
                                            const height = Math.max(timeToPosition(subject.endTime) - top, 1.5);
                                            const color = getSubjectColor(subject.code ?? '');
                                            const normalizedRoom = (subject.room ?? '').trim();
                                            const hasRoomAssigned = normalizedRoom !== '' && normalizedRoom.toUpperCase() !== 'TBA';
                                            const blockLabel = subject.block ?? 'Block';
                                            const cardKey = subject.id ?? `${subject.code}-${subject.day}-${subject.startTime}`;

                                            return (
                                                <div
                                                    key={cardKey}
                                                    className={cn(
                                                        'absolute rounded-lg border text-xs p-3 shadow-sm transition-all hover:z-10 hover:shadow-lg hover:scale-[1.02] flex flex-col gap-1',
                                                        color.bg,
                                                        color.border,
                                                    )}
                                                    style={{
                                                        top: `${top}rem`,
                                                        height: `${height}rem`,
                                                        left: `calc(${(100 / 6) * dayIndex}% + 4px)`,
                                                        width: `calc(${100 / 6}% - 8px)`,
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className={cn('text-[11px] font-semibold uppercase tracking-wide', color.accent)}>
                                                            {subject.code}
                                                        </span>
                                                        <Badge className="bg-black/20 text-white border-white/20 px-1.5 py-0 text-[10px]">
                                                            {blockLabel}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-white/90 text-xs leading-tight line-clamp-2">{subject.description}</p>
                                                    <div className="mt-auto space-y-1">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-200/80">
                                                            <Layers className="h-3 w-3" />
                                                            <span className="truncate">{subject.instructor || personal.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-200/80">
                                                            <MapPin className="h-3 w-3" />
                                                            <span className="truncate">{hasRoomAssigned ? normalizedRoom : 'Room TBA'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-white">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{formatTime(subject.startTime)} – {formatTime(subject.endTime)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            </ScrollReveal>
        </main>
    );
}
