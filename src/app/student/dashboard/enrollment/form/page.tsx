
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
        <div className="space-y-6">
            <h3 className="text-lg font-medium">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="course" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Course</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled>
                            <FormControl>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Course is auto-assigned" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="BSIT">BSIT</SelectItem>
                                <SelectItem value="ACT">ACT</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="New">New</SelectItem><SelectItem value="Old">Old</SelectItem><SelectItem value="Transferee">Transferee</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <FormLabel htmlFor="unifast-status">UniFAST</FormLabel>
                    <Input
                        id="unifast-status"
                        value={unifastLabel}
                        disabled
                        readOnly
                        className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        This status is managed by the registrar under RA 10931.
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="yearLevel" render={({ field }) => (
                    <FormItem><FormLabel>Year Level</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        const isUpper = value === '3rd Year' || value === '4th Year';
                        if (!isUpper) {
                            form.setValue('specialization', undefined);
                        }
                         if (value === '4th Year' && studentData?.academic.specialization) {
                            form.setValue('specialization', studentData.academic.specialization);
                        }
                    }} defaultValue={field.value} disabled>
                    <FormControl>
                        <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select year level" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="1st Year">1st Year</SelectItem>
                        <SelectItem value="2nd Year">2nd Year</SelectItem>
                        <SelectItem value="3rd Year">3rd Year</SelectItem>
                        <SelectItem value="4th Year">4th Year</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
                 {isUpperYear && (
                    <FormField name="specialization" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Specialization</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isFourthYear}>
                                <FormControl>
                                    <SelectTrigger className="rounded-xl">
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
            <FormField name="block" render={({ field }) => (
                <FormItem>
                    <FormLabel>Block</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={availableBlocks.length === 0 || (isUpperYear && !selectedSpecialization)}>
                        <FormControl>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder={availableBlocks.length === 0 ? "No available blocks" : "Select block"} />
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
            
            {availableSubjects.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                     <h3 className="text-lg font-medium">Enlist Subjects</h3>
                     <p className="text-sm text-muted-foreground">
                        {hasEligibleSubjects
                            ? 'Select the subjects you want to enroll in. Ineligible subjects are shown for reference.'
                            : 'You do not have any eligible subjects for enlistment this term.'}
                    </p>
                     <FormField
                        control={form.control}
                        name="subjects"
                        render={() => (
                            <FormItem>
                            <div className="space-y-2">
                                {availableSubjects.map((subject) => (
                                <FormField
                                    key={subject.id}
                                    control={form.control}
                                    name="subjects"
                                    render={({ field }) => {
                                    return (
                                        <FormItem
                                        key={subject.id}
                                        className="flex flex-row items-center justify-between rounded-xl border p-3"
                                        >
                                        <div className="flex items-center space-x-3">
                                            <FormControl>
                                                <Checkbox
                                                checked={field.value?.includes(subject.id)}
                                                disabled={!subject.eligible}
                                                onCheckedChange={(checked) => {
                                                    if (!subject.eligible) {
                                                        return;
                                                    }
                                                    if (checked === true) {
                                                        field.onChange([...(field.value ?? []), subject.id]);
                                                        return;
                                                    }
                                                    const filtered = (field.value ?? []).filter((selection: string) => selection !== subject.id);
                                                    field.onChange(filtered);
                                                }}
                                                />
                                            </FormControl>
                                            <div className="space-y-1">
                                                <FormLabel className="font-normal m-0">
                                                    {subject.label}
                                                </FormLabel>
                                                {subject.prerequisites.length > 0 && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Prerequisite{subject.prerequisites.length > 1 ? 's' : ''}: {subject.prerequisites.join(', ')}
                                                    </p>
                                                )}
                                                {!subject.eligible && subject.ineligibilityReason && (
                                                    <p className="text-xs text-destructive">{subject.ineligibilityReason}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground">{subject.units} units</div>
                                        </FormItem>
                                    )
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
                    <Card className="max-w-4xl mx-auto rounded-xl">
                        <CardHeader>
                            <CardTitle>Enrollment Form</CardTitle>
                             <CardDescription>
                                Choose your block and enlist subjects for this term. Your profile information stays locked for registrar review.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AcademicSelectionSection />
                        </CardContent>
                        <CardFooter>
                           <div className="flex justify-end w-full">
                                <Button type="submit" className="rounded-xl min-w-[200px]" disabled={isSubmitting}>
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

    