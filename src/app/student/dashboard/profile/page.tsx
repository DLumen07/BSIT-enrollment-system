
'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const studentData = {
    personal: {
        firstName: 'Student',
        lastName: 'Name',
        middleName: 'Dela Cruz',
        birthdate: 'January 1, 2004',
        sex: 'Male',
        civilStatus: 'Single',
        nationality: 'Filipino',
        religion: 'Roman Catholic',
        dialect: 'Tagalog',
    },
    contact: {
        email: 'student.name@example.com',
        phoneNumber: '09123456789',
    },
    address: {
        currentAddress: '123 Main St, Quezon City, Metro Manila',
        permanentAddress: '456 Provincial Rd, Cebu City, Cebu',
    },
    family: {
        fathersName: "Father's Name",
        fathersOccupation: "Father's Occupation",
        mothersName: "Mother's Name",
        mothersOccupation: "Mother's Occupation",
        guardiansName: "Guardian's Name",
    },
    additional: {
        emergencyContactName: 'Emergency Contact',
        emergencyContactAddress: 'Emergency Address',
        emergencyContactNumber: '09876543210',
    },
    education: {
        elementarySchool: 'Central Elementary School',
        elemYearGraduated: '2016',
        secondarySchool: 'National High School',
        secondaryYearGraduated: '2022',
        collegiateSchool: 'Previous University (if transferee)',
    },
    academic: {
        studentId: '2022-0001',
        course: 'BS in Information Technology',
        yearLevel: '2nd Year',
        block: 'BSIT 2-A',
        status: 'Enrolled'
    }
};


const InfoField = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null;
    return (
        <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">{label}</Label>
            <p className="font-medium">{value}</p>
        </div>
    );
};


