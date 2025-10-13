
'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, addYears } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
    const [academicYear, setAcademicYear] = useState('2024-2025');
    const [semester, setSemester] = useState('1st-sem');
    const [enrollmentStart, setEnrollmentStart] = useState<Date | undefined>(new Date());
    const [enrollmentEnd, setEnrollmentEnd] = useState<Date | undefined>(new Date(new Date().setMonth(new Date().getMonth() + 1)));

    const academicYears = Array.from({ length: 5 }, (_, i) => {
        const startYear = new Date().getFullYear() - 2 + i;
        return `${startYear}-${startYear + 1}`;
    });
    
    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage application-wide settings and configurations.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                 <Card>
                    <CardHeader>
                        <CardTitle>Academic Calendar</CardTitle>
                        <CardDescription>
                            Set the current academic year and semester for the entire system.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="academic-year">Academic Year</Label>
                            <Select value={academicYear} onValueChange={setAcademicYear}>
                                <SelectTrigger id="academic-year">
                                    <SelectValue placeholder="Select Academic Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {academicYears.map(year => (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="semester">Semester</Label>
                            <Select value={semester} onValueChange={setSemester}>
                                <SelectTrigger id="semester">
                                    <SelectValue placeholder="Select Semester" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1st-sem">1st Semester</SelectItem>
                                    <SelectItem value="2nd-sem">2nd Semester</SelectItem>
                                    <SelectItem value="summer">Summer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button>Save Changes</Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Enrollment Schedule</CardTitle>
                        <CardDescription>
                            Define the start and end dates for the enrollment period.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Enrollment Start Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn("w-full justify-start text-left font-normal", !enrollmentStart && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {enrollmentStart ? format(enrollmentStart, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={enrollmentStart}
                                        onSelect={setEnrollmentStart}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                         <div className="space-y-2">
                            <Label>Enrollment End Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn("w-full justify-start text-left font-normal", !enrollmentEnd && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {enrollmentEnd ? format(enrollmentEnd, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={enrollmentEnd}
                                        onSelect={setEnrollmentEnd}
                                        disabled={{ before: enrollmentStart || new Date() }}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button>Save Schedule</Button>
                    </CardFooter>
                </Card>
            </div>
        </main>
    );
}
