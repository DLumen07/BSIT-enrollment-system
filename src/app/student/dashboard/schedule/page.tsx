
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const studentSchedule: Subject[] = [
    { id: 1, code: 'IT 201', description: 'Data Structures & Algorithms', day: 'Monday', startTime: '09:00', endTime: '10:30', instructor: 'Prof. Ada Lovelace', room: 'Lab 501', color: 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400' },
    { id: 2, code: 'IT 202', description: 'Web Development', day: 'Tuesday', startTime: '13:00', endTime: '14:30', instructor: 'Dr. Grace Hopper', room: 'Lab 502', color: 'bg-green-200/50 dark:bg-green-800/50 border-green-400' },
    { id: 3, code: 'MATH 201', description: 'Discrete Mathematics', day: 'Wednesday', startTime: '11:00', endTime: '12:30', instructor: 'Dr. Alan Turing', room: 'Room 301', color: 'bg-yellow-200/50 dark:bg-yellow-800/50 border-yellow-400' },
    { id: 4, code: 'FIL 102', description: 'Filipino sa Iba\'t Ibang Disiplina', day: 'Thursday', startTime: '14:00', endTime: '15:30', instructor: 'G. Jose Rizal', room: 'Room 305', color: 'bg-orange-200/50 dark:bg-orange-800/50 border-orange-400' },
    { id: 5, code: 'PE 104', description: 'Physical Education 4', day: 'Friday', startTime: '08:00', endTime: '10:00', instructor: 'Coach Dave', room: 'Gymnasium', color: 'bg-purple-200/50 dark:bg-purple-800/50 border-purple-400' },
];

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

    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-bold tracking-tight">My Class Schedule</h1>
                <p className="text-muted-foreground">
                    A.Y. 2024-2025, 1st Semester | Block: BSIT 2-A
                </p>
            </div>
            <Card className="rounded-xl">
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
                                const top = timeToPosition(subject.startTime);
                                const height = timeToPosition(subject.endTime) - top;
                                const dayIndex = days.indexOf(subject.day);
                                
                                if (dayIndex === -1) return null;

                                return (
                                    <div
                                        key={subject.id}
                                        className={cn("absolute rounded-lg p-2 border text-xs overflow-hidden m-px", subject.color)}
                                        style={{
                                            top: `${top}rem`,
                                            height: `${height}rem`,
                                            left: `calc(${(100 / 6) * dayIndex}% + 2px)`,
                                            width: `calc(${(100 / 6)}% - 4px)`,
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
    );
}
