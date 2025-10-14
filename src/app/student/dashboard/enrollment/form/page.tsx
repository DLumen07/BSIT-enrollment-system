
'use client';
import React, { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

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

const blocksByYear: Record<string, { value: string; label: string }[]> = {
    "1st Year": [{ value: 'BSIT-1A', label: 'BSIT 1-A' }, { value: 'BSIT-1B', label: 'BSIT 1-B' }],
    "2nd Year": [{ value: 'BSIT-2A', label: 'BSIT 2-A' }, { value: 'BSIT-2B', label: 'BSIT 2-B' }],
    "3rd Year": [{ value: 'BSIT-3A', label: 'BSIT 3-A' }, { value: 'BSIT-3B', label: 'BSIT 3-B' }],
    "4th Year": [{ value: 'BSIT-4A', label: 'BSIT 4-A' }, { value: 'BSIT-4B', label: 'BSIT 4-B' }],
};

const subjectsByCourseAndYear: Record<string, Record<string, { id: string; label: string; units: number }[]>> = {
    "BSIT": {
        "1st Year": [
            { id: 'IT101', label: 'IT 101 - Introduction to Computing', units: 3 },
            { id: 'MATH101', label: 'MATH 101 - Calculus 1', units: 3 },
            { id: 'ENG101', label: 'ENG 101 - Purposive Communication', units: 3 },
        ],
        "2nd Year": [
            { id: 'IT201', label: 'IT 201 - Data Structures & Algorithms', units: 3 },
            { id: 'IT202', label: 'IT 202 - Web Development', units: 3 },
            { id: 'MATH201', label: 'MATH 201 - Discrete Mathematics', units: 3 },
        ],
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
            { id: 'ACT101', label: 'ACT 101 - Fundamentals of Accounting', units: 3 },
            { id: 'ACT102', label: 'ACT 102 - Business Communication', units: 3 },
        ],
        "2nd Year": [
             { id: 'ACT201', label: 'ACT 201 - Intermediate Accounting', units: 3 },
             { id: 'ACT202', label: 'ACT 202 - Cost Accounting', units: 3 },
        ]
    }
};


