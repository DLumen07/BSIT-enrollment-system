
'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertCircle, BookOpen, GraduationCap, Calendar, ShieldCheck, ScrollText } from "lucide-react";
import { useStudent } from '@/app/student/context/student-context';
import { useAdmin } from '@/app/admin/context/admin-context';
import { useRouter } from 'next/navigation';
import { isStudentProfileComplete } from '@/app/student/utils/profile-completeness';
import { useToast } from '@/hooks/use-toast';


type SelectableSubjectOption = {
    id: string;
    label: string;
    units: number;
    prerequisites: string[];
    eligible: boolean;
    ineligibilityReason: string | null;
};

const deriveCourseForYearLevel = (year?: string, fallback: string = 'ACT'): 'ACT' | 'BSIT' => {
    if (year === '1st Year' || year === '2nd Year') {
        return 'ACT';
    }
    if (year === '3rd Year' || year === '4th Year') {
        return 'BSIT';
    }
    return fallback === 'BSIT' ? 'BSIT' : 'ACT';
};

const baseAcademicSchema = z.object({
    course: z.string().min(1, 'Course is required'),
    yearLevel: z.string().min(1, 'Year level is required'),
    status: z.enum(['New', 'Old', 'Transferee']),
    block: z.string({required_error: 'Please select a block.'}).min(1, 'Please select a block.'),
    subjects: z.array(z.string()).min(1, "Please select at least one subject."),
    specialization: z.string().optional(),
});

const applySpecializationRule = <T extends z.ZodTypeAny>(schema: T) =>
    schema.superRefine((data, ctx) => {
        if ((data.yearLevel === '3rd Year' || data.yearLevel === '4th Year') && !data.specialization) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Specialization is required for 3rd and 4th year students.',
                path: ['specialization'],
            });
        }
    });

const academicSchema = applySpecializationRule(baseAcademicSchema);

type EnrollmentSchemaType = z.infer<typeof academicSchema>;

