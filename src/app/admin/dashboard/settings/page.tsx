
'use client';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Settings as SettingsIcon, Eye, EyeOff } from 'lucide-react';
import { useAdmin } from '../../context/admin-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const InfoField = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null;
    return (
        <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">{label}</Label>
            <p className="font-medium">{value}</p>
        </div>
    );
};


export default function AdminSettingsPage() {
    const { toast } = useToast();
    const { adminData, setAdminData } = useAdmin();
    const { currentUser, academicYear, semester, academicYearOptions, semesterOptions } = adminData;

    const [editableData, setEditableData] = React.useState({
        name: '',
        email: '',
    });
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [currentAcademicYear, setCurrentAcademicYear] = useState(academicYear);
    const [currentSemester, setCurrentSemester] = useState(semester);

    useEffect(() => {
        if (currentUser) {
            setEditableData({
                name: currentUser.name,
                email: currentUser.email,
            });
        }
    }, [currentUser]);

    useEffect(() => {
        setCurrentAcademicYear(academicYear);
        setCurrentSemester(semester);
    }, [academicYear, semester]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setEditableData(prev => ({ ...prev, [id]: value }));
    }

    const handleSaveChanges = () => {
        if (!currentUser) return;
        setAdminData(prev => ({
            ...prev,
            adminUsers: prev.adminUsers.map(user => 
                user.id === currentUser.id 
                ? { ...user, name: editableData.name, email: editableData.email }
                : user
            ),
            currentUser: { ...currentUser, name: editableData.name, email: editableData.email }
        }));

        toast({
            title: `Profile Info Updated`,
            description: `Your profile information has been successfully updated.`,
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
        
        // In a real app, you'd have an API call here.
        
        toast({
            title: "Password Changed",
            description: "Your password has been successfully updated.",
        });

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    const handleSystemSettingsSave = () => {
        setAdminData(prev => ({
            ...prev,
            academicYear: currentAcademicYear,
            semester: currentSemester,
        }));
        toast({
            title: "System Settings Saved",
            description: `The academic term has been set to ${currentAcademicYear}, ${semesterOptions.find(s=>s.value === currentSemester)?.label}.`,
        });
    }

    if (!currentUser) {
        return <div>Loading...</div>;
    }

    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your profile and account settings.
                </p>
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                     <Card className="rounded-xl">
                        <CardContent className="pt-6 flex flex-col items-center text-center">
                            <div className="relative mb-4">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} data-ai-hint="person avatar"/>
                                    <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <Button variant="ghost" size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background hover:bg-muted">
                                    <Camera className="h-4 w-4" />
                                    <span className="sr-only">Change photo</span>
                                </Button>
                            </div>
                            <h2 className="text-xl font-semibold">{editableData.name}</h2>
                            <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                            <p className="text-sm text-muted-foreground">{currentUser.role}</p>
                        </CardContent>
                    </Card>
                    {currentUser.role === 'Super Admin' && (
                        <Card className="rounded-xl">
                            <CardHeader>
                                <CardTitle>System Settings</CardTitle>
                                <CardDescription>Manage global settings for the application.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="academic-year">Academic Year</Label>
                                    <Select value={currentAcademicYear} onValueChange={setCurrentAcademicYear}>
                                        <SelectTrigger id="academic-year" className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {academicYearOptions.map(year => (
                                                <SelectItem key={year} value={year}>{year}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="semester">Semester</Label>
                                    <Select value={currentSemester} onValueChange={setCurrentSemester}>
                                        <SelectTrigger id="semester" className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {semesterOptions.map(sem => (
                                                <SelectItem key={sem.value} value={sem.value}>{sem.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button onClick={handleSystemSettingsSave} className="rounded-xl w-full">Save System Settings</Button>
                            </CardFooter>
                        </Card>
                    )}
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
                                        Update your personal details here.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input id="name" value={editableData.name} onChange={handleInputChange} className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" type="email" value={editableData.email} onChange={handleInputChange} className="rounded-xl" />
                                    </div>
                                    <InfoField label="Role" value={currentUser.role} />
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
                                        <div className="relative space-y-1">
                                            <Label htmlFor="current-password">Current Password</Label>
                                            <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="rounded-xl pr-10" />
                                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowCurrentPassword(prev => !prev)}>
                                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                        <div className="relative space-y-1">
                                            <Label htmlFor="new-password">New Password</Label>
                                            <Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="rounded-xl pr-10" />
                                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowNewPassword(prev => !prev)}>
                                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                         <div className="relative space-y-1">
                                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                                            <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="rounded-xl pr-10" />
                                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-6 h-7 w-7" onClick={() => setShowConfirmPassword(prev => !prev)}>
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
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