export default function StudentProfilePage() {
    const { toast } = useToast();
    
    // State for editable fields
    const [religion, setReligion] = useState(studentData.personal.religion);
    const [dialect, setDialect] = useState(studentData.personal.dialect);
    const [email, setEmail] = useState(studentData.contact.email);
    const [phoneNumber, setPhoneNumber] = useState(studentData.contact.phoneNumber);
    const [currentAddress, setCurrentAddress] = useState(studentData.address.currentAddress);
    const [permanentAddress, setPermanentAddress] = useState(studentData.address.permanentAddress);
    const [fathersName, setFathersName] = useState(studentData.family.fathersName);
    const [fathersOccupation, setFathersOccupation] = useState(studentData.family.fathersOccupation);
    const [mothersName, setMothersName] = useState(studentData.family.mothersName);
    const [mothersOccupation, setMothersOccupation] = useState(studentData.family.mothersOccupation);
    const [guardiansName, setGuardiansName] = useState(studentData.family.guardiansName);
    const [emergencyContactName, setEmergencyContactName] = useState(studentData.additional.emergencyContactName);
    const [emergencyContactAddress, setEmergencyContactAddress] = useState(studentData.additional.emergencyContactAddress);
    const [emergencyContactNumber, setEmergencyContactNumber] = useState(studentData.additional.emergencyContactNumber);
    

    const handleSaveChanges = (tab: string) => {
        toast({
            title: `${tab} Info Updated`,
            description: `Your ${tab.toLowerCase()} information has been successfully updated.`,
        });
    };

    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
                <p className="text-muted-foreground">
                    View and manage your personal, academic, and contact information.
                </p>
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                     <Card className="rounded-xl">
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <div className="relative mb-4">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src="https://picsum.photos/seed/student-avatar/128/128" alt="Student Name" data-ai-hint="person avatar"/>
                                    <AvatarFallback>SN</AvatarFallback>
                                </Avatar>
                                <Button variant="ghost" size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background hover:bg-muted">
                                    <Camera className="h-4 w-4" />
                                    <span className="sr-only">Change photo</span>
                                </Button>
                            </div>
                            <h2 className="text-xl font-semibold">{`${studentData.personal.firstName} ${studentData.personal.lastName}`}</h2>
                            <p className="text-sm text-muted-foreground">{studentData.academic.studentId}</p>
                            <p className="text-sm text-muted-foreground">{studentData.academic.course}</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>Academic Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <InfoField label="Student ID" value={studentData.academic.studentId} />
                            <InfoField label="Course" value={studentData.academic.course} />
                            <InfoField label="Year Level" value={studentData.academic.yearLevel} />
                            <InfoField label="Block" value={studentData.academic.block} />
                            <InfoField label="Status" value={studentData.academic.status} />
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Tabs defaultValue="personal" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 rounded-xl">
                            <TabsTrigger value="personal">Personal</TabsTrigger>
                            <TabsTrigger value="address">Address & Family</TabsTrigger>
                            <TabsTrigger value="additional">Additional</TabsTrigger>
                            <TabsTrigger value="education">Education</TabsTrigger>
                        </TabsList>

                        <TabsContent value="personal">
                            <Card className="rounded-xl mt-4">
                                <CardHeader>
                                    <CardTitle>Personal & Contact</CardTitle>
                                    <CardDescription>Your personal and contact details.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoField label="First Name" value={studentData.personal.firstName} />
                                        <InfoField label="Last Name" value={studentData.personal.lastName} />
                                        <InfoField label="Middle Name" value={studentData.personal.middleName} />
                                     </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoField label="Date of Birth" value={studentData.personal.birthdate} />
                                        <InfoField label="Sex" value={studentData.personal.sex} />
                                        <InfoField label="Civil Status" value={studentData.personal.civilStatus} />
                                        <InfoField label="Nationality" value={studentData.personal.nationality} />
                                    </div>
                                    <div className="border-t pt-4 space-y-4">
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             <div className="space-y-2">
                                                <Label htmlFor="religion">Religion</Label>
                                                <Input id="religion" value={religion} onChange={(e) => setReligion(e.target.value)} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="dialect">Dialect</Label>
                                                <Input id="dialect" value={dialect} onChange={(e) => setDialect(e.target.value)} className="rounded-xl" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="contact-number">Contact Number</Label>
                                            <Input id="contact-number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="rounded-xl" />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button onClick={() => handleSaveChanges('Personal')} className="rounded-xl">Save Personal Info</Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="address">
                             <Card className="rounded-xl mt-4">
                                <CardHeader>
                                    <CardTitle>Address & Family</CardTitle>
                                    <CardDescription>Your address and family background.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="current-address">Current Address</Label>
                                        <Input id="current-address" value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="permanent-address">Permanent Address</Label>
                                        <Input id="permanent-address" value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} className="rounded-xl" />
                                    </div>
                                    <div className="border-t pt-4 space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="fathers-name">Father's Name</Label>
                                            <Input id="fathers-name" value={fathersName} onChange={(e) => setFathersName(e.target.value)} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="fathers-occupation">Father's Occupation</Label>
                                            <Input id="fathers-occupation" value={fathersOccupation} onChange={(e) => setFathersOccupation(e.target.value)} className="rounded-xl" />
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="mothers-name">Mother's Name</Label>
                                            <Input id="mothers-name" value={mothersName} onChange={(e) => setMothersName(e.target.value)} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="mothers-occupation">Mother's Occupation</Label>
                                            <Input id="mothers-occupation" value={mothersOccupation} onChange={(e) => setMothersOccupation(e.target.value)} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="guardians-name">Guardian's Name</Label>
                                            <Input id="guardians-name" value={guardiansName} onChange={(e) => setGuardiansName(e.target.value)} className="rounded-xl" />
                                        </div>
                                    </div>
                                </CardContent>
                                 <CardFooter>
                                    <Button onClick={() => handleSaveChanges('Address & Family')} className="rounded-xl">Save Address & Family Info</Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>
                        
                         <TabsContent value="additional">
                             <Card className="rounded-xl mt-4">
                                <CardHeader>
                                    <CardTitle>Additional Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="emergency-contact">Emergency Contact Name</Label>
                                        <Input id="emergency-contact" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="emergency-address">Emergency Address</Label>
                                        <Input id="emergency-address" value={emergencyContactAddress} onChange={(e) => setEmergencyContactAddress(e.target.value)} className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="emergency-number">Emergency Number</Label>
                                        <Input id="emergency-number" value={emergencyContactNumber} onChange={(e) => setEmergencyContactNumber(e.target.value)} className="rounded-xl" />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                     <Button onClick={() => handleSaveChanges('Additional')} className="rounded-xl">Save Additional Info</Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>

                        <TabsContent value="education">
                             <Card className="rounded-xl mt-4">
                                <CardHeader>
                                    <CardTitle>Educational Background</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoField label="Elementary School" value={studentData.education.elementarySchool} />
                                        <InfoField label="Year Graduated" value={studentData.education.elemYearGraduated} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoField label="Secondary School" value={studentData.education.secondarySchool} />
                                        <InfoField label="Year Graduated" value={studentData.education.secondaryYearGraduated} />
                                    </div>
                                     <InfoField label="Collegiate School" value={studentData.education.collegiateSchool} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </main>
    );
}
