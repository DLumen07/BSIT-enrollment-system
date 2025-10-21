
'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import { useAdmin } from '@/app/admin/context/admin-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const InfoField = ({ label, value }: { label: string; value?: string | number | null }) => (
    value ? (
        <div className="grid grid-cols-3 gap-4">
            <span className="text-sm text-muted-foreground col-span-1">{label}</span>
            <span className="font-medium text-sm col-span-2">{value}</span>
        </div>
    ) : null
);

export default function StudentProfilePage() {
    const params = useParams();
    const studentId = params.studentId as string;
    const { adminData } = useAdmin();

    if (!adminData) return <div>Loading...</div>;

    const student = adminData.students.find(s => s.id.toString() === studentId);
    const studentGrades = student ? adminData.grades[student.studentId] || [] : [];
    
    const allSubjects = Object.values(adminData.subjects).flat();

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'Enrolled': return 'default';
            case 'Not Enrolled': return 'destructive';
            case 'Graduated': return 'secondary';
            default: return 'outline';
        }
    };

    if (!student) {
        return (
            <main className="flex-1 p-4 sm:p-6">
                <h1 className="text-2xl font-bold tracking-tight">Student Not Found</h1>
                <p className="text-muted-foreground">The requested student could not be found.</p>
            </main>
        );
    }

    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="rounded-xl">
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <Avatar className="h-24 w-24 mb-4">
                                <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person avatar" />
                                <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-xl font-semibold">{student.name}</h2>
                            <p className="text-sm text-muted-foreground">{student.studentId}</p>
                             <Badge variant={getStatusBadgeVariant(student.status)} className="mt-2">{student.status}</Badge>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <InfoField label="Email" value={student.email} />
                            <InfoField label="Phone" value={student.phoneNumber} />
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                     <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>Academic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <InfoField label="Course" value={student.course} />
                            <InfoField label="Year Level" value={`${student.year}${student.year === 1 ? 'st' : student.year === 2 ? 'nd' : student.year === 3 ? 'rd' : 'th'} Year`} />
                            <InfoField label="Block Section" value={student.block || 'N/A'} />
                            {student.specialization && <InfoField label="Specialization" value={student.specialization} />}
                        </CardContent>
                    </Card>
                    
                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>Grade History</CardTitle>
                            <CardDescription>Academic performance of the student.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg max-h-96 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Subject</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-right">Grade</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {studentGrades.length > 0 ? (
                                            studentGrades.map(grade => {
                                                const subjectDetails = allSubjects.find(s => s.code === grade.subjectCode);
                                                return (
                                                <TableRow key={grade.subjectCode}>
                                                    <TableCell className="font-medium">{grade.subjectCode}</TableCell>
                                                     <TableCell>{subjectDetails?.description || 'N/A'}</TableCell>
                                                    <TableCell className="text-right font-semibold">{grade.grade.toFixed(2)}</TableCell>
                                                </TableRow>
                                            )})
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center h-24">No grade history available.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
