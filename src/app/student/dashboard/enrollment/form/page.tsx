
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { CalendarIcon, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useStudent } from '@/app/student/context/student-context';
import { useAdmin } from '@/app/admin/context/admin-context';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
    guardiansOccupation: z.string().optional(),
    guardiansAddress: z.string().optional(),
});

const additionalInfoSchema = z.object({
    livingWithFamily: z.boolean().default(false),
    boarding: z.boolean().default(false),
    differentlyAbled: z.boolean().default(false),
    disability: z.string().optional(),
    minorityGroup: z.boolean().default(false),
    minority: z.string().optional(),
    emergencyContactName: z.string().min(1, 'Emergency contact name is required'),
    emergencyContactAddress: z.string().min(1, 'Emergency contact address is required'),
    emergencyContactNumber: z.string().min(10, 'Invalid emergency contact number'),
    elementarySchool: z.string().min(1, 'Elementary school is required'),
    elemYearGraduated: z.string().min(4, 'Invalid year'),
    secondarySchool: z.string().min(1, 'Secondary school is required'),
    secondaryYearGraduated: z.string().min(4, 'Invalid year'),
    collegiateSchool: z.string().optional(),
    collegiateYearGraduated: z.string().optional(),
});

const academicSchema = z.object({
    course: z.string().min(1, 'Course is required'),
    yearLevel: z.string().min(1, 'Year level is required'),
    status: z.enum(['New', 'Old', 'Transferee']),
    block: z.string().optional(),
    subjects: z.array(z.string()).optional(),
});


const enrollmentSchema = personalFamilySchema.merge(additionalInfoSchema).merge(academicSchema);
type EnrollmentSchemaType = z.infer<typeof enrollmentSchema>;

const subjectsByCourseAndYear: Record<string, Record<string, { id: string; label: string; units: number }[]>> = {
    "BSIT": {
        "3rd Year": [
             { id: 'IT301', label: 'IT 301 - Software Engineering', units: 3 },
             { id: 'IT302', label: 'IT 302 - Database Management', units: 3 },
        ],
        "4th Year": [
            { id: 'IT401', label: 'IT 401 - Capstone Project 1', units: 5 },
            { id: 'IT402', label: 'IT 402 - Information Assurance & Security', units: 3 },
        ]
    },
    "ACT": {
        "1st Year": [
            { id: 'IT 101', label: 'IT 101 - Introduction to Computing', units: 3 },
            { id: 'MATH 101', label: 'MATH 101 - Calculus 1', units: 3 },
        ],
        "2nd Year": [
             { id: 'IT 201', label: 'IT 201 - Data Structures & Algorithms', units: 3 },
        ]
    }
};

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
                <FormField name="guardiansOccupation" render={({ field }) => (
                    <FormItem><FormLabel>Guardian's Occupation (Optional)</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <FormField name="guardiansAddress" render={({ field }) => (
                <FormItem><FormLabel>Guardian's Address (Optional)</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
    );
}

function Step2() {
    const form = useFormContext();
    const isDifferentlyAbled = form.watch('differentlyAbled');
    const belongsToMinority = form.watch('minorityGroup');

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="livingWithFamily" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4"><div className="space-y-0.5"><FormLabel>Living with Family?</FormLabel></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                <FormField name="boarding" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4"><div className="space-y-0.5"><FormLabel>Boarding?</FormLabel></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
            </div>
             <div className="space-y-4 rounded-xl border p-4">
                 <FormField name="differentlyAbled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between"><div className="space-y-0.5"><FormLabel>Are you differently abled?</FormLabel></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                {isDifferentlyAbled && (
                    <FormField name="disability" render={({ field }) => (
                        <FormItem><FormLabel>Specify disability</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                    )} />
                )}
            </div>
             <div className="space-y-4 rounded-xl border p-4">
                <FormField name="minorityGroup" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between"><div className="space-y-0.5"><FormLabel>Belong to minority group?</FormLabel></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                {belongsToMinority && (
                    <FormField name="minority" render={({ field }) => (
                        <FormItem><FormLabel>Specify minority group</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                    )} />
                )}
            </div>
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
                 <FormField name="collegiateYearGraduated" render={({ field }) => (
                    <FormItem><FormLabel>Year Graduated (Optional)</FormLabel><FormControl><Input {...field} className="rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
        </div>
    );
}

