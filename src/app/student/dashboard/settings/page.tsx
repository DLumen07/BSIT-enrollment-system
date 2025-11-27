'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useStudent } from '../../context/student-context';

export default function StudentSettingsPage() {
    const { toast } = useToast();
    const { studentData, setStudentData } = useStudent();

    const [email, setEmail] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);

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

    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your profile, account settings, and preferences.
                </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="flex h-full flex-col rounded-xl">
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>Update your contact details below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="full-name">Full Name</Label>
                            <Input id="full-name" value={displayName} readOnly className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact-number">Contact Number</Label>
                            <Input
                                id="contact-number"
                                value={contactNumber}
                                onChange={(event) => setContactNumber(event.target.value)}
                                className="rounded-xl"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveChanges} className="rounded-xl">
                            Save Changes
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="flex h-full flex-col rounded-xl">
                    <form onSubmit={handlePasswordChange} className="flex h-full flex-col">
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>Set a new password for your student account.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current-password">Current Password</Label>
                                <Input
                                    id="current-password"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(event) => setCurrentPassword(event.target.value)}
                                    className="rounded-xl"
                                    required
                                    disabled={passwordSaving}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                    className="rounded-xl"
                                    required
                                    disabled={passwordSaving}
                                    minLength={8}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    className="rounded-xl"
                                    required
                                    disabled={passwordSaving}
                                    minLength={8}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="rounded-xl" disabled={passwordSaving}>
                                {passwordSaving ? 'Updating Password…' : 'Change Password'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </main>
    );
}
