
'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useStudent } from '@/app/student/context/student-context';
import { useAdmin } from '@/app/admin/context/admin-context';
import { useRouter } from 'next/navigation';
import { isStudentProfileComplete } from '@/app/student/utils/profile-completeness';
import { useToast } from '@/hooks/use-toast';


const steps = [
    { id: 'Step 1', name: 'Personal & Family Information' },
    { id: 'Step 2', name: 'Additional & Educational Background' },
    { id: 'Step 3', name: 'Academic Information' },
];

const safeParseDate = (value?: string | null): Date | undefined => {
    if (!value) {
        return undefined;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
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

const personalFamilySchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    middleName: z.string().optional(),
    email: z.string().email('Invalid email address'),
    phoneNumber: z.string().min(10, 'Invalid phone number'),
    birthdate: z.date({ required_error: "A date of birth is required." }),
    currentAddress: z.string().min(1, 'Current address is required'),
    permanentAddress: z.string().min(1, 'Permanent address is required'),
    nationality: z.string().min(1, 'Nationality is required'),
    religion: z.string().min(1, 'Religion is required'),
    dialect: z.string().min(1, 'Dialect is required'),
    sex: z.enum(['Male', 'Female']),
    civilStatus: z.enum(['Single', 'Married', 'Widowed', 'Separated']),
    fathersName: z.string().min(1, "Father's name is required"),
    fathersOccupation: z.string().min(1, "Father's occupation is required"),
    mothersName: z.string().min(1, "Mother's name is required"),
    mothersOccupation: z.string().min(1, "Mother's occupation is required"),
    guardiansName: z.string().optional(),
});

const additionalInfoSchema = z.object({
    emergencyContactName: z.string().min(1, 'Emergency contact name is required'),
    emergencyContactAddress: z.string().min(1, 'Emergency contact address is required'),
    emergencyContactNumber: z.string().min(10, 'Invalid emergency contact number'),
    elementarySchool: z.string().min(1, 'Elementary school is required'),
    elemYearGraduated: z.string().min(4, 'Invalid year'),
    secondarySchool: z.string().min(1, 'Secondary school is required'),
    secondaryYearGraduated: z.string().min(4, 'Invalid year'),
    collegiateSchool: z.string().optional(),
});

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

// Full schema for new students
const newStudentSchema = applySpecializationRule(
    personalFamilySchema.merge(additionalInfoSchema).merge(baseAcademicSchema)
);

// Schema for old students (only step 3 is relevant)
const oldStudentSchema = academicSchema;

type EnrollmentSchemaType = z.infer<typeof newStudentSchema>;

