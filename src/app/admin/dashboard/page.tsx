
'use client';
import Link from 'next/link';
import {
  ChevronRight,
  Search,
  ArrowUpRight,
} from 'lucide-react';
import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell, Legend } from "recharts"
import Image from 'next/image';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const yearLevelData = [
  { level: "1st Year", students: 450 },
  { level: "2nd Year", students: 380 },
  { level: "3rd Year", students: 250 },
  { level: "4th Year", students: 170 },
]

const yearLevelChartConfig = {
  students: {
    label: "Students",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig

const studentStatusData = [
    { name: 'New', value: 320, fill: 'hsl(var(--chart-1))' },
    { name: 'Old', value: 850, fill: 'hsl(var(--chart-2))' },
    { name: 'Transferee', value: 80, fill: 'hsl(var(--chart-3))' },
];

const studentStatusConfig = {
    new: { label: 'New', color: 'hsl(var(--chart-1))' },
    old: { label: 'Old', color: 'hsl(var(--chart-2))' },
    transferee: { label: 'Transferee', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig

const instructorWorkload = [
    { 
        id: 1, 
        name: 'Dr. Alan Turing', 
        email: 'alan.turing@university.edu', 
        subjects: ['IT 101', 'IT 201'], 
        avatar: 'https://picsum.photos/seed/at-avatar/40/40' 
    },
    { 
        id: 2, 
        name: 'Prof. Ada Lovelace', 
        email: 'ada.lovelace@university.edu', 
        subjects: ['MATH 101'], 
        avatar: 'https://picsum.photos/seed/al-avatar/40/40' 
    },
    { 
        id: 3, 
        name: 'Dr. Grace Hopper', 
        email: 'grace.hopper@university.edu', 
        subjects: ['IT 301', 'IT 401'], 
        avatar: 'https://picsum.photos/seed/gh-avatar/40/40' 
    },
    { 
        id: 4, 
        name: 'Mr. Charles Babbage', 
        email: 'charles.babbage@university.edu', 
        subjects: ['ENG 101'], 
        avatar: 'https://picsum.photos/seed/cb-avatar/40/40' 
    },
];


export default function AdminDashboardPage() {
  return (
    <>
        <main className="flex-1 p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Students</CardTitle>
                <CardDescription>All active students</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">1,250</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>New Enrollees</CardTitle>
                <CardDescription>This academic year</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">320</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Pending Applications</CardTitle>
                <CardDescription>Awaiting review</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">45</p>
              </CardContent>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle>Total Courses</CardTitle>
                <CardDescription>Offered by the department</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">28</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="flex flex-col lg:col-span-2">
                <CardHeader>
                    <CardTitle>Student Population by Year Level</CardTitle>
                    <CardDescription>Distribution of students across all year levels.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    <ChartContainer config={yearLevelChartConfig} className="min-h-[200px] w-full">
                    <BarChart accessibilityLayer data={yearLevelData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                        dataKey="level"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="students" fill="var(--color-students)" radius={4} />
                    </BarChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="leading-none text-muted-foreground">
                    Showing student counts for the current academic year.
                </div>
                </CardFooter>
            </Card>
             <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Student Demographics</CardTitle>
                <CardDescription>Breakdown by student status.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center">
                <ChartContainer config={studentStatusConfig} className="min-h-[200px] w-full max-w-[250px]">
                  <PieChart accessibilityLayer>
                    <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                    <Pie data={studentStatusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} strokeWidth={2}>
                       {studentStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                     <Legend
                      content={({ payload }) => {
                        return (
                          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            {payload?.map((entry, index) => (
                              <li key={`item-${index}`} className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span>{entry.value}</span>
                              </li>
                            ))}
                          </ul>
                        )
                      }}
                      verticalAlign="bottom"
                      align="left"
                      wrapperStyle={{
                        paddingTop: '1rem',
                        boxSizing: 'content-box',
                      }}
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>Instructor Workload</CardTitle>
                        <CardDescription>
                            Overview of subjects handled by instructors.
                        </CardDescription>
                    </div>
                    <Button asChild size="sm" className="ml-auto gap-1">
                        <Link href="/admin/dashboard/instructors">
                        Manage Instructors
                        <ArrowUpRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Instructor</TableHead>
                                <TableHead className="text-right">Subjects Handled</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {instructorWorkload.map((instructor) => (
                                <TableRow key={instructor.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            <Avatar className="hidden h-9 w-9 sm:flex">
                                                <AvatarImage src={instructor.avatar} alt="Avatar" data-ai-hint="person avatar" />
                                                <AvatarFallback>{instructor.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="grid gap-1">
                                                <p className="text-sm font-medium leading-none">
                                                    {instructor.name}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {instructor.email}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                       <div className="flex flex-wrap gap-1 justify-end">
                                            {instructor.subjects.map(subject => (
                                                <Badge key={subject} variant="secondary">{subject}</Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </div>
        </main>
    </>
  );
}
