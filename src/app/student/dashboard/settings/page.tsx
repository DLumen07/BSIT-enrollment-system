
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
    academic: {
        studentId: '22-01-0001',
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


export default function StudentSettingsPage() {
    const { toast } = useToast();
    const [email, setEmail] = useState(studentData.contact.email);
    const [contactNumber, setContactNumber] = useState(studentData.contact.phoneNumber);
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');


    const handleSaveChanges = () => {
        toast({
            title: "Profile Updated",
            description: "Your contact information has been successfully updated.",
        });
    };
    
    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: "Passwords Don't Match",
                description: "Please ensure your new password and confirmation match.",
            });
            return;
        }
        if (newPassword.length < 8) {
            toast({
                variant: 'destructive',
                title: "Password Too Short",
                description: "Your new password must be at least 8 characters long.",
            });
            return;
        }
        
        toast({
            title: "Password Changed",
            description: "Your password has been successfully updated.",
        });

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your profile, account settings, and preferences.
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
                </div>
                <div className="lg:col-span-2">
                    <Tabs defaultValue="profile" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="profile">Profile</TabsTrigger>
                            <TabsTrigger value="password">Password</TabsTrigger>
                        </TabsList>
                        <TabsContent value="profile">
                            <Card className="rounded-xl mt-4">
                                <CardHeader>
                                    <CardTitle>Personal Information</CardTitle>
                                    <CardDescription>
                                        Some of this information can only be changed by the registrar's office.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoField label="First Name" value={studentData.personal.firstName} />
                                        <InfoField label="Last Name" value={studentData.personal.lastName} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InfoField label="Date of Birth" value={studentData.personal.birthdate} />
                                        <InfoField label="Sex" value={studentData.personal.sex} />
                                    </div>
                                    <div className="border-t pt-4 space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="contact-number">Contact Number</Label>
                                            <Input id="contact-number" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="rounded-xl" />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button onClick={handleSaveChanges} className="rounded-xl">Save Changes</Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>
                        <TabsContent value="password">
                            <Card className="rounded-xl mt-4">
                                <form onSubmit={handlePasswordChange}>
                                    <CardHeader>
                                        <CardTitle>Change Password</CardTitle>
                                        <CardDescription>
                                            For security, please choose a strong password.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-1">
                                            <Label htmlFor="current-password">Current Password</Label>
                                            <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="rounded-xl" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="new-password">New Password</Label>
                                            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="rounded-xl" />
                                        </div>
                                         <div className="space-y-1">
                                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                                            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="rounded-xl" />
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button type="submit" className="rounded-xl">Change Password</Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </main>
    );
}