const Step1 = () => (
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

const Step2 = () => {
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
};

const Step3 = () => {
    const form = useFormContext();
    const selectedYear = form.watch('yearLevel');
    const selectedCourse = form.watch('course');
    const selectedBlock = form.watch('block');

    const availableBlocks = selectedYear ? blocksByYear[selectedYear] || [] : [];
    const availableSubjects = selectedCourse && selectedYear ? subjectsByCourseAndYear[selectedCourse]?.[selectedYear] || [] : [];

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-medium">Academic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="course" render={({ field }) => (
                    <FormItem><FormLabel>Course</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select course" /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="BSIT">BSIT</SelectItem><SelectItem value="ACT">ACT</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField name="status" render={({ field }) => (
                    <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="New">New</SelectItem><SelectItem value="Old">Old</SelectItem><SelectItem value="Transferee">Transferee</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="yearLevel" render={({ field }) => (
                    <FormItem><FormLabel>Year Level</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select year level" /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="1st Year">1st Year</SelectItem><SelectItem value="2nd Year">2nd Year</SelectItem><SelectItem value="3rd Year">3rd Year</SelectItem><SelectItem value="4th Year">4th Year</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                {selectedYear && (
                     <FormField name="block" render={({ field }) => (
                        <FormItem><FormLabel>Block</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="rounded-xl"><SelectValue placeholder="Select block" /></SelectTrigger></FormControl><SelectContent className="rounded-xl">
                            {availableBlocks.map(block => (
                                <SelectItem key={block.value} value={block.value}>{block.label}</SelectItem>
                            ))}
                        </SelectContent></Select><FormMessage /></FormItem>
                    )} />
                )}
            </div>
            
            {selectedBlock && availableSubjects.length > 0 && (
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
};

const ReviewStep = ({ formData }: { formData: EnrollmentSchemaType }) => {
    const getSubjectLabel = (subjectId: string) => {
        for (const course in subjectsByCourseAndYear) {
            for (const year in subjectsByCourseAndYear[course]) {
                const subject = subjectsByCourseAndYear[course][year].find(s => s.id === subjectId);
                if (subject) return subject.label;
            }
        }
        return subjectId;
    };

    const ReviewItem = ({ label, value }: { label: string, value?: string | number | boolean | Date | null }) => (
        value ? (
            <div className="flex flex-col sm:flex-row sm:items-center">
                <p className="w-full sm:w-1/3 font-medium text-muted-foreground">{label}</p>
                <p className="w-full sm:w-2/3">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value instanceof Date ? format(value, "PPP") : value}</p>
            </div>
        ) : null
    );

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-medium mb-4">Personal & Family Information</h3>
                <div className="space-y-2">
                    <ReviewItem label="Full Name" value={`${formData.firstName} ${formData.middleName || ''} ${formData.lastName}`} />
                    <ReviewItem label="Email" value={formData.email} />
                    <ReviewItem label="Phone Number" value={formData.phoneNumber} />
                    <ReviewItem label="Birthdate" value={formData.birthdate} />
                    <ReviewItem label="Current Address" value={formData.currentAddress} />
                    <ReviewItem label="Permanent Address" value={formData.permanentAddress} />
                    <ReviewItem label="Nationality" value={formData.nationality} />
                    <ReviewItem label="Religion" value={formData.religion} />
                    <ReviewItem label="Dialect" value={formData.dialect} />
                    <ReviewItem label="Sex" value={formData.sex} />
                    <ReviewItem label="Civil Status" value={formData.civilStatus} />
                    <ReviewItem label="Father's Name" value={formData.fathersName} />
                    <ReviewItem label="Father's Occupation" value={formData.fathersOccupation} />
                    <ReviewItem label="Mother's Name" value={formData.mothersName} />
                    <ReviewItem label="Mother's Occupation" value={formData.mothersOccupation} />
                    <ReviewItem label="Guardian's Name" value={formData.guardiansName} />
                    <ReviewItem label="Guardian's Occupation" value={formData.guardiansOccupation} />
                    <ReviewItem label="Guardian's Address" value={formData.guardiansAddress} />
                </div>
            </div>
            <div className="border-t pt-8">
                <h3 className="text-lg font-medium mb-4">Additional & Educational Background</h3>
                <div className="space-y-2">
                    <ReviewItem label="Living with Family" value={formData.livingWithFamily} />
                    <ReviewItem label="Boarding" value={formData.boarding} />
                    <ReviewItem label="Differently Abled" value={formData.differentlyAbled} />
                    {formData.differentlyAbled && <ReviewItem label="Disability" value={formData.disability} />}
                    <ReviewItem label="Belong to Minority Group" value={formData.minorityGroup} />
                    {formData.minorityGroup && <ReviewItem label="Minority Group" value={formData.minority} />}
                    <ReviewItem label="Emergency Contact Name" value={formData.emergencyContactName} />
                    <ReviewItem label="Emergency Contact Address" value={formData.emergencyContactAddress} />
                    <ReviewItem label="Emergency Contact Number" value={formData.emergencyContactNumber} />
                    <ReviewItem label="Elementary School" value={formData.elementarySchool} />
                    <ReviewItem label="Year Graduated (Elem)" value={formData.elemYearGraduated} />
                    <ReviewItem label="Secondary School" value={formData.secondarySchool} />
                    <ReviewItem label="Year Graduated (Secondary)" value={formData.secondaryYearGraduated} />
                    <ReviewItem label="Collegiate School" value={formData.collegiateSchool} />
                    <ReviewItem label="Year Graduated (Collegiate)" value={formData.collegiateYearGraduated} />
                </div>
            </div>
            <div className="border-t pt-8">
                <h3 className="text-lg font-medium mb-4">Academic Information</h3>
                <div className="space-y-2">
                    <ReviewItem label="Course" value={formData.course} />
                    <ReviewItem label="Status" value={formData.status} />
                    <ReviewItem label="Year Level" value={formData.yearLevel} />
                    <ReviewItem label="Block" value={formData.block} />
                    {formData.subjects && formData.subjects.length > 0 && (
                        <div>
                            <p className="w-full sm:w-1/3 font-medium text-muted-foreground mb-2">Enlisted Subjects</p>
                            <ul className="list-disc pl-5 space-y-1">
                                {formData.subjects.map(subjectId => (
                                    <li key={subjectId}>{getSubjectLabel(subjectId)}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


export default function EnrollmentFormPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);

    const methods = useForm<EnrollmentSchemaType>({
        resolver: zodResolver(enrollmentSchema),
        defaultValues: {
            sex: 'Male',
            civilStatus: 'Single',
            status: 'New',
            subjects: [],
        }
    });

    const processForm = (data: EnrollmentSchemaType) => {
        console.log(data);
        setIsSubmitted(true);
    };
    
    type FieldName = keyof EnrollmentSchemaType;

    const next = async () => {
        const fields: FieldName[][] = [
            Object.keys(personalFamilySchema.shape) as FieldName[],
            Object.keys(additionalInfoSchema.shape) as FieldName[],
            Object.keys(academicSchema.shape) as FieldName[],
        ];
        
        const output = await methods.trigger(fields[currentStep], { shouldFocus: true });
        
        if (!output) return;

        if (currentStep < steps.length - 1) {
            setCurrentStep(step => step + 1);
        } else {
             const isValid = await methods.trigger();
            if (isValid) {
                setIsReviewing(true);
            }
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
            <Card className="max-w-4xl mx-auto rounded-xl">
                <CardHeader>
                    <CardTitle>{isReviewing ? 'Review Your Information' : 'Enrollment Form'}</CardTitle>
                    <CardDescription>
                        {isReviewing 
                            ? 'Please review your details carefully before final submission.' 
                            : `Please fill out all the necessary fields. (${steps[currentStep].name})`
                        }
                    </CardDescription>
                    {!isReviewing && <Progress value={(currentStep / (steps.length - 1)) * 100} className="mt-4" />}
                </CardHeader>
                <CardContent>
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(processForm)}>
                             {isReviewing ? (
                                <ReviewStep formData={methods.getValues()} />
                             ) : (
                                <>
                                    <div style={{ display: currentStep === 0 ? 'block' : 'none' }}><Step1 /></div>
                                    <div style={{ display: currentStep === 1 ? 'block' : 'none' }}><Step2 /></div>
                                    <div style={{ display: currentStep === 2 ? 'block' : 'none' }}><Step3 /></div>
                                </>
                             )}
                        </form>
                    </FormProvider>
                </CardContent>
                <CardFooter>
                     {isReviewing ? (
                        <div className="flex justify-between w-full">
                            <Button onClick={() => setIsReviewing(false)} variant="outline" className="rounded-xl">
                                Edit
                            </Button>
                            <Button onClick={methods.handleSubmit(processForm)} className="rounded-xl">
                                Confirm & Submit
                            </Button>
                        </div>
                    ) : (
                        <div className="flex justify-between w-full">
                            <Button onClick={prev} disabled={currentStep === 0} variant="outline" className="rounded-xl">
                                Previous
                            </Button>
                            <Button onClick={next} className="rounded-xl">
                                {currentStep < steps.length - 1 ? 'Next' : 'Submit'}
                            </Button>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </main>
    );
}
