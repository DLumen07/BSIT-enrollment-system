
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSignature, CheckCircle, Printer } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useStudent } from '@/app/student/context/student-context';
import { useAdmin } from '@/app/admin/context/admin-context';

export default function EnrollmentPage() {
    const { studentData } = useStudent();
    const { adminData } = useAdmin();
    
    if (!studentData || !adminData) return <div>Loading...</div>;

    const { academicYear, semester, semesterOptions } = adminData;
    const { isEnrolled, registeredSubjects } = studentData.enrollment;
    const { studentId, course, yearLevel, dateEnrolled, status } = studentData.academic;
    const { firstName, lastName } = studentData.personal;

    const semesterLabel = semesterOptions.find(s => s.value === semester)?.label;

    const handlePrint = () => {
        window.print();
    };

    if (!isEnrolled) {
        return (
            <main className="flex-1 p-4 sm:p-6">
                <Card className="max-w-3xl mx-auto rounded-xl">
                    <CardHeader>
                        <CardTitle>Online Enrollment</CardTitle>
                        <CardDescription>
                            Complete your enrollment for the {academicYear}, {semesterLabel}.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-xl">
                            <FileSignature className="h-16 w-16 text-muted-foreground mb-4" />
                            <h2 className="text-xl font-semibold mb-2">Ready to Enroll?</h2>
                            <p className="text-muted-foreground mb-6">
                                Click the button below to start the enrollment process. Ensure your required documents are ready for submission.
                            </p>
                            <Button asChild size="lg" className="rounded-xl">
                                <Link href="/student/dashboard/enrollment/form">Enroll Now</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="flex-1 p-4 sm:p-6">
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
            <Card id="print-section" className="max-w-4xl mx-auto rounded-xl">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <CheckCircle className="h-8 w-8 text-green-500" />
                        <div>
                            <CardTitle>Enrolled</CardTitle>
                            <CardDescription>
                                You are officially enrolled for the {academicYear}, {semesterLabel}.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Student Name:</span>
                            <span className="font-medium">{firstName} {lastName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Student ID:</span>
                            <span className="font-medium">{studentId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Program:</span>
                            <span className="font-medium">{course}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Year Level:</span>
                            <span className="font-medium">{yearLevel}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="default">{status}</Badge>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Date Enrolled:</span>
                            <span className="font-medium">{dateEnrolled}</span>
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold mb-4">Registered Subjects</h3>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Units</TableHead>
                                    <TableHead>Schedule</TableHead>
                                    <TableHead>Instructor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registeredSubjects.map((subject) => (
                                    <TableRow key={subject.code}>
                                        <TableCell className="font-medium">{subject.code}</TableCell>
                                        <TableCell>{subject.description}</TableCell>
                                        <TableCell>{subject.units}</TableCell>
                                        <TableCell>{subject.schedule}</TableCell>
                                        <TableCell>{subject.instructor}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="no-print justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                        This serves as your official registration form. You can view your class schedule in the Schedule tab.
                    </p>
                    <Button onClick={handlePrint} variant="outline" className="rounded-xl">
                        <Printer className="mr-2 h-4 w-4" />
                        Download Form
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}