function Step3() {
    const { adminData } = useAdmin();
    const form = useFormContext();
    const selectedYear = form.watch('yearLevel');
    const selectedCourse = form.watch('course');
    const selectedBlock = form.watch('block');

    const yearLevelMap: Record<string, string> = {
        '1st Year': '1st-year',
        '2nd Year': '2nd-year',
        '3rd Year': '3rd-year',
        '4th Year': '4th-year',
    };

    const availableBlocks = useMemo(() => {
        if (!selectedYear || !selectedCourse) return [];
        const yearKey = yearLevelMap[selectedYear];
        return adminData.blocks
            .filter(b => b.year === yearKey && b.course === selectedCourse && b.capacity > b.enrolled)
            .map(b => ({ value: b.name, label: b.name }));
    }, [selectedYear, selectedCourse, adminData.blocks]);

    const availableSubjects = selectedCourse && selectedYear ? subjectsByCourseAndYear[selectedCourse]?.[selectedYear] || [] : [];
    
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
                    <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="New">New</SelectItem><SelectItem value="Old">Old</SelectItem><SelectItem value="Transferee">Transferee</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="yearLevel" render={({ field }) => (
                    <FormItem><FormLabel>Year Level</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select year level" /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="1st Year">1st Year</SelectItem><SelectItem value="2nd Year">2nd Year</SelectItem><SelectItem value="3rd Year">3rd Year</SelectItem><SelectItem value="4th Year">4th Year</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                {selectedYear === '1st Year' && (
                     <>
                        {availableBlocks.length > 0 ? (
                             <FormField name="block" render={({ field }) => (
                                <FormItem><FormLabel>Block</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select block" /></SelectTrigger></FormControl><SelectContent className="rounded-xl">
                                    {availableBlocks.map(block => (
                                        <SelectItem key={block.value} value={block.value}>{block.label}</SelectItem>
                                    ))}
                                </SelectContent></Select><FormMessage /></FormItem>
                            )} />
                        ) : (
                            <div className="space-y-2">
                                <FormLabel>Block</FormLabel>
                                <Alert variant="destructive" className="rounded-xl">
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>No Blocks Available</AlertTitle>
                                    <AlertDescription>
                                        There are no available blocks for this year level. Please try again later.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </>
                )}
            </div>
            
            {selectedYear === '1st Year' && selectedBlock && availableSubjects.length > 0 && (
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
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showSkipDialog, setShowSkipDialog] = useState(false);
    const [hasMadeSkipChoice, setHasMadeSkipChoice] = useState(false);

    const getInitialStatus = useCallback(() => {
        if (!studentData) return 'New';
        if (studentData.academic.yearLevel === '1st Year') {
            return 'New';
        }
        return 'Old';
    }, [studentData]);

    const getInitialCourse = useCallback(() => {
        if (!studentData) return 'ACT';
        const year = studentData.academic.yearLevel;
        if (year === '1st Year' || year === '2nd Year') {
            return 'ACT';
        }
        return 'BSIT';
    }, [studentData]);
    
    useEffect(() => {
        if (studentData && studentData.academic.yearLevel !== '1st Year' && !hasMadeSkipChoice) {
            setShowSkipDialog(true);
        }
    }, [studentData, hasMadeSkipChoice]);

    const methods = useForm<EnrollmentSchemaType>({
        resolver: zodResolver(enrollmentSchema),
        defaultValues: {
            firstName: studentData?.personal.firstName,
            lastName: studentData?.personal.lastName,
            email: studentData?.contact.email,
            phoneNumber: studentData?.contact.phoneNumber,
            sex: studentData?.personal.sex,
            civilStatus: 'Single',
            status: getInitialStatus(),
            yearLevel: studentData?.academic.yearLevel,
            course: getInitialCourse(),
            subjects: [],
        }
    });

    const processForm = (data: EnrollmentSchemaType) => {
        console.log(data);
        setIsSubmitted(true);
    };
    
    type FieldName = keyof EnrollmentSchemaType;

    const next = async () => {
        const fieldsByStep: FieldName[][] = [
            Object.keys(personalFamilySchema.shape) as FieldName[],
            Object.keys(additionalInfoSchema.shape) as FieldName[],
            Object.keys(academicSchema.shape) as FieldName[],
        ];
        
        let fieldsToValidate: FieldName[] = fieldsByStep[currentStep];

        // For step 3 (academic info), if the user is not 1st year, they don't select blocks/subjects.
        if (currentStep === 2) {
             const yearLevel = methods.getValues('yearLevel');
             if (yearLevel !== '1st Year') {
                const schemaForOldStudent = academicSchema.omit({ block: true, subjects: true });
                const result = await schemaForOldStudent.safeParseAsync(methods.getValues());
                if (!result.success) {
                     // Manually set errors if you want to display them
                    console.error(result.error.format());
                     // Trigger validation to show errors
                    methods.trigger(fieldsToValidate);
                    return;
                }
             } else {
                 const result = await academicSchema.safeParseAsync(methods.getValues());
                 if (!result.success) {
                    console.error(result.error.format());
                     // This part is tricky as trigger doesn't work well with safeParse
                    methods.trigger(fieldsToValidate); // Attempt to trigger validation display
                    return;
                 }
             }
        } else {
             const output = await methods.trigger(fieldsToValidate, { shouldFocus: true });
             if (!output) return;
        }


        if (currentStep < steps.length - 1) {
            setCurrentStep(step => step + 1);
        } else {
             methods.handleSubmit(processForm)();
        }
    };

    const prev = () => {
        if (currentStep > 0) {
            setCurrentStep(step => step - 1);
        }
    };

    const handleSkip = () => {
        setCurrentStep(2);
        setShowSkipDialog(false);
        setHasMadeSkipChoice(true);
    };

    const handleUpdate = () => {
        setShowSkipDialog(false);
        setHasMadeSkipChoice(true);
    };


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
    
    if (!studentData) {
        return <div>Loading form...</div>
    }

    if (studentData.academic.yearLevel !== '1st Year' && !hasMadeSkipChoice) {
        return (
             <AlertDialog open={showSkipDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Returning Student?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your personal data is already on file. Do you need to update it? Most returning students can skip directly to subject selection.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={handleUpdate}>Update My Info</Button>
                        <AlertDialogAction asChild>
                           <Button onClick={handleSkip}>Skip & Continue</Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )
    }

    return (
        <main className="flex-1 p-4 sm:p-6">
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(processForm)}>
                    <Card className="max-w-4xl mx-auto rounded-xl">
                        <CardHeader>
                            <CardTitle>Enrollment Form</CardTitle>
                            <CardDescription>
                                {`Please fill out all the necessary fields. (${steps[currentStep].name})`}
                            </CardDescription>
                            <Progress value={(currentStep / (steps.length - 1)) * 100} className="mt-4" />
                        </CardHeader>
                        <CardContent>
                            {currentStep === 0 && <Step1 />}
                            {currentStep === 1 && <Step2 />}
                            {currentStep === 2 && <Step3 />}
                        </CardContent>
                        <CardFooter>
                            <div className="flex justify-between w-full">
                                <Button type="button" onClick={prev} disabled={currentStep === 0} variant="outline" className="rounded-xl">
                                    Previous
                                </Button>
                                {currentStep < steps.length - 1 ? (
                                    <Button type="button" onClick={next} className="rounded-xl">
                                        Next
                                    </Button>
                                ) : (
                                    <Button type="submit" className="rounded-xl">
                                        Submit
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
