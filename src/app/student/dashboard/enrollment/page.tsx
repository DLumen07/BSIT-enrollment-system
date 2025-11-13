
'use client';
import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSignature, CheckCircle, Printer, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useStudent } from '@/app/student/context/student-context';
import { useAdmin } from '@/app/admin/context/admin-context';
import { isStudentProfileComplete } from '@/app/student/utils/profile-completeness';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function EnrollmentPage() {
    const { studentData } = useStudent();
    const { adminData } = useAdmin();
    
    if (!studentData || !adminData) return <div>Loading...</div>;

    const { academicYear, semester, semesterOptions, pendingApplications, approvedApplications, rejectedApplications } = adminData;
    const { isEnrolled, registeredSubjects } = studentData.enrollment;
    const { studentId, course, yearLevel, dateEnrolled, status } = studentData.academic;
    const { firstName, lastName } = studentData.personal;

    const profileComplete = isStudentProfileComplete(studentData);
    const profileUrl = studentData.contact.email
        ? `/student/dashboard/profile?email=${encodeURIComponent(studentData.contact.email)}`
        : '/student/dashboard/profile';
    const enrollmentFormUrl = studentData.contact.email
        ? `/student/dashboard/enrollment/form?email=${encodeURIComponent(studentData.contact.email)}`
        : '/student/dashboard/enrollment/form';

    const semesterLabel = semesterOptions.find(s => s.value === semester)?.label;

    const handlePrint = () => {
        window.print();
    };

    const findApplicationByStudent = (applications: typeof pendingApplications) => {
        return applications.find(app => app.studentId === studentId);
    };

    const pendingApplication = findApplicationByStudent(pendingApplications);
    const approvedApplication = findApplicationByStudent(approvedApplications);
    const rejectedApplication = findApplicationByStudent(rejectedApplications);

    const currentApplication = pendingApplication ?? approvedApplication ?? rejectedApplication ?? null;
    const currentApplicationStatus: 'pending' | 'approved' | 'rejected' | null = pendingApplication
        ? 'pending'
        : approvedApplication
            ? 'approved'
            : rejectedApplication
                ? 'rejected'
                : null;

    const formatSubmittedAt = (value?: string | null) => {
        if (!value) return null;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }
        return parsed.toLocaleString();
    };

    const renderSnapshotSubjects = () => {
        if (!currentApplication?.formSnapshot) {
            return null;
        }

        const snapshot = currentApplication.formSnapshot as {
            formSnapshot?: {
                personal?: Record<string, unknown>;
                academic?: { subjects?: string[] };
            };
            academic?: { subjects?: string[] };
        };

        const subjects = snapshot?.academic?.subjects ?? snapshot?.formSnapshot?.academic?.subjects ?? null;

        if (!Array.isArray(subjects) || subjects.length === 0) {
            return null;
        }

        const subjectDefinitions = adminData.subjects;
        const flattenedSubjects = Object.values(subjectDefinitions).flat();
        const matchedSubjects = subjects.map(code => {
            const match = flattenedSubjects.find(subject => subject.code === code);
            return match ? match : { code, description: 'Subject information unavailable', units: 0 };
        });

        const totalUnits = matchedSubjects.reduce((sum, subject) => sum + (subject.units ?? 0), 0);

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Requested Subjects</h3>
                    <span className="text-sm text-muted-foreground">Total Units: <span className="font-medium">{totalUnits}</span></span>
                </div>
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Units</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {matchedSubjects.map(subject => (
                                <TableRow key={subject.code}>
                                    <TableCell className="font-medium">{subject.code}</TableCell>
                                    <TableCell>{subject.description}</TableCell>
                                    <TableCell className="text-right">{subject.units}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

    if (!isEnrolled) {
        if (currentApplication && currentApplicationStatus) {
            const submittedAt = formatSubmittedAt(currentApplication.submittedAt);

            const statusConfig: Record<typeof currentApplicationStatus, {
                title: string;
                description: string;
                icon: ReactNode;
                badgeVariant: 'secondary' | 'default' | 'destructive';
            }> = {
                pending: {
                    title: 'Enrollment Application Submitted',
                    description: 'Your enrollment application is currently under review. Please wait for an update from the registrar.',
                    icon: <Clock className="h-6 w-6 text-amber-500" />,
                    badgeVariant: 'secondary',
                },
                approved: {
                    title: 'Enrollment Application Approved',
                    description: 'Your application has been approved. The registrar will finalize your enrollment shortly.',
                    icon: <CheckCircle className="h-6 w-6 text-green-500" />,
                    badgeVariant: 'default',
                },
                rejected: {
                    title: 'Enrollment Application Rejected',
                    description: currentApplication.rejectionReason ?? 'Contact the registrar for more information about this decision.',
                    icon: <XCircle className="h-6 w-6 text-red-500" />,
                    badgeVariant: 'destructive',
                },
            };

            const config = statusConfig[currentApplicationStatus];

            return (
                <main className="flex-1 p-4 sm:p-6">
                    <Card className="max-w-3xl mx-auto rounded-xl">
                        <CardHeader className="flex flex-row items-start gap-4">
                            {config.icon}
                            <div>
                                <CardTitle>{config.title}</CardTitle>
                                <CardDescription>
                                    {currentApplicationStatus === 'rejected' && currentApplication.rejectionReason
                                        ? (
                                            <span className="font-semibold text-destructive">
                                                Reason: {currentApplication.rejectionReason}
                                            </span>
                                        )
                                        : config.description}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">Current status:</span>
                                <Badge variant={config.badgeVariant}>{currentApplicationStatus.toUpperCase()}</Badge>
                            </div>
                            {submittedAt && (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-muted-foreground">Submitted:</span>
                                    <span className="text-sm font-medium">{submittedAt}</span>
                                </div>
                            )}
                            {currentApplication.block && (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-muted-foreground">Requested block:</span>
                                    <span className="text-sm font-medium">{currentApplication.block}</span>
                                </div>
                            )}
                            {renderSnapshotSubjects()}
                        </CardContent>
                        <CardFooter className="flex-col items-start gap-3">
                            <p className="text-sm text-muted-foreground">
                                You will receive a notification once the registrar updates your application.
                            </p>
                        </CardFooter>
                    </Card>
                </main>
            );
        }

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
                        {!profileComplete && (
                            <Alert variant="destructive" className="mb-6 rounded-xl">
                                <AlertTitle>Complete Your Profile First</AlertTitle>
                                <AlertDescription>
                                    We need your personal and contact information before you can submit an enrollment application.
                                    Please review your&nbsp;
                                    <Link href={profileUrl} className="font-medium underline">
                                        student profile
                                    </Link>
                                    &nbsp;and make sure all required fields are filled out.
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-xl">
                            <FileSignature className="h-16 w-16 text-muted-foreground mb-4" />
                            <h2 className="text-xl font-semibold mb-2">Ready to Enroll?</h2>
                            <p className="text-muted-foreground mb-6">
                                Click the button below to start the enrollment process. Ensure your required documents are ready for submission.
                            </p>
                            {profileComplete ? (
                                <Button asChild size="lg" className="rounded-xl">
                                    <Link href={enrollmentFormUrl}>Enroll Now</Link>
                                </Button>
                            ) : (
                                <div className="flex flex-col items-center gap-3 w-full">
                                    <Button size="lg" className="rounded-xl w-full" disabled>
                                        Complete Profile To Continue
                                    </Button>
                                    <Button variant="ghost" asChild className="rounded-xl w-full">
                                        <Link href={profileUrl}>Go to Profile</Link>
                                    </Button>
                                </div>
                            )}
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
