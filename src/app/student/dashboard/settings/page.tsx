'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useStudent } from '../../context/student-context';
import { Settings, User, Lock, Mail, Phone, Save, ShieldCheck, LogOut } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function StudentSettingsPage() {
    const { toast } = useToast();
    const { studentData, setStudentData } = useStudent();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [canSkipCurrentPassword, setCanSkipCurrentPassword] = useState(false);
    const [showPostUpdateNotice, setShowPostUpdateNotice] = useState(false);

    const apiBaseUrl = useMemo(() => {
        return (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
            .replace(/\/$/, '')
            .trim();
    }, []);

    const passwordEndpoint = useMemo(() => `${apiBaseUrl}/update_student_password.php`, [apiBaseUrl]);
    useEffect(() => {
        if (!studentData) {
            return;
        }

        setEmail(studentData.contact?.email ?? '');
        setContactNumber(studentData.contact?.phoneNumber ?? '');
    }, [studentData]);

    useEffect(() => {
        if (searchParams?.get('needsPasswordUpdate') === '1') {
            setCanSkipCurrentPassword(true);
        }
    }, [searchParams]);

    if (!studentData) {
        return null;
    }

    const { personal } = studentData;
    const displayName = [personal.firstName, personal.middleName, personal.lastName]
        .map((part) => (part ?? '').trim())
        .filter((part) => part.length > 0)
        .join(' ') || 'Student';

    const handleSaveChanges = () => {
        setStudentData((prev) => {
            if (!prev) {
                return prev;
            }

            return {
                ...prev,
                contact: {
                    ...prev.contact,
                    email,
                    phoneNumber: contactNumber,
                },
            };
        });

        toast({
            title: 'Profile Updated',
            description: 'Your contact information has been successfully updated.',
        });
    };

    const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!canSkipCurrentPassword && currentPassword.trim() === '') {
            toast({
                variant: 'destructive',
                title: 'Current Password Required',
                description: 'Enter your existing password before choosing a new one.',
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: "Passwords Don't Match",
                description: 'Please ensure your new password and confirmation match.',
            });
            return;
        }

        if (newPassword.length < 8) {
            toast({
                variant: 'destructive',
                title: 'Password Too Short',
                description: 'Your new password must be at least 8 characters long.',
            });
            return;
        }

        const accountEmail = (studentData.contact?.email ?? email ?? '').trim();
        if (accountEmail === '') {
            toast({
                variant: 'destructive',
                title: 'Email Missing',
                description: 'We could not determine your account email. Please refresh the page and try again.',
            });
            return;
        }

        const wasSkippingCurrentPassword = canSkipCurrentPassword;
        setPasswordSaving(true);

        try {
            const response = await fetch(passwordEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: accountEmail,
                    currentPassword,
                    newPassword,
                }),
            });

            let payload: unknown = null;
            try {
                payload = await response.json();
            } catch (parseError) {
                payload = null;
            }

            const message =
                payload && typeof payload === 'object' && payload !== null && 'message' in payload && typeof (payload as Record<string, unknown>).message === 'string'
                    ? String((payload as Record<string, unknown>).message)
                    : `Failed to update password (status ${response.status}).`;

            if (!response.ok || !payload || (payload as { status?: string }).status !== 'success') {
                throw new Error(message);
            }

            toast({
                title: 'Password Updated',
                description: 'Your password has been changed successfully.',
            });

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            if (canSkipCurrentPassword) {
                setCanSkipCurrentPassword(false);
            }
            setShowPostUpdateNotice(wasSkippingCurrentPassword);
        } catch (error) {
            const description = error instanceof Error ? error.message : 'Unable to update password. Please try again later.';
            toast({
                variant: 'destructive',
                title: 'Password Update Failed',
                description,
            });
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleLogout = () => {
        setStudentData(null);
        if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem('bsit_student_email');
        }
        router.push('/student-login');
    };

    return (
        <main className="flex-1 space-y-6 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <Settings className="h-6 w-6 text-blue-500" />
                </div>
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your profile, account settings, and preferences.
                    </p>
                </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="flex h-full flex-col rounded-2xl border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-sm">
                    <CardHeader className="border-b border-white/10 pb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-blue-500/10">
                                <User className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Basic Information</CardTitle>
                                <CardDescription>Update your contact details below.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="full-name" className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Full Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    id="full-name" 
                                    value={displayName} 
                                    readOnly 
                                    className="pl-9 rounded-xl border-white/10 bg-white/5 text-muted-foreground" 
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    className="pl-9 rounded-xl border-white/10 bg-white/5 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact-number" className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Contact Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="contact-number"
                                    value={contactNumber}
                                    onChange={(event) => setContactNumber(event.target.value)}
                                    className="pl-9 rounded-xl border-white/10 bg-white/5 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="mt-auto p-6">
                        <Button 
                            onClick={handleSaveChanges} 
                            className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="flex h-full flex-col rounded-2xl border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-sm">
                    <form onSubmit={handlePasswordChange} className="flex h-full flex-col">
                        <CardHeader className="border-b border-white/10 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-purple-500/10">
                                    <ShieldCheck className="h-4 w-4 text-purple-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Change Password</CardTitle>
                                    <CardDescription>Set a new password for your student account.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4 pt-6">
                            {canSkipCurrentPassword && (
                                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                                    You signed in using a temporary password. You can leave the current password field blank once to set a permanent password.
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="current-password" className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Current Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="current-password"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(event) => setCurrentPassword(event.target.value)}
                                        className="pl-9 rounded-xl border-white/10 bg-white/5 focus:border-purple-500/50 focus:ring-purple-500/20 transition-all"
                                        required={!canSkipCurrentPassword}
                                        disabled={passwordSaving}
                                        placeholder={canSkipCurrentPassword ? 'Leave blank if you only have a temporary password' : undefined}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-password" className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(event) => setNewPassword(event.target.value)}
                                        className="pl-9 rounded-xl border-white/10 bg-white/5 focus:border-purple-500/50 focus:ring-purple-500/20 transition-all"
                                        required
                                        disabled={passwordSaving}
                                        minLength={8}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password" className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Confirm New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        className="pl-9 rounded-xl border-white/10 bg-white/5 focus:border-purple-500/50 focus:ring-purple-500/20 transition-all"
                                        required
                                        disabled={passwordSaving}
                                        minLength={8}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="mt-auto p-6">
                            <Button 
                                type="submit" 
                                className="w-full sm:w-auto rounded-xl bg-purple-600 hover:bg-purple-700 text-white" 
                                disabled={passwordSaving}
                            >
                                {passwordSaving ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Updating...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4" />
                                        Change Password
                                    </span>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>

            {showPostUpdateNotice && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-lg font-semibold text-emerald-100">Log out to finish securing your account</p>
                        <p className="text-sm text-emerald-200 mt-1">
                            Your password is now updated. Please log out and sign in again using the new password so we can refresh your session.
                        </p>
                    </div>
                    <Button
                        type="button"
                        className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout Now
                    </Button>
                </div>
            )}
        </main>
    );
}
