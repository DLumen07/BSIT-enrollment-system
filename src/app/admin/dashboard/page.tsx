

'use client';
import Link from 'next/link';
import {
  ChevronRight,
  Search,
} from 'lucide-react';
import React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
          <Card>
            <CardHeader>
              <CardTitle>Recent Enrollments</CardTitle>
              <CardDescription>
                The latest students to enroll in the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Juan Dela Cruz</TableCell>
                    <TableCell>BS in Information Technology</TableCell>
                    <TableCell>2024-07-28</TableCell>
                    <TableCell><Badge>Enrolled</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Maria Clara</TableCell>
                    <TableCell>BS in Information Technology</TableCell>
                    <TableCell>2024-07-27</TableCell>
                    <TableCell><Badge>Enrolled</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Jose Rizal</TableCell>
                    <TableCell>BS in Information Technology</TableCell>
                    <TableCell>2024-07-26</TableCell>
                    <TableCell><Badge>Enrolled</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
    </>
  );
}
