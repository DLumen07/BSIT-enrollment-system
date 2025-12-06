
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CalendarClock, MapPin, User2, Layers, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudent } from '@/app/student/context/student-context';
import Loading from '@/app/loading';
import { Badge } from '@/components/ui/badge';

type Subject = {
    id: number;
    code: string;
    description: string;
    day: string;
    startTime: string;
    endTime: string;
    instructor?: string;
    color: string;
    room: string;
    block?: string | null;
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = Array.from({ length: 12 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`); // 7 AM to 6 PM

const HOUR_HEIGHT_REM = 5; // Increased height for better readability

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
}

const formatSemesterLabel = (value?: string | null) => {
    if (!value) return 'Semester not set';
    const normalized = value.trim().toLowerCase();
    if (normalized.includes('1')) {
        return '1st Semester';
    }
    if (normalized.includes('2')) {
        return '2nd Semester';
    }
    if (normalized.includes('summer')) {
        return 'Summer Term';
    }
    return value;
};

// Color palette for schedule blocks to ensure visibility in dark mode
const SCHEDULE_COLORS = [
    { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-100', accent: 'text-blue-400' },
    { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-100', accent: 'text-orange-400' },
    { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-100', accent: 'text-green-400' },
    { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-100', accent: 'text-purple-400' },
    { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-100', accent: 'text-pink-400' },
    { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-100', accent: 'text-cyan-400' },
];

const getSubjectColor = (code: string) => {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    return SCHEDULE_COLORS[Math.abs(hash) % SCHEDULE_COLORS.length];
};

export default function StudentSchedulePage() {
    const { studentData } = useStudent();
    const scheduleContainerRef = React.useRef<HTMLDivElement>(null);
    const apiBaseUrl = React.useMemo(() => {
        return (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
            .replace(/\/$/, '')
            .trim();
    }, []);

    if (!studentData) {
        return <Loading />;
    }

    const registeredSubjects = studentData.enrollment?.registeredSubjects ?? [];
    const registeredSubjectCodes = React.useMemo(() => {
        return registeredSubjects
            .map((subject) => (subject.code ?? '').trim().toUpperCase())
            .filter((code): code is string => code.length > 0);
    }, [registeredSubjects]);

    const studentSchedule = React.useMemo(() => {
        const scheduleEntries = studentData.schedule ?? [];
        if (registeredSubjectCodes.length === 0) {
            return [];
        }
        const lookup = new Set(registeredSubjectCodes);
        return scheduleEntries.filter((subject) => lookup.has(subject.code.trim().toUpperCase()));
    }, [studentData.schedule, registeredSubjectCodes]);
    const block = studentData.academic?.block ?? '';
    const enrollmentTrack = studentData.academic?.enrollmentTrack ?? 'Regular';
    const currentTerm = studentData.currentTerm ?? {};
    const academicYearLabel = currentTerm.academicYear && currentTerm.academicYear.trim() !== ''
        ? `A.Y. ${currentTerm.academicYear}`
        : 'A.Y. not set';
    const semesterLabel = formatSemesterLabel(currentTerm.semester);

    const handlePrint = () => {
        if (typeof window === 'undefined' || !studentData?.contact?.email) {
            return;
        }

        const printUrl = `${apiBaseUrl}/print_student_schedule.php?email=${encodeURIComponent(studentData.contact.email)}`;

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

    return (
        <>
        <main className="flex-1 p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <CalendarClock className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">My Class Schedule</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-foreground">
                                    {academicYearLabel}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">{semesterLabel}</span>
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {block && (
                            <div className="hidden sm:flex flex-col items-end mr-2">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Block Section</span>
                                <span className="text-sm font-bold text-foreground">{block}</span>
                            </div>
                        )}
                        <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2 hidden sm:flex">
                            <Printer className="h-4 w-4" />
                            Print Schedule
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto" id="student-schedule-print" ref={scheduleContainerRef}>
                    {studentSchedule.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                            <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <CalendarClock className="h-10 w-10 text-muted-foreground/50" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">No Schedule Available</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mt-2">
                                Your schedule hasn't been generated yet. This usually happens if you haven't enrolled in any subjects for this term.
                            </p>
                        </div>
                    ) : (
                        <div className="min-w-[1000px] p-6">
                            <div className="grid grid-cols-[5rem_repeat(6,1fr)]">
                                {/* Header Row */}
                                <div className="h-12 border-b border-white/10"></div>
                                {days.map(day => (
                                    <div key={day} className="h-12 flex items-center justify-center border-b border-white/10 bg-white/5 first:rounded-tl-lg last:rounded-tr-lg">
                                        <span className="font-semibold text-sm text-foreground">{day}</span>
                                    </div>
                                ))}

                                {/* Time Slots & Grid */}
                                <div className="col-start-1 row-start-2 relative border-r border-white/10 bg-white/5/50">
                                    {timeSlots.map((time) => (
                                        <div key={time} className="relative" style={{ height: `${HOUR_HEIGHT_REM}rem` }}>
                                            <div className="absolute -top-3 right-3 text-xs font-medium text-muted-foreground">
                                                {formatTime(time)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="col-start-2 col-span-6 row-start-2 relative grid grid-cols-6 bg-white/5/20" style={{ height: `${timeSlots.length * HOUR_HEIGHT_REM}rem` }}>
                                    {/* Grid Lines */}
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div 
                                            key={`h-line-${i}`} 
                                            className="absolute w-full border-t border-dashed border-white/10"
                                            style={{ top: `${i * HOUR_HEIGHT_REM}rem` }}
                                        />
                                    ))}
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div 
                                            key={`v-line-${i}`} 
                                            className="absolute h-full border-r border-dashed border-white/10"
                                            style={{ left: `${(i + 1) * (100 / 6)}%` }}
                                        />
                                    ))}

                                    {/* Schedule Blocks */}
                                    {studentSchedule.map(subject => {
                                        const dayIndex = days.indexOf(subject.day);
                                        if (dayIndex === -1) return null;

                                        const startPosition = timeToPosition(subject.startTime);
                                        const endPosition = timeToPosition(subject.endTime);
                                        const blockHeight = Math.max(endPosition - startPosition, 1.5);
                                        const colorScheme = getSubjectColor(subject.code);

                                        return (
                                            <div
                                                key={subject.id}
                                                className={cn(
                                                    'absolute rounded-lg p-3 border text-xs overflow-hidden transition-all hover:z-10 hover:shadow-lg hover:scale-[1.02] group cursor-default',
                                                    colorScheme.bg,
                                                    colorScheme.border
                                                )}
                                                style={{
                                                    top: `${startPosition}rem`,
                                                    height: `${blockHeight}rem`,
                                                    left: `calc(${(100 / 6) * dayIndex}% + 4px)`,
                                                    width: `calc(${100 / 6}% - 8px)`,
                                                }}
                                            >
                                                <div className="flex flex-col h-full justify-between gap-1">
                                                    <div>
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <span className={cn("font-bold text-[11px] px-1.5 py-0.5 rounded bg-black/20 backdrop-blur-sm", colorScheme.accent)}>
                                                                {subject.code}
                                                            </span>
                                                            {subject.block && (
                                                                <Badge variant="outline" className="text-[9px] h-4 px-1 border-white/10 bg-black/20 text-muted-foreground">
                                                                    {subject.block}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className={cn("font-medium leading-tight line-clamp-2 mb-1", colorScheme.text)}>
                                                            {subject.description}
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="space-y-1 mt-auto">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                                                            <User2 className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{subject.instructor || 'TBA'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                                                            <MapPin className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{subject.room || 'TBA'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-medium pt-1 border-t border-white/5 mt-1">
                                                            <Clock className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">
                                                                {formatTime(subject.startTime)} - {formatTime(subject.endTime)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
        <style jsx global>{`
            @media print {
                body {
                    background: #fff;
                }
                body * {
                    visibility: hidden;
                }
                #student-schedule-print,
                #student-schedule-print * {
                    visibility: visible;
                }
                #student-schedule-print {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    box-shadow: none !important;
                    border: none !important;
                    background: white !important;
                    color: black !important;
                }
                #student-schedule-print .no-print {
                    display: none !important;
                }
                /* Force background printing */
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
            }
        `}</style>
        </>
    );
}