function AcademicSelectionSection() {
    const { adminData } = useAdmin();
    const { studentData } = useStudent();
    const form = useFormContext();
    const selectedYear = form.watch('yearLevel');
    const selectedCourse = form.watch('course');
    const selectedSpecialization = form.watch('specialization');
    const isUpperYear = selectedYear === '3rd Year' || selectedYear === '4th Year';
    const isFourthYear = selectedYear === '4th Year';

    const derivedCourse = useMemo(
        () => deriveCourseForYearLevel(selectedYear, selectedCourse ?? 'ACT'),
        [selectedYear, selectedCourse],
    );

    useEffect(() => {
        if (derivedCourse !== selectedCourse) {
            form.setValue('course', derivedCourse, {
                shouldDirty: Boolean(selectedCourse),
            });
        }
    }, [derivedCourse, selectedCourse, form]);
    
    const studentIdNumber = studentData?.academic.studentId ?? '';

    const completedSubjects = useMemo(() => {
        if (!studentIdNumber) {
            return [] as Array<{ code: string; units: number }>;
        }

        try {
            const completed = adminData.getCompletedSubjects(studentIdNumber);
            return Array.isArray(completed) ? completed : [];
        } catch (error) {
            console.warn('[EnrollmentForm] Failed to resolve completed subjects:', error);
            return [];
        }
    }, [adminData, studentIdNumber]);

    const yearLevelMap: Record<string, '1st-year' | '2nd-year' | '3rd-year' | '4th-year'> = {
        '1st Year': '1st-year',
        '2nd Year': '2nd-year',
        '3rd Year': '3rd-year',
        '4th Year': '4th-year',
    };

    const availableBlocks = useMemo(() => {
        if (!selectedYear) return [];
        const yearKey = yearLevelMap[selectedYear];
        if (!yearKey) return [];

        return adminData.blocks
            .filter(b => {
                const yearMatch = b.year === yearKey;
                const courseMatch = b.course === derivedCourse;
                const specMatch = !isUpperYear || b.specialization === selectedSpecialization;
                const capacityMatch = b.capacity > b.enrolled;
                return yearMatch && courseMatch && specMatch && capacityMatch;
            })
            .map(b => ({ value: b.name, label: b.name }));
    }, [selectedYear, selectedSpecialization, adminData.blocks, isUpperYear, derivedCourse]);

    const availableSubjects = useMemo<SelectableSubjectOption[]>(() => {
        if (!selectedYear) return [];
        const yearKey = yearLevelMap[selectedYear];
        if (!yearKey || !adminData.subjects[yearKey]) return [];

        const validSemesters: Array<'1st-sem' | '2nd-sem' | 'summer'> = ['1st-sem', '2nd-sem', 'summer'];
        const activeSemester = validSemesters.includes(adminData.semester as '1st-sem' | '2nd-sem' | 'summer')
            ? (adminData.semester as '1st-sem' | '2nd-sem' | 'summer')
            : '1st-sem';

        const subjectsForYear = adminData.subjects[yearKey] ?? [];
        const semesterFiltered = subjectsForYear.filter(subject => subject.semester === activeSemester);
        const source = semesterFiltered.length > 0 ? semesterFiltered : subjectsForYear;

        const completedCodes = new Set(completedSubjects.map((entry) => entry.code));
        const registeredCodes = new Set((studentData?.enrollment?.registeredSubjects ?? []).map((entry) => entry.code));

        return source.map((subject) => {
            const prerequisiteCodes = Array.isArray(subject.prerequisites) && subject.prerequisites.length > 0
                ? subject.prerequisites
                : (subject.prerequisite ? [subject.prerequisite] : []);
            const alreadyCompleted = completedCodes.has(subject.code);
            const alreadyRegistered = registeredCodes.has(subject.code);
            const prerequisiteMet = prerequisiteCodes.length === 0 || prerequisiteCodes.every((code) => completedCodes.has(code));

            let eligible = true;
            let reason: string | null = null;

            if (alreadyCompleted) {
                eligible = false;
                reason = 'You already completed this subject.';
            } else if (alreadyRegistered) {
                eligible = false;
                reason = 'You are already registered in this subject.';
            } else if (!prerequisiteMet) {
                eligible = false;
                const missing = prerequisiteCodes.filter((code) => !completedCodes.has(code));
                const label = missing.length > 1 ? 'prerequisites' : 'prerequisite';
                reason = `The ${label} ${missing.join(', ')} ${missing.length > 1 ? 'have' : 'has'} not been completed yet.`;
            }

            return {
                id: subject.code,
                label: `${subject.code} - ${subject.description}`,
                units: subject.units,
                prerequisites: prerequisiteCodes,
                eligible,
                ineligibilityReason: reason,
            } satisfies SelectableSubjectOption;
        });
    }, [selectedYear, adminData.subjects, adminData.semester, completedSubjects, studentData?.enrollment?.registeredSubjects]);

    const hasEligibleSubjects = useMemo(() => availableSubjects.some((subject) => subject.eligible), [availableSubjects]);

    const unifastLabel = useMemo(() => {
        const track = studentData?.academic.enrollmentTrack?.trim().toLowerCase();
        if (track && track.includes('unifast')) {
            return 'Covered by UniFAST (RA 10931)';
        }
        return 'Not covered by UniFAST';
    }, [studentData?.academic.enrollmentTrack]);

    useEffect(() => {
        const currentSelections = form.getValues('subjects') ?? [];
        const eligibleIds = new Set(availableSubjects.filter((subject) => subject.eligible).map((subject) => subject.id));
        const sanitized = currentSelections.filter((code: string) => eligibleIds.has(code));
        if (sanitized.length !== currentSelections.length) {
            form.setValue('subjects', sanitized, { shouldDirty: true, shouldValidate: true });
        }
    }, [availableSubjects, form]);
    
    return (
        <div className="space-y-8">
            {/* Student Profile Summary */}
            <div className="rounded-lg border bg-muted/30 p-5">
                <div className="flex items-center gap-2 mb-4 text-primary">
                    <Info className="h-5 w-5" />
                    <h3 className="font-semibold text-base">Academic Profile</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">Course</span>
                        </div>
                        <div className="font-bold text-lg pl-6">{derivedCourse}</div>
                        {/* Hidden inputs to keep form state valid */}
                        <input type="hidden" {...form.register('course')} />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <GraduationCap className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">Year Level</span>
                        </div>
                        <div className="font-bold text-lg pl-6">{selectedYear}</div>
                        <input type="hidden" {...form.register('yearLevel')} />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">Status</span>
                        </div>
                        <div className="font-bold text-lg pl-6">{form.getValues('status')}</div>
                        <input type="hidden" {...form.register('status')} />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ShieldCheck className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">UniFAST</span>
                        </div>
                        <div className="text-sm font-medium pl-6 leading-tight">{unifastLabel}</div>
                        <p className="text-[10px] text-muted-foreground pl-6 pt-1">
                            This status is managed by the registrar.
                        </p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Enrollment Configuration */}
            <div className="space-y-6">
                <div className="flex flex-col space-y-1">
                    <h3 className="text-lg font-medium">Enrollment Configuration</h3>
                    <p className="text-sm text-muted-foreground">Select your block section and specialization if applicable.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField name="block" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Block Section</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={availableBlocks.length === 0 || (isUpperYear && !selectedSpecialization)}>
                                <FormControl>
                                    <SelectTrigger className="h-11 rounded-xl">
                                        <SelectValue placeholder={availableBlocks.length === 0 ? "No available blocks" : "Select a block"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl">
                                    {availableBlocks.map(block => (
                                        <SelectItem key={block.value} value={block.value}>{block.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {availableBlocks.length === 0 && <p className="text-sm text-muted-foreground mt-2">There are no available blocks for this year level. Please try again later.</p>}
                            <FormMessage />
                        </FormItem>
                    )} />

                    {isUpperYear && (
                        <FormField name="specialization" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Specialization</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isFourthYear}>
                                    <FormControl>
                                        <SelectTrigger className="h-11 rounded-xl">
                                            <SelectValue placeholder="Select specialization" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="AP">Application Programming (AP)</SelectItem>
                                        <SelectItem value="DD">Digital Design (DD)</SelectItem>
                                    </SelectContent>
                                </Select>
                                {isFourthYear && <p className="text-sm text-muted-foreground mt-2">Your specialization is locked from your 3rd year.</p>}
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}
                </div>
            </div>

            {/* Subject Enlistment */}
            {availableSubjects.length > 0 && (
                <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-lg font-medium">Enlist Subjects</h3>
                            <p className="text-sm text-muted-foreground">
                                {hasEligibleSubjects
                                    ? 'Select the subjects you want to enroll in.'
                                    : 'You do not have any eligible subjects for enlistment this term.'}
                            </p>
                        </div>
                        <Badge variant="secondary" className="h-8 px-3 text-sm">
                            {form.watch('subjects')?.length ?? 0} Selected
                        </Badge>
                    </div>

                    <FormField
                        control={form.control}
                        name="subjects"
                        render={() => (
                            <FormItem>
                                <div className="grid grid-cols-1 gap-3">
                                    {availableSubjects.map((subject) => (
                                        <FormField
                                            key={subject.id}
                                            control={form.control}
                                            name="subjects"
                                            render={({ field }) => {
                                                const isSelected = field.value?.includes(subject.id);
                                                return (
                                                    <FormItem
                                                        key={subject.id}
                                                        className={`
                                                            relative flex flex-col sm:flex-row sm:items-center justify-between 
                                                            rounded-xl border p-4 transition-all duration-200
                                                            ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:border-primary/50'}
                                                            ${!subject.eligible ? 'opacity-60 bg-muted/50' : ''}
                                                        `}
                                                    >
                                                        <div className="flex items-start space-x-4 w-full">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    disabled={!subject.eligible}
                                                                    className="mt-1"
                                                                    onCheckedChange={(checked) => {
                                                                        if (!subject.eligible) return;
                                                                        if (checked === true) {
                                                                            field.onChange([...(field.value ?? []), subject.id]);
                                                                        } else {
                                                                            field.onChange((field.value ?? []).filter((s: string) => s !== subject.id));
                                                                        }
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <div className="space-y-1.5 flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <FormLabel className="font-semibold text-base m-0 cursor-pointer">
                                                                        {subject.label}
                                                                    </FormLabel>
                                                                    {!subject.eligible && (
                                                                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Ineligible</Badge>
                                                                    )}
                                                                </div>
                                                                
                                                                {subject.prerequisites.length > 0 && (
                                                                    <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                                                                        <span className="font-medium text-xs uppercase tracking-wide">Prerequisites:</span>
                                                                        {subject.prerequisites.join(', ')}
                                                                    </div>
                                                                )}

                                                                {!subject.eligible && subject.ineligibilityReason && (
                                                                    <div className="flex items-start gap-2 text-sm text-destructive mt-1 bg-destructive/10 p-2 rounded-md">
                                                                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                                                        <span>{subject.ineligibilityReason}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                                                            <Badge variant="outline" className="text-sm font-medium px-3 py-1 h-auto">
                                                                {subject.units} Units
                                                            </Badge>
                                                        </div>
                                                    </FormItem>
                                                );
                                            }}
                                        />
                                    ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
        </div>
    );
}

export default function EnrollmentFormPage() {
    const { studentData } = useStudent();
    const { refreshAdminData } = useAdmin();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const profileComplete = studentData ? isStudentProfileComplete(studentData) : false;

    const API_BASE_URL = useMemo(() => {
        return (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
            .replace(/\/+$/, '')
            .trim();
    }, []);

    const buildApiUrl = useCallback((endpoint: string) => {
        return `${API_BASE_URL}/${endpoint.replace(/^\/+/, '')}`;
    }, [API_BASE_URL]);

    useEffect(() => {
        if (studentData && !profileComplete) {
            const profileUrl = studentData.contact.email
                ? `/student/dashboard/profile?email=${encodeURIComponent(studentData.contact.email)}`
                : '/student/dashboard/profile';
            router.replace(profileUrl);
        }
    }, [studentData, profileComplete, router]);

    if (!studentData || !profileComplete) {
        return (
            <main className="flex-1 p-4 sm:p-6">
                <Card className="max-w-3xl mx-auto rounded-xl">
                    <CardHeader>
                        <CardTitle>Redirecting to Profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            We need to confirm your profile information before you can complete the enrollment form. You will be redirected shortly.
                        </p>
                    </CardContent>
                </Card>
            </main>
        );
    }
    
    const methods = useForm<EnrollmentSchemaType>({
        resolver: zodResolver(academicSchema),
        defaultValues: useMemo(() => {
            if (!studentData) return {};
            const yearNumber = parseInt(studentData.academic.yearLevel, 10);
            return {
                status: yearNumber > 1 ? 'Old' : 'New',
                yearLevel: studentData.academic.yearLevel,
                course: deriveCourseForYearLevel(
                    studentData.academic.yearLevel,
                    studentData.academic.course,
                ),
                specialization: studentData.academic.specialization || '',
                subjects: [],
                block: '',
            } satisfies EnrollmentSchemaType;
        }, [studentData])
    });
    
    useEffect(() => {
        if (studentData) {
            const yearNumber = parseInt(studentData.academic.yearLevel, 10);
            const normalizedCourse = deriveCourseForYearLevel(
                studentData.academic.yearLevel,
                studentData.academic.course,
            );
            methods.reset({
                status: yearNumber > 1 ? 'Old' : 'New',
                yearLevel: studentData.academic.yearLevel,
                course: normalizedCourse,
                specialization: studentData.academic.specialization || '',
                subjects: methods.getValues('subjects') ?? [],
                block: methods.getValues('block') ?? '',
            });
        }
    }, [studentData, methods]);

    const buildFormSnapshot = (values: EnrollmentSchemaType) => {
        if (!studentData) {
            return null;
        }

        return {
            personal: studentData.personal,
            contact: studentData.contact,
            address: studentData.address,
            family: studentData.family,
            additional: studentData.additional,
            education: studentData.education,
            academic: {
                course: values.course,
                yearLevel: values.yearLevel,
                status: values.status,
                block: values.block,
                specialization: values.specialization || studentData.academic.specialization || null,
                subjects: values.subjects,
            },
        };
    };

    const buildCredentialSnapshot = (values: EnrollmentSchemaType) => {
        const isOldStudent = values.status === 'Old';
        return {
            birthCertificate: !isOldStudent,
            grades: true,
            goodMoral: !isOldStudent,
            registrationForm: true,
        };
    };

    const processForm = async (data: EnrollmentSchemaType) => {
        if (!studentData || isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            const formSnapshot = buildFormSnapshot(data);
            const specializationValue = (() => {
                const trimmed = data.specialization?.trim();
                if (trimmed) {
                    return trimmed;
                }
                const fallback = studentData.academic.specialization?.trim();
                return fallback && fallback.length > 0 ? fallback : null;
            })();

            const payload = {
                studentIdNumber: studentData.academic.studentId,
                studentEmail: studentData.contact.email,
                studentName: `${studentData.personal.firstName} ${studentData.personal.lastName}`.trim(),
                blockName: data.block,
                course: data.course,
                yearLevel: data.yearLevel,
                studentStatus: data.status,
                specialization: specializationValue,
                subjects: data.subjects,
                credentials: buildCredentialSnapshot(data),
                formSnapshot,
            };

            const response = await fetch(buildApiUrl('submit_enrollment.php'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            let responseBody: any = null;
            try {
                responseBody = await response.json();
            } catch (parseError) {
                responseBody = null;
            }

            if (!response.ok) {
                const message = responseBody?.message ?? `Failed to submit enrollment (status ${response.status}).`;
                throw new Error(message);
            }

            if (!responseBody || responseBody.status !== 'success') {
                throw new Error(responseBody?.message ?? 'Server returned an unexpected response while processing the enrollment submission.');
            }

            try {
                await refreshAdminData();
            } catch (refreshError) {
                console.warn('Failed to refresh admin data after enrollment submission:', refreshError);
            }

            toast({
                title: 'Enrollment submitted',
                description: 'Your application has been sent to the registrar for review.',
            });
            const enrollmentOverviewUrl = studentData.contact.email
                ? `/student/dashboard/enrollment?email=${encodeURIComponent(studentData.contact.email)}`
                : '/student/dashboard/enrollment';
            router.replace(enrollmentOverviewUrl);
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'An unexpected error occurred while submitting your enrollment application.';
            toast({
                variant: 'destructive',
                title: 'Submission failed',
                description: message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (!studentData) {
        return <div>Loading form...</div>;
    }

    return (
        <main className="flex-1 p-4 sm:p-6">
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(processForm)}>
                    <Card className="max-w-4xl mx-auto rounded-xl shadow-lg border-muted/40">
                        <CardHeader className="border-b bg-muted/10 pb-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-xl mt-1">
                                    <ScrollText className="h-8 w-8 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-2xl">Enrollment Form</CardTitle>
                                    <CardDescription className="text-base">
                                        Choose your block and enlist subjects for this term. Your profile information stays locked for registrar review.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <AcademicSelectionSection />
                        </CardContent>
                        <CardFooter className="border-t bg-muted/10 py-6">
                           <div className="flex justify-end w-full">
                                <Button type="submit" size="lg" className="rounded-xl min-w-[200px] font-semibold" disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Enrollment'}
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </form>
            </FormProvider>
        </main>
    );
}

    