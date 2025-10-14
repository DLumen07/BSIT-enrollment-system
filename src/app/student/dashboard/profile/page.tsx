
'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { useStudent } from '@/app/student/context/student-context';


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
    const { studentData, setStudentData } = useStudent();
    
    // Create a temporary state for editing
    const [editableData, setEditableData] = React.useState({
        religion: studentData.personal.religion,
        dialect: studentData.personal.dialect,
        email: studentData.contact.email,
        phoneNumber: studentData.contact.phoneNumber,
        currentAddress: studentData.address.currentAddress,
        permanentAddress: studentData.address.permanentAddress,
        fathersName: studentData.family.fathersName,
        fathersOccupation: studentData.family.fathersOccupation,
        mothersName: studentData.family.mothersName,
        mothersOccupation: studentData.family.mothersOccupation,
        guardiansName: studentData.family.guardiansName,
        emergencyContactName: studentData.additional.emergencyContactName,
        emergencyContactAddress: studentData.additional.emergencyContactAddress,
        emergencyContactNumber: studentData.additional.emergencyContactNumber,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setEditableData(prev => ({ ...prev, [id]: value }));
    }

    const handleSaveChanges = (tab: string) => {
        // In a real app, you'd send this to your backend.
        // For now, we update the context state.
        setStudentData(prev => ({
            ...prev,
            personal: {
                ...prev.personal,
                religion: editableData.religion,
                dialect: editableData.dialect,
            },
            contact: {
                ...prev.contact,
                email: editableData.email,
                phoneNumber: editableData.phoneNumber,
            },
            address: {
                ...prev.address,
                currentAddress: editableData.currentAddress,
                permanentAddress: editableData.permanentAddress,
            },
            family: {
                ...prev.family,
                fathersName: editableData.fathersName,
                fathersOccupation: editableData.fathersOccupation,
                mothersName: editableData.mothersName,
                mothersOccupation: editableData.mothersOccupation,
                guardiansName: editableData.guardiansName,
            },
            additional: {
                 ...prev.additional,
                 emergencyContactName: editableData.emergencyContactName,
                 emergencyContactAddress: editableData.emergencyContactAddress,
                 emergencyContactNumber: editableData.emergencyContactNumber,
            }
        }));

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
                                                <Input id="religion" value={editableData.religion} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="dialect">Dialect</Label>
                                                <Input id="dialect" value={editableData.dialect} onChange={handleInputChange} className="rounded-xl" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input id="email" value={editableData.email} onChange={handleInputChange} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phoneNumber">Contact Number</Label>
                                            <Input id="phoneNumber" value={editableData.phoneNumber} onChange={handleInputChange} className="rounded-xl" />
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
                                        <Label htmlFor="currentAddress">Current Address</Label>
                                        <Input id="currentAddress" value={editableData.currentAddress} onChange={handleInputChange} className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="permanentAddress">Permanent Address</Label>
                                        <Input id="permanentAddress" value={editableData.permanentAddress} onChange={handleInputChange} className="rounded-xl" />
                                    </div>
                                    <div className="border-t pt-4 space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="fathersName">Father's Name</Label>
                                            <Input id="fathersName" value={editableData.fathersName} onChange={handleInputChange} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="fathersOccupation">Father's Occupation</Label>
                                            <Input id="fathersOccupation" value={editableData.fathersOccupation} onChange={handleInputChange} className="rounded-xl" />
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="mothersName">Mother's Name</Label>
                                            <Input id="mothersName" value={editableData.mothersName} onChange={handleInputChange} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="mothersOccupation">Mother's Occupation</Label>
                                            <Input id="mothersOccupation" value={editableData.mothersOccupation} onChange={handleInputChange} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="guardiansName">Guardian's Name</Label>
                                            <Input id="guardiansName" value={editableData.guardiansName} onChange={handleInputChange} className="rounded-xl" />
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
                                        <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                                        <Input id="emergencyContactName" value={editableData.emergencyContactName} onChange={handleInputChange} className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="emergencyContactAddress">Emergency Address</Label>
                                        <Input id="emergencyContactAddress" value={editableData.emergencyContactAddress} onChange={handleInputChange} className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="emergencyContactNumber">Emergency Number</Label>
                                        <Input id="emergencyContactNumber" value={editableData.emergencyContactNumber} onChange={handleInputChange} className="rounded-xl" />
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