function Step1() {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField name="firstName" render={({ field }) => (
                    <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="lastName" render={({ field }) => (
                    <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="middleName" render={({ field }) => (
                    <FormItem><FormLabel>Middle Name</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} type="tel" className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <FormField name="birthdate" render={({ field }) => {
                const selectedDate = field.value instanceof Date ? field.value : safeParseDate(field.value as unknown as string);
                return (
                    <FormItem className="flex flex-col">
                        <FormLabel>Birthdate</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal rounded-xl", !selectedDate && "text-muted-foreground")}>
                                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={field.onChange}
                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                );
            }} />
            <FormField name="currentAddress" render={({ field }) => (
                <FormItem><FormLabel>Current Address</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="permanentAddress" render={({ field }) => (
                <FormItem><FormLabel>Permanent Address</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField name="nationality" render={({ field }) => (
                    <FormItem><FormLabel>Nationality</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="religion" render={({ field }) => (
                    <FormItem><FormLabel>Religion</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="dialect" render={({ field }) => (
                    <FormItem><FormLabel>Dialect</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="sex" render={({ field }) => (
                    <FormItem><FormLabel>Sex</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select sex" /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField name="civilStatus" render={({ field }) => (
                    <FormItem><FormLabel>Civil Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select civil status" /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="Single">Single</SelectItem><SelectItem value="Married">Married</SelectItem><SelectItem value="Widowed">Widowed</SelectItem><SelectItem value="Separated">Separated</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
            </div>
            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium">Family Information</h3>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="fathersName" render={({ field }) => (
                    <FormItem><FormLabel>Father's Name</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="fathersOccupation" render={({ field }) => (
                    <FormItem><FormLabel>Father's Occupation</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="mothersName" render={({ field }) => (
                    <FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="mothersOccupation" render={({ field }) => (
                    <FormItem><FormLabel>Mother's Occupation</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="guardiansName" render={({ field }) => (
                    <FormItem><FormLabel>Guardian's Name (Optional)</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
        </div>
    );
}

function Step2() {
    return (
        <div className="space-y-6">
            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium">Emergency Contact</h3>
            </div>
            <FormField name="emergencyContactName" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="emergencyContactAddress" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="emergencyContactNumber" render={({ field }) => (
                <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input {...field} type="tel" className="rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium">Educational Background</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField name="elementarySchool" render={({ field }) => (
                    <FormItem><FormLabel>Elementary School</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField name="elemYearGraduated" render={({ field }) => (
                    <FormItem><FormLabel>Year Graduated</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField name="secondarySchool" render={({ field }) => (
                    <FormItem><FormLabel>Secondary School</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField name="secondaryYearGraduated" render={({ field }) => (
                    <FormItem><FormLabel>Year Graduated</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField name="collegiateSchool" render={({ field }) => (
                    <FormItem><FormLabel>Collegiate School (If transferee)</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
        </div>
    );
}

function Step3() {
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

    const availableSubjects = useMemo(() => {
        if (!selectedYear) return [];
        const yearKey = yearLevelMap[selectedYear];
        if (!yearKey || !adminData.subjects[yearKey]) return [];
        return Object.values(adminData.subjects[yearKey]).map(s => ({
            id: s.code,
            label: `${s.code} - ${s.description}`,
            units: s.units,
        }));
    }, [selectedYear, adminData.subjects]);
    
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
                     <p className="text-sm text-muted-foreground">Select the subjects you want to enroll in.</p>
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
                                                onCheckedChange={(checked) => {
                                                    if (checked === true) {
                                                        field.onChange([...(field.value ?? []), subject.id]);
                                                        return;
                                                    }
                                                    const filtered = (field.value ?? []).filter((selection: string) => selection !== subject.id);
                                                    field.onChange(filtered);
                                                }}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-normal m-0!">
                                                {subject.label}
                                            </FormLabel>
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
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
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
    
    const isNewStudent = useMemo(() => {
        const yearNumber = parseInt(studentData.academic.yearLevel, 10);
        return yearNumber === 1 && studentData.academic.status !== 'Old';
    }, [studentData]);

    useEffect(() => {
        if (studentData && !isNewStudent) {
            setCurrentStep(2);
        } else {
            setCurrentStep(0);
        }
    }, [isNewStudent, studentData]);

    const currentSchema = isNewStudent ? newStudentSchema : oldStudentSchema;

    const methods = useForm<EnrollmentSchemaType>({
        resolver: zodResolver(currentSchema),
        defaultValues: useMemo(() => {
            if (!studentData) return {};
            const yearNumber = parseInt(studentData.academic.yearLevel, 10);
            return {
                firstName: studentData.personal.firstName,
                lastName: studentData.personal.lastName,
                middleName: studentData.personal.middleName,
                email: studentData.contact.email,
                phoneNumber: studentData.contact.phoneNumber,
                birthdate: safeParseDate(studentData.personal.birthdate),
                currentAddress: studentData.address.currentAddress,
                permanentAddress: studentData.address.permanentAddress,
                nationality: studentData.personal.nationality,
                religion: studentData.personal.religion,
                dialect: studentData.personal.dialect,
                sex: studentData.personal.sex,
                civilStatus: studentData.personal.civilStatus || 'Single',
                fathersName: studentData.family.fathersName,
                fathersOccupation: studentData.family.fathersOccupation,
                mothersName: studentData.family.mothersName,
                mothersOccupation: studentData.family.mothersOccupation,
                guardiansName: studentData.family.guardiansName,
                emergencyContactName: studentData.additional.emergencyContactName,
                emergencyContactAddress: studentData.additional.emergencyContactAddress,
                emergencyContactNumber: studentData.additional.emergencyContactNumber,
                elementarySchool: studentData.education.elementarySchool,
                elemYearGraduated: studentData.education.elemYearGraduated,
                secondarySchool: studentData.education.secondarySchool,
                secondaryYearGraduated: studentData.education.secondaryYearGraduated,
                collegiateSchool: studentData.education.collegiateSchool,
                status: yearNumber > 1 ? 'Old' : 'New',
                yearLevel: studentData.academic.yearLevel,
                course: deriveCourseForYearLevel(
                    studentData.academic.yearLevel,
                    studentData.academic.course,
                ),
                specialization: studentData.academic.specialization || '',
                subjects: [],
                block: '',
            };
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
                ...methods.getValues(),
                status: yearNumber > 1 ? 'Old' : 'New',
                yearLevel: studentData.academic.yearLevel,
                course: normalizedCourse,
                specialization: studentData.academic.specialization || '',
            });
        }
    }, [studentData, methods]);


    const resolveString = (value: unknown, fallback: string): string => {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed !== '') {
                return trimmed;
            }
        }
        return fallback;
    };

    const resolveOptionalString = (value: unknown, fallback?: string | null): string | null => {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed === '' ? null : trimmed;
        }
        if (typeof fallback === 'string') {
            const trimmedFallback = fallback.trim();
            return trimmedFallback === '' ? null : trimmedFallback;
        }
        return fallback ?? null;
    };

    const normalizeDateValue = (value: unknown, fallback?: string | null): string | null => {
        if (value instanceof Date) {
            return format(value, 'yyyy-MM-dd');
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '') {
                return fallback ?? null;
            }
            const parsed = new Date(trimmed);
            if (!Number.isNaN(parsed.getTime())) {
                return format(parsed, 'yyyy-MM-dd');
            }
            return trimmed;
        }
        return fallback ?? null;
    };

    const buildFormSnapshot = (values: EnrollmentSchemaType) => {
        if (!studentData) {
            return null;
        }

        return {
            personal: {
                firstName: resolveString(values.firstName, studentData.personal.firstName),
                lastName: resolveString(values.lastName, studentData.personal.lastName),
                middleName: resolveOptionalString(values.middleName, studentData.personal.middleName),
                birthdate: normalizeDateValue(values.birthdate, studentData.personal.birthdate),
                sex: resolveString(values.sex, studentData.personal.sex),
                civilStatus: resolveString(values.civilStatus, studentData.personal.civilStatus ?? 'Single'),
                nationality: resolveString(values.nationality, studentData.personal.nationality),
                religion: resolveString(values.religion, studentData.personal.religion),
                dialect: resolveString(values.dialect, studentData.personal.dialect),
            },
            contact: {
                email: resolveString(values.email, studentData.contact.email),
                phoneNumber: resolveString(values.phoneNumber, studentData.contact.phoneNumber),
            },
            address: {
                currentAddress: resolveString(values.currentAddress, studentData.address.currentAddress),
                permanentAddress: resolveString(values.permanentAddress, studentData.address.permanentAddress),
            },
            family: {
                fathersName: resolveString(values.fathersName, studentData.family.fathersName),
                fathersOccupation: resolveString(values.fathersOccupation, studentData.family.fathersOccupation),
                mothersName: resolveString(values.mothersName, studentData.family.mothersName),
                mothersOccupation: resolveString(values.mothersOccupation, studentData.family.mothersOccupation),
                guardiansName: resolveOptionalString(values.guardiansName, studentData.family.guardiansName),
            },
            additional: {
                emergencyContactName: resolveString(values.emergencyContactName, studentData.additional.emergencyContactName),
                emergencyContactAddress: resolveString(values.emergencyContactAddress, studentData.additional.emergencyContactAddress),
                emergencyContactNumber: resolveString(values.emergencyContactNumber, studentData.additional.emergencyContactNumber),
            },
            education: {
                elementarySchool: resolveString(values.elementarySchool, studentData.education.elementarySchool),
                elemYearGraduated: resolveString(values.elemYearGraduated, studentData.education.elemYearGraduated),
                secondarySchool: resolveString(values.secondarySchool, studentData.education.secondarySchool),
                secondaryYearGraduated: resolveString(values.secondaryYearGraduated, studentData.education.secondaryYearGraduated),
                collegiateSchool: resolveOptionalString(values.collegiateSchool, studentData.education.collegiateSchool),
            },
            academic: {
                course: values.course,
                yearLevel: values.yearLevel,
                status: values.status,
                block: values.block,
                specialization: resolveOptionalString(values.specialization, studentData.academic.specialization),
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
            const specializationValue = resolveOptionalString(data.specialization, studentData.academic.specialization);

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

            setIsSubmitted(true);
            toast({
                title: 'Enrollment submitted',
                description: 'Your application has been sent to the registrar for review.',
            });
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
    
    type FieldName = keyof EnrollmentSchemaType;

    const next = async () => {
        if (isSubmitting) {
            return;
        }

        const fieldsByStep: FieldName[][] = [
            Object.keys(personalFamilySchema.shape) as FieldName[],
            Object.keys(additionalInfoSchema.shape) as FieldName[],
            Object.keys(baseAcademicSchema.shape) as FieldName[],
        ];

        const fieldsToValidate = fieldsByStep[currentStep].map(field => field as string);
        const output = await methods.trigger(fieldsToValidate, { shouldFocus: true });

        if (!output) return;

        if (currentStep < steps.length - 1) {
             setCurrentStep(step => step + 1);
        } else {
             await methods.handleSubmit(processForm)();
        }
    };

    const prev = () => {
        if (currentStep > (isNewStudent ? 0 : 2)) {
            setCurrentStep(step => step - 1);
        }
    };

    if (!studentData) {
        return <div>Loading form...</div>;
    }

    if (isSubmitted) {
        return (
            <main className="flex-1 p-4 sm:p-6 flex items-center justify-center">
                <Card className="max-w-lg w-full rounded-xl">
                    <CardHeader>
                        <CardTitle>Enrollment Submitted!</CardTitle>
                        <CardDescription>Thank you for submitting your enrollment form.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Your application is now being processed. Please wait for an email confirmation regarding your enrollment status. You can check the status on your dashboard.</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full rounded-xl">
                            <Link href="/student/dashboard">Back to Dashboard</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </main>
        );
    }
    
    return (
        <main className="flex-1 p-4 sm:p-6">
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(processForm)}>
                    <Card className="max-w-4xl mx-auto rounded-xl">
                        <CardHeader>
                            <CardTitle>Enrollment Form</CardTitle>
                             <CardDescription>
                                {isNewStudent 
                                    ? `Please fill out all the necessary fields. (${steps[currentStep].name})`
                                    : "Please select your block and subjects for the new semester."
                                }
                            </CardDescription>
                            {isNewStudent && <Progress value={(currentStep / (steps.length - 1)) * 100} className="mt-4" />}
                        </CardHeader>
                        <CardContent>
                            {currentStep === 0 && <Step1 />}
                            {currentStep === 1 && <Step2 />}
                            {currentStep === 2 && <Step3 />}
                        </CardContent>
                        <CardFooter>
                           <div className="flex justify-between w-full">
                                {currentStep > 0 && isNewStudent && (
                                    <Button type="button" onClick={prev} variant="outline" className="rounded-xl" disabled={isSubmitting}>
                                        Previous
                                    </Button>
                                )}
                                
                                {currentStep < 2 && isNewStudent ? (
                                     <Button type="button" onClick={next} className="rounded-xl ml-auto" disabled={isSubmitting}>
                                        Next
                                    </Button>
                                ) : (
                                    <Button type="submit" className="rounded-xl w-full" disabled={isSubmitting}>
                                        {isSubmitting ? 'Submitting...' : 'Submit Enrollment'}
                                    </Button>
                                )}
                            </div>
                        </CardFooter>
                    </Card>
                </form>
            </FormProvider>
        </main>
    );
}

    