
'use client';
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '../../context/admin-context';

const reportData = {
    '2024-2025': {
        '1st-sem': {
            summary: {
                totalEnrollees: 1250,
                newStudents: 320,
                oldStudents: 850,
                transferees: 80,
            },
            yearLevelData: [
                { level: "1st Year", students: 450, fill: 'var(--color-1st-year)' },
                { level: "2nd Year", students: 380, fill: 'var(--color-2nd-year)' },
                { level: "3rd Year", students: 250, fill: 'var(--color-3rd-year)' },
                { level: "4th Year", students: 170, fill: 'var(--color-4th-year)' },
            ],
            masterList: [
                { id: '24-01-0001', name: 'John Doe', course: 'BSIT', year: 1, status: 'New' },
                { id: '23-01-0002', name: 'Jane Smith', course: 'BSIT', year: 2, status: 'Old' },
                { id: '24-01-0003', name: 'Peter Jones', course: 'ACT', year: 1, status: 'Transferee' },
            ]
        }
    }
};

const yearLevelChartConfig = {
  students: { label: "Students" },
  '1st-year': { label: "1st Year", color: "hsl(var(--chart-1))" },
  '2nd-year': { label: "2nd Year", color: "hsl(var(--chart-2))" },
  '3rd-year': { label: "3rd Year", color: "hsl(var(--chart-3))" },
  '4th-year': { label: "4th Year", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;


export default function ReportsPage() {
    const { adminData } = useAdmin();
    const { academicYear: globalAcademicYear, semester: globalSemester, academicYearOptions, semesterOptions } = adminData;

    const [academicYear, setAcademicYear] = useState(globalAcademicYear);
    const [semester, setSemester] = useState(globalSemester);

    useEffect(() => {
        setAcademicYear(globalAcademicYear);
        setSemester(globalSemester);
    }, [globalAcademicYear, globalSemester]);


    const handlePrint = () => {
        window.print();
    };

    // This would be dynamic based on state in a real app
    const currentData = reportData['2024-2025']['1st-sem'];
    const semesterLabel = semesterOptions.find(s => s.value === semester)?.label || 'Unknown Semester';

    return (
        <>
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #print-section, #print-section * {
                        visibility: visible;
                    }
                    #print-section {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none;
                    }
                }
            `}</style>
            <main className="flex-1 p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between no-print">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight">Enrollment Reports</h1>
                        <p className="text-muted-foreground">
                            Generate and view enrollment statistics and master lists.
                        </p>
                    </div>
                    <Button onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Report
                    </Button>
                </div>

                <Card className="no-print">
                    <CardHeader>
                        <CardTitle>Filters</CardTitle>
                        <CardDescription>Select the academic year and semester to generate a report.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                             <label htmlFor="academic-year" className="text-sm font-medium">Academic Year</label>
                            <Select value={academicYear} onValueChange={setAcademicYear}>
                                <SelectTrigger id="academic-year">
                                    <SelectValue placeholder="Select Academic Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {academicYearOptions.map(year => (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 space-y-2">
                            <label htmlFor="semester" className="text-sm font-medium">Semester</label>
                            <Select value={semester} onValueChange={setSemester}>
                                <SelectTrigger id="semester">
                                    <SelectValue placeholder="Select Semester" />
                                </SelectTrigger>
                                <SelectContent>
                                    {semesterOptions.map(sem => (
                                        <SelectItem key={sem.value} value={sem.value}>{sem.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div id="print-section">
                    <div className="text-center mb-8 hidden print:block">
                        <h1 className="text-2xl font-bold">Enrollment Report</h1>
                        <p>Academic Year {academicYear}, {semesterLabel}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Total Enrollees</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{currentData.summary.totalEnrollees}</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>New Students</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{currentData.summary.newStudents}</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Old Students</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{currentData.summary.oldStudents}</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle>Transferees</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">{currentData.summary.transferees}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
                        <Card className="lg:col-span-2">
                             <CardHeader>
                                <CardTitle>Student Distribution by Year Level</CardTitle>
                            </CardHeader>
                            <CardContent>
                               <ChartContainer config={yearLevelChartConfig} className="min-h-[200px] w-full">
                                    <BarChart accessibilityLayer data={currentData.yearLevelData} layout="vertical">
                                        <CartesianGrid horizontal={false} />
                                        <YAxis dataKey="level" type="category" tickLine={false} axisLine={false} tickMargin={10} className="text-sm"/>
                                        <XAxis dataKey="students" type="number" hide />
                                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                        <Bar dataKey="students" radius={4}>
                                            {currentData.yearLevelData.map((entry) => (
                                                <Cell key={entry.level} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                         <Card className="lg:col-span-3">
                            <CardHeader>
                                <CardTitle>Master List</CardTitle>
                                <CardDescription>Official list of enrolled students.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student ID</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Course & Year</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {currentData.masterList.map(student => (
                                                <TableRow key={student.id}>
                                                    <TableCell>{student.id}</TableCell>
                                                    <TableCell className="font-medium">{student.name}</TableCell>
                                                    <TableCell>{student.course} - {student.year}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={student.status === 'New' || student.status === 'Transferee' ? 'secondary' : 'default'}>
                                                            {student.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </>
    );
}
