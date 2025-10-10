
'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Trash2, Pencil, Clock } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Subject = {
    id: number;
    code: string;
    description: string;
    day: string;
    startTime: string;
    endTime: string;
    instructor: string;
    color: string;
};

const initialSubjects: Subject[] = [
    { id: 1, code: 'IT-101', description: 'Intro to Computing', day: 'Monday', startTime: '09:00', endTime: '10:30', instructor: 'Mr. Smith', color: 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400' },
    { id: 2, code: 'MATH-101', description: 'Calculus I', day: 'Tuesday', startTime: '13:00', endTime: '14:30', instructor: 'Ms. Jones', color: 'bg-green-200/50 dark:bg-green-800/50 border-green-400' },
    { id: 3, code: 'ENG-101', description: 'English Composition', day: 'Wednesday', startTime: '11:00', endTime: '12:30', instructor: 'Dr. Brown', color: 'bg-yellow-200/50 dark:bg-yellow-800/50 border-yellow-400' },
    { id: 4, code: 'PE-101', description: 'Physical Education', day: 'Friday', startTime: '08:00', endTime: '10:00', instructor: 'Coach Dave', color: 'bg-orange-200/50 dark:bg-orange-800/50 border-orange-400' },
    { id: 5, code: 'IT-102', description: 'Programming 1', day: 'Monday', startTime: '14:00', endTime: '16:00', instructor: 'Mr. Smith', color: 'bg-purple-200/50 dark:bg-purple-800/50 border-purple-400' },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = Array.from({ length: 11 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`); // 7 AM to 5 PM

const timeToPosition = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    return (hour - 7) * 60 + minute;
};

const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

export default function SchedulePage() {
    const params = useParams();
    const blockId = decodeURIComponent(params.blockId as string);

    const [subjects] = React.useState<Subject[]>(initialSubjects);

    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Class Schedule for {blockId}</h1>
                    <p className="text-muted-foreground">
                        Manage the subjects, schedule, and instructors for this block.
                    </p>
                </div>
                 <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Subject
                </Button>
            </div>
            <Card>
                <CardContent className="p-4 overflow-x-auto">
                    <div className="relative grid grid-cols-[auto_repeat(6,minmax(120px,1fr))] gap-x-1" style={{ minWidth: '800px' }}>
                        {/* Time column */}
                        <div className="row-start-2 col-start-1 sticky left-0 bg-background pr-2 z-10">
                            {timeSlots.map(time => (
                                <div key={time} className="h-[60px] flex justify-end items-start text-xs text-muted-foreground">
                                    <span className="-translate-y-1/2">{formatTime(time)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Day headers */}
                        {days.map((day, i) => (
                            <div key={day} className="row-start-1 text-center font-semibold text-muted-foreground text-sm p-2 sticky top-0 bg-background z-10" style={{ gridColumnStart: i + 2 }}>{day}</div>
                        ))}

                        {/* Grid lines */}
                        <div className="col-start-2 col-span-6 row-start-2 grid grid-cols-6 grid-rows-[repeat(11,60px)] border-l">
                            {Array.from({ length: 66 }).map((_, i) => (
                                <div key={i} className="border-r border-t border-dashed" />
                            ))}
                        </div>

                        {/* Scheduled subjects */}
                        <div className="col-start-2 col-span-6 row-start-2 grid grid-cols-6 grid-rows-[repeat(660,minmax(0,1fr))] gap-1">
                           {subjects.map(subject => {
                                const top = timeToPosition(subject.startTime);
                                const height = timeToPosition(subject.endTime) - top;
                                const dayIndex = days.indexOf(subject.day);

                                if (dayIndex === -1) return null;
                                
                                return (
                                    <div
                                        key={subject.id}
                                        className={cn("relative rounded-lg p-2 border text-xs overflow-hidden", subject.color)}
                                        style={{
                                            gridColumnStart: dayIndex + 1,
                                            gridRowStart: top + 1,
                                            gridRowEnd: top + height + 1,
                                        }}
                                    >
                                        <p className="font-bold truncate">{subject.code}</p>
                                        <p className="truncate">{subject.description}</p>
                                        <p className="truncate text-muted-foreground">{subject.instructor}</p>
                                        
                                        <div className="absolute bottom-1 right-1 left-1 text-muted-foreground flex items-center gap-1 bg-background/50 backdrop-blur-sm p-1 rounded-sm text-[10px]">
                                            <Clock className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{formatTime(subject.startTime)} - {formatTime(subject.endTime)}</span>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="absolute top-0 right-0 h-6 w-6 p-1 text-muted-foreground hover:bg-transparent hover:text-accent focus-visible:ring-0 focus-visible:ring-offset-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>
                                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
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
