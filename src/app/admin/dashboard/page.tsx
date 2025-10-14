
'use client';
import Link from 'next/link';
import {
  ChevronRight,
  Search,
  ArrowUpRight,
  AlertTriangle,
  UserX,
} from 'lucide-react';
import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from "recharts"
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

const schedulingIssues = [
    { id: 1, block: 'BSIT 3-C', subject: 'MATH 301', type: 'No Instructor', details: 'Subject has no assigned instructor.', priority: 'high' },
    { id: 2, block: 'BSIT 1-A', subject: 'IT-101', type: 'Conflict', details: 'Dr. Alan Turing has a time conflict with a class in BSIT 1-B.', priority: 'high' },
    { id: 3, block: 'BSIT 4-A', subject: 'PE 104', type: 'No Instructor', details: 'Subject has no assigned instructor.', priority: 'low' },
    { id: 4, block: 'BSIT 2-B', subject: 'IT 201', type: 'Conflict', details: 'Prof. Ada Lovelace has a time conflict with a class in BSIT 2-A.', priority: 'high' },
];


export default function AdminDashboardPage() {
  return (
    <>
        <main className="flex-1 p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Total Students</CardTitle>
                <CardDescription>All active students</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">1,250</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>New Enrollees</CardTitle>
                <CardDescription>This academic year</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">320</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle>Pending Applications</CardTitle>
                <CardDescription>Awaiting review</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">45</p>
              </CardContent>
            </Card>
             <Card className="rounded-xl">
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
            <Card className="flex flex-col lg:col-span-2 rounded-xl">
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
             <Card className="flex flex-col rounded-xl">
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
             <Card className="lg:col-span-3 rounded-xl">
                <CardHeader>
                    <CardTitle>Scheduling Health</CardTitle>
                    <CardDescription>
                        A summary of current scheduling issues that need attention.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Block</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Issue Type</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {schedulingIssues.map((issue) => (
                                <TableRow key={issue.id} className={issue.priority === 'high' ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                                    <TableCell className="font-medium">{issue.block}</TableCell>
                                    <TableCell>{issue.subject}</TableCell>
                                    <TableCell>
                                        <Badge variant={issue.type === 'Conflict' ? 'destructive' : 'secondary'}>
                                            {issue.type === 'Conflict' ? <AlertTriangle className="mr-1 h-3 w-3" /> : <UserX className="mr-1 h-3 w-3" />}
                                            {issue.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{issue.details}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm" className="rounded-full">
                                            <Link href={`/admin/dashboard/schedule/${encodeURIComponent(issue.block)}`}>
                                                View Schedule
                                            </Link>
                                        </Button>
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
