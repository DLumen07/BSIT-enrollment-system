
'use client';
import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSignature, CheckCircle, Printer, Clock, XCircle, User2, Phone, MapPin, GraduationCap, ClipboardList, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useStudent } from '@/app/student/context/student-context';
import { useAdmin } from '@/app/admin/context/admin-context';
import { isStudentProfileComplete, getMissingProfileFields } from '@/app/student/utils/profile-completeness';
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
    const missingFields = profileComplete ? [] : getMissingProfileFields(studentData);
    const profileUrl = studentData.contact.email
        ? `/student/dashboard/profile?email=${encodeURIComponent(studentData.contact.email)}`
        : '/student/dashboard/profile';
    const enrollmentFormUrl = studentData.contact.email
        ? `/student/dashboard/enrollment/form?email=${encodeURIComponent(studentData.contact.email)}`
        : '/student/dashboard/enrollment/form';

    const profileSetupSteps = [
        {
            title: 'Personal Information',
            description: 'Ensure your legal name, birthdate, and demographic details match your submitted documents.',
            Icon: User2,
            color: 'text-blue-500',
            bgColor: 'bg-blue-500/10',
        },
        {
            title: 'Contact & Address Details',
            description: 'Provide an active mobile number plus your current and permanent addresses for registrar updates.',
            Icon: MapPin,
            color: 'text-orange-500',
            bgColor: 'bg-orange-500/10',
        },
        {
            title: 'Guardian & Emergency Contacts',
            description: 'List guardians and emergency contacts so we can reach someone quickly if needed.',
            Icon: Phone,
            color: 'text-green-500',
            bgColor: 'bg-green-500/10',
        },
        {
            title: 'Academic Background',
            description: 'List your previous schools and upload any required supporting documents for evaluation.',
            Icon: GraduationCap,
            color: 'text-purple-500',
            bgColor: 'bg-purple-500/10',
        },
    ] as const;

    const semesterLabel = semesterOptions.find(s => s.value === semester)?.label;

    const apiBaseUrl = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
        .replace(/\/$/, '')
        .trim();

    const handlePrint = () => {
        const studentEmail = studentData.contact.email?.trim();
        if (!studentEmail) {
            console.warn('Missing student email for registration form printing.');
            return;
        }

        if (typeof window === 'undefined') {
            return;
        }

        const printUrl = `${apiBaseUrl}/print_registration_form.php?email=${encodeURIComponent(studentEmail)}`;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';

        const cleanup = () => {
            setTimeout(() => {
                iframe.remove();
            }, 1500);
        };

        iframe.addEventListener('load', cleanup, { once: true });
        iframe.src = printUrl;
        document.body.appendChild(iframe);
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

    const extractSnapshotSubjectCodes = (snapshot: unknown): string[] => {
        if (!snapshot || typeof snapshot !== 'object') {
            return [];
        }
        const root = snapshot as Record<string, any>;
        const candidates = [
            root.subjects,
            root.academic?.subjects,
            root.formSnapshot?.subjects,
            root.formSnapshot?.academic?.subjects,
        ];
        for (const candidate of candidates) {
            if (Array.isArray(candidate) && candidate.length > 0) {
                return candidate.filter((code): code is string => typeof code === 'string' && code.trim() !== '');
            }
        }
        return [];
    };

    const renderSnapshotSubjects = () => {
        if (!currentApplication?.formSnapshot) {
            return null;
        }

        const subjectCodes = extractSnapshotSubjectCodes(currentApplication.formSnapshot);
        if (subjectCodes.length === 0) {
            return null;
        }

        const subjectDefinitions = adminData.subjects;
        const flattenedSubjects = Object.values(subjectDefinitions).flat();
        const matchedSubjects = subjectCodes.map(code => {
            const match = flattenedSubjects.find(subject => subject.code === code);
            return match ? match : { code, description: 'Subject information unavailable', units: 0 };
        });

        const totalUnits = matchedSubjects.reduce((sum, subject) => sum + (subject.units ?? 0), 0);

        return (
            <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-blue-500" />
                        Requested Subjects
                    </h3>
                    <Badge variant="outline" className="border-white/10 bg-white/5">
                        Total Units: {totalUnits}
                    </Badge>
                </div>
                <div className="border border-white/10 rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/10 hover:bg-white/5">
                                <TableHead className="text-muted-foreground">Code</TableHead>
                                <TableHead className="text-muted-foreground">Description</TableHead>
                                <TableHead className="text-right text-muted-foreground">Units</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {matchedSubjects.map(subject => (
                                <TableRow key={subject.code} className="border-white/10 hover:bg-white/5">
                                    <TableCell className="font-medium text-foreground">{subject.code}</TableCell>
                                    <TableCell className="text-muted-foreground">{subject.description}</TableCell>
                                    <TableCell className="text-right text-foreground">{subject.units}</TableCell>
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
                borderColor: string;
                bgColor: string;
            }> = {
                pending: {
                    title: 'Enrollment Application Submitted',
                    description: 'Your enrollment application is currently under review. Please wait for an update from the registrar.',
                    icon: <Clock className="h-5 w-5 text-amber-500" />,
                    badgeVariant: 'secondary',
                    borderColor: 'border-amber-500/20',
                    bgColor: 'bg-amber-500/5',
                },
                approved: {
                    title: 'Enrollment Application Approved',
                    description: 'Your application has been approved. The registrar will finalize your enrollment shortly.',
                    icon: <CheckCircle className="h-5 w-5 text-green-500" />,
                    badgeVariant: 'default',
                    borderColor: 'border-green-500/20',
                    bgColor: 'bg-green-500/5',
                },
                rejected: {
                    title: 'Enrollment Application Rejected',
                    description: currentApplication.rejectionReason ?? 'Contact the registrar for more information about this decision.',
                    icon: <XCircle className="h-5 w-5 text-red-500" />,
                    badgeVariant: 'destructive',
                    borderColor: 'border-red-500/20',
                    bgColor: 'bg-red-500/5',
                },
            };

            const config = statusConfig[currentApplicationStatus];

            return (
                <main className="flex-1 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <Card className={`max-w-3xl mx-auto rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden`}>
                        <div className={`absolute top-0 left-0 w-full h-1 ${
                            currentApplicationStatus === 'pending' ? 'bg-amber-500' :
                            currentApplicationStatus === 'approved' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <CardHeader className="flex flex-row items-start gap-4 pb-2">
                            <div className={`p-2 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                                {config.icon}
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-xl">{config.title}</CardTitle>
                                <CardDescription className="text-base">
                                    {currentApplicationStatus === 'rejected' && currentApplication.rejectionReason
                                        ? (
                                            <span className="font-semibold text-red-400">
                                                Reason: {currentApplication.rejectionReason}
                                            </span>
                                        )
                                        : config.description}
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg border border-white/10 bg-white/5">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Status</span>
                                    <div>
                                        <Badge variant={config.badgeVariant} className="capitalize">
                                            {currentApplicationStatus}
                                        </Badge>
                                    </div>
                                </div>
                                {submittedAt && (
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Submitted</span>
                                        <div className="text-sm font-medium text-foreground">{submittedAt}</div>
                                    </div>
                                )}
                                {currentApplication.block && (
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Block</span>
                                        <div className="text-sm font-medium text-foreground">{currentApplication.block}</div>
                                    </div>
                                )}
                            </div>
                            {renderSnapshotSubjects()}
                        </CardContent>
                        <CardFooter className="bg-white/5 border-t border-white/10 p-4">
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <AlertCircle className="h-3 w-3" />
                                You will receive a notification once the registrar updates your application.
                            </p>
                        </CardFooter>
                    </Card>
                </main>
            );
        }

        return (
            <main className="flex-1 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <Card className="max-w-4xl mx-auto rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <FileSignature className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Online Enrollment</CardTitle>
                                <CardDescription>
                                    Complete your enrollment for {academicYear}, {semesterLabel}.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {profileComplete ? (
                            <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                                <div className="h-20 w-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                                    <FileSignature className="h-10 w-10 text-blue-500" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2 text-foreground">Ready to Enroll?</h2>
                                <p className="text-muted-foreground mb-8 max-w-md">
                                    Your profile is complete. You can now proceed to select your subjects and submit your enrollment application.
                                </p>
                                <Button asChild size="lg" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-8">
                                    <Link href={enrollmentFormUrl}>
                                        Start Enrollment Process <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <Alert variant="destructive" className="rounded-xl border-red-500/20 bg-red-500/5 text-red-500">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Complete Your Profile First</AlertTitle>
                                    <AlertDescription className="text-red-400/90">
                                        {missingFields.length > 0 ? (
                                            <div className="space-y-2">
                                                <p>The following fields are missing or incomplete:</p>
                                                <ul className="list-disc list-inside text-sm">
                                                    {missingFields.slice(0, 5).map((field) => (
                                                        <li key={field}>{field}</li>
                                                    ))}
                                                    {missingFields.length > 5 && (
                                                        <li>...and {missingFields.length - 5} more fields</li>
                                                    )}
                                                </ul>
                                            </div>
                                        ) : (
                                            'We need your personal, contact, and academic information before you can submit an enrollment application.'
                                        )}
                                    </AlertDescription>
                                </Alert>
                                
                                <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                                    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 rounded-lg bg-primary/10">
                                                <ClipboardList className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-semibold text-foreground">Profile Checklist</h3>
                                                <p className="text-sm text-muted-foreground">Finish each section to unlock enrollment.</p>
                                            </div>
                                        </div>
                                        <div className="grid gap-4">
                                            {profileSetupSteps.map(step => (
                                                <div key={step.title} className="flex gap-4 items-start p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                                    <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${step.bgColor} ${step.color}`}>
                                                        <step.Icon className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm text-foreground">{step.title}</p>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-6 flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                <User2 className="h-5 w-5 text-blue-500" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-foreground">Finish your profile</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                Once every required field is filled out, you can return here and submit your enrollment form right away.
                                            </p>
                                        </div>
                                        <div className="mt-6 space-y-3">
                                            <Button asChild className="w-full rounded-lg bg-primary hover:bg-primary/90">
                                                <Link href={profileUrl}>Go to Profile</Link>
                                            </Button>
                                            <p className="text-[10px] text-center text-muted-foreground">
                                                Your progress saves automatically.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="flex-1 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
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
            <Card id="print-section" className="max-w-4xl mx-auto rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />
                <CardHeader className="border-b border-white/10 bg-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                            <CheckCircle className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Officially Enrolled</CardTitle>
                            <CardDescription className="text-base mt-1">
                                You are enrolled for {academicYear}, {semesterLabel}.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl border border-white/10 bg-white/5">
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Student Name</span>
                            <div className="font-medium text-lg text-foreground">{firstName} {lastName}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Student ID</span>
                            <div className="font-medium text-lg text-foreground">{studentId}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Program</span>
                            <div className="font-medium text-foreground">{course}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Year Level</span>
                            <div className="font-medium text-foreground">{yearLevel}</div>
                        </div>
                         <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Status</span>
                            <div><Badge variant="default" className="bg-green-500 hover:bg-green-600">{status}</Badge></div>
                        </div>
                         <div className="space-y-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Date Enrolled</span>
                            <div className="font-medium text-foreground">{dateEnrolled}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-blue-500" />
                            Registered Subjects
                        </h3>
                        <div className="border border-white/10 rounded-xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white/5 border-white/10 hover:bg-white/10">
                                        <TableHead className="text-muted-foreground font-medium">Code</TableHead>
                                        <TableHead className="text-muted-foreground font-medium">Description</TableHead>
                                        <TableHead className="text-muted-foreground font-medium">Units</TableHead>
                                        <TableHead className="text-muted-foreground font-medium">Schedule</TableHead>
                                        <TableHead className="text-muted-foreground font-medium">Instructor</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {registeredSubjects.map((subject) => (
                                        <TableRow key={subject.code} className="border-white/10 hover:bg-white/5 transition-colors">
                                            <TableCell className="font-medium text-foreground">{subject.code}</TableCell>
                                            <TableCell className="text-muted-foreground">{subject.description}</TableCell>
                                            <TableCell className="text-foreground">{subject.units}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{subject.schedule}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{subject.instructor}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="no-print flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-white/10 bg-white/5 p-6">
                    <p className="text-xs text-muted-foreground">
                        This serves as your official registration form. You can view your class schedule in the Schedule tab.
                    </p>
                    <Button onClick={handlePrint} variant="outline" className="rounded-lg border-white/10 hover:bg-white/10 hover:text-foreground">
                        <Printer className="mr-2 h-4 w-4" />
                        Download Form
                    </Button>
                </CardFooter>
            </Card>
        </main>
    );
}
