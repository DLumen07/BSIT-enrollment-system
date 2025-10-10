
'use client';
import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

const steps = [
    { id: 'Step 1', name: 'Personal Information' },
    { id: 'Step 2', name: 'Academic & Family Information' },
    { id: 'Step 3', name: 'Additional & Educational Background' },
];

const personalInfoSchema = z.object({
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
});

const academicFamilySchema = z.object({
    course: z.string().min(1, 'Course is required'),
    yearLevel: z.string().min(1, 'Year level is required'),
    block: z.string().optional(),
    status: z.enum(['New', 'Old', 'Transferee']),
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


const enrollmentSchema = personalInfoSchema.merge(academicFamilySchema).merge(additionalInfoSchema);

const Step1 = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField name="firstName" render={({ field }) => (
                <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="lastName" render={({ field }) => (
                <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="middleName" render={({ field }) => (
                <FormItem><FormLabel>Middle Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="phoneNumber" render={({ field }) => (
                <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} type="tel" /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
        <FormField name="birthdate" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Birthdate</FormLabel><Popover><PopoverTrigger asChild>
                <FormControl>
                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
            </PopoverContent></Popover><FormMessage /></FormItem>
        )} />
        <FormField name="currentAddress" render={({ field }) => (
            <FormItem><FormLabel>Current Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField name="permanentAddress" render={({ field }) => (
            <FormItem><FormLabel>Permanent Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField name="nationality" render={({ field }) => (
                <FormItem><FormLabel>Nationality</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="religion" render={({ field }) => (
                <FormItem><FormLabel>Religion</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="dialect" render={({ field }) => (
                <FormItem><FormLabel>Dialect</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField name="sex" render={({ field }) => (
                <FormItem><FormLabel>Sex</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField name="civilStatus" render={({ field }) => (
                <FormItem><FormLabel>Civil Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select civil status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Single">Single</SelectItem><SelectItem value="Married">Married</SelectItem><SelectItem value="Widowed">Widowed</SelectItem><SelectItem value="Separated">Separated</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
        </div>
    </div>
);

const Step2 = () => (
     <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField name="course" render={({ field }) => (
                <FormItem><FormLabel>Course</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger></FormControl><SelectContent><SelectItem value="BSIT">BSIT</SelectItem><SelectItem value="ACT">ACT</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
             <FormField name="yearLevel" render={({ field }) => (
                <FormItem><FormLabel>Year Level</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select year level" /></SelectTrigger></FormControl><SelectContent><SelectItem value="1">1st Year</SelectItem><SelectItem value="2">2nd Year</SelectItem><SelectItem value="3">3rd Year</SelectItem><SelectItem value="4">4th Year</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField name="block" render={({ field }) => (
                <FormItem><FormLabel>Block (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="Old">Old</SelectItem><SelectItem value="Transferee">Transferee</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
        </div>
         <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-medium">Family Information</h3>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField name="fathersName" render={({ field }) => (
                <FormItem><FormLabel>Father's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="fathersOccupation" render={({ field }) => (
                <FormItem><FormLabel>Father's Occupation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField name="mothersName" render={({ field }) => (
                <FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="mothersOccupation" render={({ field }) => (
                <FormItem><FormLabel>Mother's Occupation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField name="guardiansName" render={({ field }) => (
                <FormItem><FormLabel>Guardian's Name (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="guardiansOccupation" render={({ field }) => (
                <FormItem><FormLabel>Guardian's Occupation (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
        <FormField name="guardiansAddress" render={({ field }) => (
            <FormItem><FormLabel>Guardian's Address (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
    </div>
);

const Step3 = () => {
    const form = useFormContext();
    const isDifferentlyAbled = form.watch('differentlyAbled');
    const belongsToMinority = form.watch('minorityGroup');

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="livingWithFamily" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Living with Family?</FormLabel></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                <FormField name="boarding" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Boarding?</FormLabel></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
            </div>
             <div className="space-y-4 rounded-lg border p-4">
                 <FormField name="differentlyAbled" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between"><div className="space-y-0.5"><FormLabel>Are you differently abled?</FormLabel></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                {isDifferentlyAbled && (
                    <FormField name="disability" render={({ field }) => (
                        <FormItem><FormLabel>Specify disability</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                )}
            </div>
             <div className="space-y-4 rounded-lg border p-4">
                <FormField name="minorityGroup" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between"><div className="space-y-0.5"><FormLabel>Belong to minority group?</FormLabel></div><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                )} />
                {belongsToMinority && (
                    <FormField name="minority" render={({ field }) => (
                        <FormItem><FormLabel>Specify minority group</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                )}
            </div>
            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium">Emergency Contact</h3>
            </div>
            <FormField name="emergencyContactName" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="emergencyContactAddress" render={({ field }) => (
                <FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField name="emergencyContactNumber" render={({ field }) => (
                <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input {...field} type="tel" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium">Educational Background</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField name="elementarySchool" render={({ field }) => (
                    <FormItem><FormLabel>Elementary School</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField name="elemYearGraduated" render={({ field }) => (
                    <FormItem><FormLabel>Year Graduated</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField name="secondarySchool" render={({ field }) => (
                    <FormItem><FormLabel>Secondary School</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField name="secondaryYearGraduated" render={({ field }) => (
                    <FormItem><FormLabel>Year Graduated</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField name="collegiateSchool" render={({ field }) => (
                    <FormItem><FormLabel>Collegiate School (If transferee)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField name="collegiateYearGraduated" render={({ field }) => (
                    <FormItem><FormLabel>Year Graduated (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
        </div>
    );
};


export default function EnrollmentFormPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const methods = useForm<z.infer<typeof enrollmentSchema>>({
        resolver: zodResolver(enrollmentSchema),
        defaultValues: {
            sex: 'Male',
            civilStatus: 'Single',
            status: 'New',
        }
    });

    const processForm = (data: z.infer<typeof enrollmentSchema>) => {
        console.log(data);
        setIsSubmitted(true);
    };
    
    type FieldName = keyof z.infer<typeof enrollmentSchema>;

    const next = async () => {
        const fields: FieldName[][] = [
            Object.keys(personalInfoSchema.shape) as FieldName[],
            Object.keys(academicFamilySchema.shape) as FieldName[],
            Object.keys(additionalInfoSchema.shape) as FieldName[],
        ];
        
        const output = await methods.trigger(fields[currentStep], { shouldFocus: true });
        
        if (!output) return;

        if (currentStep < steps.length - 1) {
            setCurrentStep(step => step + 1);
        }
    };

    const prev = () => {
        if (currentStep > 0) {
            setCurrentStep(step => step - 1);
        }
    };


    if (isSubmitted) {
        return (
            <main className="flex-1 p-4 sm:p-6 flex items-center justify-center">
                <Card className="max-w-lg w-full">
                    <CardHeader>
                        <CardTitle>Enrollment Submitted!</CardTitle>
                        <CardDescription>Thank you for submitting your enrollment form.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Your application is now being processed. Please wait for an email confirmation regarding your enrollment status. You can check the status on your dashboard.</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href="/student/dashboard">Back to Dashboard</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </main>
        );
    }
    
    return (
        <main className="flex-1 p-4 sm:p-6">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Enrollment Form</CardTitle>
                    <CardDescription>Please fill out all the necessary fields.</CardDescription>
                    <Progress value={(currentStep / (steps.length -1)) * 100} className="mt-4" />
                </CardHeader>
                <CardContent>
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(processForm)}>
                             {currentStep === 0 && <Step1 />}
                             {currentStep === 1 && <Step2 />}
                             {currentStep === 2 && <Step3 />}
                        </form>
                    </FormProvider>
                </CardContent>
                <CardFooter>
                    <div className="flex justify-between w-full">
                        <Button onClick={prev} disabled={currentStep === 0} variant="outline">
                            Previous
                        </Button>
                        {currentStep < steps.length - 1 ? (
                             <Button onClick={next}>
                                Next
                            </Button>
                        ) : (
                             <Button onClick={methods.handleSubmit(processForm)}>
                                Submit
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </main>
    );
}

