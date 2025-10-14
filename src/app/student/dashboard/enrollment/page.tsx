
'use client';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSignature, CheckCircle, Printer } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const registeredSubjects = [
    { code: 'IT 201', description: 'Data Structures & Algorithms', units: 3, schedule: 'M 09:00-10:30', instructor: 'Prof. Ada Lovelace' },
    { code: 'IT 202', description: 'Web Development', units: 3, schedule: 'T 13:00-14:30', instructor: 'Dr. Grace Hopper' },
    { code: 'MATH 201', description: 'Discrete Mathematics', units: 3, schedule: 'W 11:00-12:30', instructor: 'Dr. Alan Turing' },
    { code: 'FIL 102', description: 'Filipino sa Iba\'t Ibang Disiplina', units: 3, schedule: 'Th 14:00-15:30', instructor: 'G. Jose Rizal' },
    { code: 'PE 104', description: 'Physical Education 4', units: 2, schedule: 'F 08:00-10:00', instructor: 'Coach Dave' },
];

export default function EnrollmentPage() {
    const [isEnrolled, setIsEnrolled] = useState(true);

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
                            Complete your enrollment for the Academic Year 2024-2025, 1st Semester.
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
                            <CardTitle>Successfully Enrolled</CardTitle>
                            <CardDescription>
                                You are officially enrolled for the Academic Year 2024-2025, 1st Semester.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Student Name:</span>
                            <span className="font-medium">Student Name</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Student ID:</span>
                            <span className="font-medium">2022-0001</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Program:</span>
                            <span className="font-medium">BS in Information Technology</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Year Level:</span>
                            <span className="font-medium">2nd Year</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="default">Enrolled</Badge>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Date Enrolled:</span>
                            <span className="font-medium">August 15, 2024</span>
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
