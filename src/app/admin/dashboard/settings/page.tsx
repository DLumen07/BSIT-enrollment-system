
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Eye, EyeOff, Calendar as CalendarIcon } from 'lucide-react';
import { useAdmin } from '../../context/admin-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';


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
    const { adminData, setAdminData, refreshAdminData } = useAdmin();
    const { currentUser, academicYear, semester, enrollmentStartDate, enrollmentEndDate, academicYearOptions, semesterOptions } = adminData;

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
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    
    const [currentAcademicYear, setCurrentAcademicYear] = useState(academicYear);
    const [currentSemester, setCurrentSemester] = useState(semester);

    const [startDate, setStartDate] = useState<Date | undefined>(enrollmentStartDate);
    const [endDate, setEndDate] = useState<Date | undefined>(enrollmentEndDate);

    const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
        .replace(/\/$/, '')
        .trim();

    const buildApiUrl = useCallback(
        (endpoint: string) => `${API_BASE_URL}/${endpoint.replace(/^\//, '')}`,
        [API_BASE_URL],
    );

    const callAdminApi = useCallback(
        async (endpoint: string, payload: Record<string, unknown>) => {
            const response = await fetch(buildApiUrl(endpoint), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            let data: any = null;
            try {
                data = await response.json();
            } catch (error) {
                // Ignore JSON parse issues; rely on status code + default message.
            }

            if (!response.ok) {
                const message = data?.message ?? `Request failed with status ${response.status}`;
                throw new Error(message);
            }

            if (!data || data.status !== 'success') {
                throw new Error(data?.message ?? 'Server returned an error status.');
            }

            return data;
        },
        [buildApiUrl],
    );

    useEffect(() => {
        if (currentUser) {
            setEditableData({
                name: currentUser.name,
                email: currentUser.email,
            });
        }
        setCurrentAcademicYear(academicYear);
        setCurrentSemester(semester);
        setStartDate(enrollmentStartDate);
        setEndDate(enrollmentEndDate);
    }, [currentUser, academicYear, semester, enrollmentStartDate, enrollmentEndDate]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setEditableData(prev => ({ ...prev, [id]: value }));
    }

    const handleSaveAll = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!currentUser || isSaving) {
            return;
        }

        const trimmedName = editableData.name.trim();
        const trimmedEmail = editableData.email.trim().toLowerCase();

        if (trimmedName === '' || trimmedEmail === '') {
            toast({
                variant: 'destructive',
                title: 'Missing information',
                description: 'Please provide both name and email before saving.',
            });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            toast({
                variant: 'destructive',
                title: 'Invalid Email',
                description: 'Please provide a valid email address.',
            });
            return;
        }

        if (startDate && endDate && startDate > endDate) {
            toast({ variant: 'destructive', title: 'Invalid Date Range', description: 'General enrollment start date cannot be after the end date.' });
            return;
        }

        setIsSaving(true);

        try {
            await callAdminApi('update_admin.php', {
                userId: currentUser.id,
                name: trimmedName,
                email: trimmedEmail,
                role: currentUser.role,
                avatar: currentUser.avatar ?? '',
            });

            const refreshed = await refreshAdminData();
            const updatedUser = refreshed.adminUsers.find((user) => user.id === currentUser.id) ?? {
                id: currentUser.id,
                name: trimmedName,
                email: trimmedEmail,
                role: currentUser.role,
                avatar: currentUser.avatar ?? '',
            };

            sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

            setAdminData(prev => ({
                ...prev,
                currentUser: updatedUser,
                adminUsers: prev.adminUsers.map(user => (user.id === updatedUser.id ? updatedUser : user)),
                academicYear: currentAcademicYear,
                semester: currentSemester,
                enrollmentStartDate: startDate ?? prev.enrollmentStartDate,
                enrollmentEndDate: endDate ?? prev.enrollmentEndDate,
            }));

            setEditableData({ name: updatedUser.name, email: updatedUser.email });

            toast({
                title: 'Settings Updated',
                description: 'Personal information saved successfully.',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update administrator profile.';
            toast({
                variant: 'destructive',
                title: 'Save failed',
                description: message,
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handlePasswordChange = async () => {
        if (!currentUser || isChangingPassword) {
            return;
        }

        if (currentPassword.trim() === '') {
            toast({
                variant: 'destructive',
                title: 'Current Password Required',
                description: 'Please enter your current password before changing it.',
            });
            return;
        }

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
            return;
        }

        setIsChangingPassword(true);

        const trimmedName = editableData.name.trim() || currentUser.name;
        const trimmedEmail = editableData.email.trim().toLowerCase() || currentUser.email;

        try {
            await callAdminApi('update_admin.php', {
                userId: currentUser.id,
                name: trimmedName,
                email: trimmedEmail,
                role: currentUser.role,
                password: newPassword,
                avatar: currentUser.avatar ?? '',
            });

            const refreshed = await refreshAdminData();
            const updatedUser = refreshed.adminUsers.find((user) => user.id === currentUser.id) ?? {
                id: currentUser.id,
                name: trimmedName,
                email: trimmedEmail,
                role: currentUser.role,
                avatar: currentUser.avatar ?? '',
            };

            sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

            setAdminData(prev => ({
                ...prev,
                currentUser: updatedUser,
                adminUsers: prev.adminUsers.map(user => (user.id === updatedUser.id ? updatedUser : user)),
            }));

            toast({
                title: 'Password Changed',
                description: 'Your password has been successfully updated.',
            });

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update password.';
            toast({
                variant: 'destructive',
                title: 'Password update failed',
                description: message,
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

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
            <form onSubmit={handleSaveAll}>
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
                    </div>
                    <div className="lg:col-span-2">
                        <Tabs defaultValue="profile" className="w-full space-y-4">
                            <TabsList className="grid w-full grid-cols-2 rounded-xl">
                                <TabsTrigger value="profile">Profile</TabsTrigger>
                                <TabsTrigger value="password">Password</TabsTrigger>
                            </TabsList>

                            <TabsContent value="profile">
                                <Card className="rounded-xl h-full">
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
                                </Card>
                            </TabsContent>
                            <TabsContent value="password">
                                <Card className="rounded-xl h-full">
                                    <CardHeader>
                                        <CardTitle>Change Password</CardTitle>
                                        <CardDescription>
                                            For security, please choose a strong password.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="current-password">Current Password</Label>
                                            <div className="relative group">
                                                <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="rounded-xl pr-10" />
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowCurrentPassword(prev => !prev)}>
                                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new-password">New Password</Label>
                                            <div className="relative group">
                                                <Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="rounded-xl pr-10" />
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowNewPassword(prev => !prev)}>
                                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                                            <div className="relative group">
                                                <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="rounded-xl pr-10" />
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowConfirmPassword(prev => !prev)}>
                                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button type="button" onClick={handlePasswordChange} className="rounded-xl" disabled={isChangingPassword}>
                                            {isChangingPassword ? 'Changing...' : 'Change Password'}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </TabsContent>
                        </Tabs>
                        {currentUser.role === 'Super Admin' && (
                            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                                <Card className="rounded-xl">
                                    <CardHeader>
                                        <CardTitle>System Settings</CardTitle>
                                        <CardDescription>Manage global settings for the application.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="academic-year">Academic Year</Label>
                                                <Select value={currentAcademicYear} onValueChange={setCurrentAcademicYear}>
                                                    <SelectTrigger id="academic-year" className="rounded-xl">
                                                        <SelectValue placeholder="Select academic year" />
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
                                                        <SelectValue placeholder="Select semester" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {semesterOptions.map(sem => (
                                                            <SelectItem key={sem.value} value={sem.value}>{sem.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-xl">
                                    <CardHeader>
                                        <CardTitle>General Enrollment Schedule</CardTitle>
                                        <CardDescription>Set the main start and end dates for enrollment.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Start Date</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal rounded-xl",
                                                                !startDate && "text-muted-foreground",
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                                                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>End Date</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal rounded-xl",
                                                                !endDate && "text-muted-foreground",
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                                                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                        <div className="flex justify-end mt-6">
                            <Button type="submit" className="rounded-xl w-full lg:w-auto" disabled={isSaving}>
                                {isSaving
                                    ? 'Saving...'
                                    : currentUser.role === 'Super Admin'
                                        ? 'Save All Changes'
                                        : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </main>
    );
}
