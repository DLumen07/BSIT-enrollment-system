
'use client';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudent } from '@/app/student/context/student-context';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = Array.from({ length: 12 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`); // 7 AM to 6 PM

const HOUR_HEIGHT_REM = 4; // 4rem = 64px per hour

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

export default function StudentSchedulePage() {
    const { studentData } = useStudent();
    const scheduleContainerRef = React.useRef<HTMLDivElement>(null);
    if (!studentData) {
        return (
            <div className="flex h-full min-h-[300px] w-full items-center justify-center">
                <LoadingSpinner className="h-6 w-6" />
            </div>
        );
    }

    const studentSchedule = studentData.schedule ?? [];
    const block = studentData.academic?.block ?? 'N/A';
    const academicYear = '2024-2025';
    const semesterLabel = '1st Semester';

    const handlePrint = () => {
        if (typeof window === 'undefined') {
            return;
        }
        window.print();
    };

    return (
        <>
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">My Class Schedule</h1>
                    <p className="text-muted-foreground">
                        A.Y. {academicYear}, {semesterLabel} | Block: {block}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    disabled={studentSchedule.length === 0}
                    className="no-print gap-2"
                >
                    <Printer className="h-4 w-4" />
                    Print schedule
                </Button>
            </div>
            <Card className="rounded-xl" id="student-schedule-print" ref={scheduleContainerRef}>
                <CardContent className="p-4 overflow-x-auto">
                     <div className="grid grid-cols-[4rem_repeat(6,1fr)] min-w-[800px]">
                        {/* Top-left empty cell */}
                        <div></div>
                        {/* Day Headers */}
                        {days.map(day => (
                            <div key={day} className="h-10 text-center font-semibold text-muted-foreground text-sm p-2 sticky top-0 bg-background z-10">{day}</div>
                        ))}

                        {/* Time Column and Grid */}
                        <div className="col-start-1 row-start-2 relative">
                             {timeSlots.map((time) => (
                                <div key={time} className="h-16 relative">
                                    <div className="absolute -top-2.5 right-2 text-xs text-muted-foreground">{formatTime(time)}</div>
                                </div>
                            ))}
                        </div>
                        <div className="col-start-2 col-span-6 row-start-2 relative grid grid-cols-6" style={{ height: `${timeSlots.length * HOUR_HEIGHT_REM}rem`}}>
                             {/* Grid Lines */}
                            {Array.from({ length: 12 * 6 }).map((_, i) => (
                                <div key={i} className="h-16 border-t border-r border-dashed"></div>
                            ))}
                            
                            {/* Scheduled Subjects */}
                            {studentSchedule.map(subject => {
                                const dayIndex = days.indexOf(subject.day);
                                if (dayIndex === -1) return null;

                                const startPosition = timeToPosition(subject.startTime);
                                const endPosition = timeToPosition(subject.endTime);
                                const blockHeight = Math.max(endPosition - startPosition, 1.5);

                                return (
                                    <div
                                        key={subject.id}
                                        className={cn("absolute rounded-lg p-2 border text-xs overflow-hidden m-px", subject.color)}
                                        style={{
                                            top: `${startPosition}rem`,
                                            height: `${blockHeight}rem`,
                                            left: `calc(${(100 / 6) * dayIndex}% + 2px)`,
                                            width: `calc(${(100 / 6)}% - 4px)`
                                        }}
                                    >
                                        <p className="font-bold truncate">{subject.code}</p>
                                        <p className="truncate">{subject.description}</p>
                                        <p className="truncate text-muted-foreground">{subject.instructor}</p>
                                        <p className="truncate font-medium">{subject.room}</p>
                                        
                                        <div className="absolute bottom-1 right-1 left-1 text-muted-foreground flex items-center gap-1 bg-background/50 backdrop-blur-sm p-1 rounded-sm text-[10px]">
                                            <Clock className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{formatTime(subject.startTime)} - {formatTime(subject.endTime)}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
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
                }
                #student-schedule-print .no-print {
                    display: none !important;
                }
            }
        `}</style>
        </>
    );
}
