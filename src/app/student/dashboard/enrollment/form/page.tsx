
'use client';
import React, { useState, useEffect, useMemo } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const steps = [
    { id: 'Step 1', name: 'Personal & Family Information' },
    { id: 'Step 2', name: 'Additional & Educational Background' },
    { id: 'Step 3', name: 'Academic Information' },
];

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

const academicSchema = z.object({
    course: z.string().min(1, 'Course is required'),
    yearLevel: z.string().min(1, 'Year level is required'),
    status: z.enum(['New', 'Old', 'Transferee']),
    block: z.string({required_error: 'Please select a block.'}).min(1, 'Please select a block.'),
    subjects: z.array(z.string()).min(1, "Please select at least one subject."),
    specialization: z.string().optional(),
}).refine(data => {
    if ((data.yearLevel === '3rd Year' || data.yearLevel === '4th Year') && !data.specialization) {
        return false;
    }
    return true;
}, {
    message: 'Specialization is required for 3rd and 4th year students.',
    path: ['specialization'],
});


// Full schema for new students
const newStudentSchema = personalFamilySchema.merge(additionalInfoSchema).merge(academicSchema);

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
            <FormField name="birthdate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Birthdate</FormLabel><Popover><PopoverTrigger asChild>
                    <FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal rounded-xl", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                </PopoverTrigger><PopoverContent className="w-auto p-0 rounded-xl" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                </PopoverContent></Popover><FormMessage /></FormItem>
            )} />
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
    
    const yearLevelMap: Record<string, '1st-year' | '2nd-year' | '3rd-year' | '4th-year'> = {
        '1st Year': '1st-year',
        '2nd Year': '2nd-year',
        '3rd Year': '3rd-year',
        '4th Year': '4th-year',
    };

    useEffect(() => {
        if (isFourthYear && studentData?.academic.specialization) {
            form.setValue('specialization', studentData.academic.specialization);
        }
         if (!isUpperYear) { // Clear specialization for lower years
            form.setValue('specialization', undefined);
        }
    }, [isFourthYear, isUpperYear, studentData, form]);

    const availableBlocks = useMemo(() => {
        if (!selectedYear || !selectedCourse) return [];
        const yearKey = yearLevelMap[selectedYear];
        if (!yearKey) return [];
        return adminData.blocks
            .filter(b => {
                const yearMatch = b.year === yearKey;
                const courseMatch = b.course === selectedCourse;
                const specMatch = !isUpperYear || b.specialization === selectedSpecialization;
                const capacityMatch = b.capacity > b.enrolled;
                return yearMatch && courseMatch && specMatch && capacityMatch;
            })
            .map(b => ({ value: b.name, label: b.name }));
    }, [selectedYear, selectedCourse, selectedSpecialization, adminData.blocks, isUpperYear]);

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
                    <FormItem><FormLabel>Year Level</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select year level" /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="1st Year">1st Year</SelectItem><SelectItem value="2nd Year">2nd Year</SelectItem><SelectItem value="3rd Year">3rd Year</SelectItem><SelectItem value="4th Year">4th Year</SelectItem></SelectContent></Select><FormMessage /></FormItem>
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
                                                    return checked
                                                    ? field.onChange([...(field.value || []), subject.id])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                            (value) => value !== subject.id
                                                        )
                                                        )
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
    const { setAdminData } = useAdmin();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    const isNewStudent = useMemo(() => {
        if (!studentData) return true;
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
                birthdate: new Date(studentData.personal.birthdate),
                currentAddress: studentData.address.currentAddress,
                permanentAddress: studentData.address.permanentAddress,
                nationality: studentData.personal.nationality,
                religion: studentData.personal.religion,
                dialect: studentData.personal.dialect,
                sex: studentData.personal.sex,
                civilStatus: 'Single',
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
                course: studentData.academic.course,
                specialization: studentData.academic.specialization || '',
                subjects: [],
                block: '',
            };
        }, [studentData])
    });
    
    useEffect(() => {
        if (studentData) {
            const yearNumber = parseInt(studentData.academic.yearLevel, 10);
            methods.reset({
                ...methods.getValues(),
                status: yearNumber > 1 ? 'Old' : 'New',
                yearLevel: studentData.academic.yearLevel,
                course: studentData.academic.course,
                specialization: studentData.academic.specialization || '',
            });
        }
    }, [studentData, methods]);


    const processForm = (data: EnrollmentSchemaType) => {
        if (!studentData) return;

        const yearLevelMap: Record<string, number> = {
            '1st Year': 1, '2nd Year': 2, '3rd Year': 3, '4th Year': 4,
        };

        const newApplication = {
            id: Date.now(),
            studentId: studentData.academic.studentId,
            name: `${data.firstName} ${data.lastName}`,
            course: data.course,
            year: yearLevelMap[data.yearLevel],
            status: data.status,
            block: data.block,
            credentials: {
                birthCertificate: true,
                grades: true,
                goodMoral: true,
                registrationForm: true,
            },
        };

        setAdminData(prev => ({
            ...prev,
            pendingApplications: [...prev.pendingApplications, newApplication],
        }));

        setIsSubmitted(true);
    };
    
    type FieldName = keyof EnrollmentSchemaType;

    const next = async () => {
        const fieldsByStep: FieldName[][] = [
            Object.keys(personalFamilySchema.shape) as FieldName[],
            Object.keys(additionalInfoSchema.shape) as FieldName[],
            Object.keys(academicSchema.shape) as FieldName[],
        ];
        
        const fieldsToValidate = fieldsByStep[currentStep];
        const output = await methods.trigger(fieldsToValidate, { shouldFocus: true });

        if (!output) return;

        if (currentStep < steps.length - 1) {
             setCurrentStep(step => step + 1);
        } else {
             methods.handleSubmit(processForm)();
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
                                    <Button type="button" onClick={prev} variant="outline" className="rounded-xl">
                                        Previous
                                    </Button>
                                )}
                                
                                {currentStep < 2 && isNewStudent ? (
                                     <Button type="button" onClick={next} className="rounded-xl ml-auto">
                                        Next
                                    </Button>
                                ) : (
                                    <Button type="submit" className="rounded-xl w-full">
                                        Submit Enrollment
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
