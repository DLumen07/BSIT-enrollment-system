'use client';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FormEvent, useMemo, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/app/admin/context/admin-context';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function StudentSignupPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [studentIdNumber, setStudentIdNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showReturningDialog, setShowReturningDialog] = useState(true);
    const [returningDialogStep, setReturningDialogStep] = useState<'prompt' | 'lookup'>('prompt');
    const [lookupStudentId, setLookupStudentId] = useState('');
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [isCheckingStudentId, setIsCheckingStudentId] = useState(false);
    const [isReturningStudentFlow, setIsReturningStudentFlow] = useState(false);
    const [returningStudentName, setReturningStudentName] = useState<string | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const { refreshAdminData } = useAdmin();

    const apiBaseUrl = useMemo(() => {
        return (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
            .replace(/\/$/, '')
            .trim();
    }, []);

    const buildApiUrl = useMemo(() => {
        return (endpoint: string) => `${apiBaseUrl}/${endpoint.replace(/^\//, '')}`;
    }, [apiBaseUrl]);

    const resetForm = () => {
        setFullName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setStudentIdNumber('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setIsReturningStudentFlow(false);
        setReturningStudentName(null);
    };

    useEffect(() => {
        setShowReturningDialog(true);
    }, []);

    const closeReturningDialog = () => {
        setShowReturningDialog(false);
        setReturningDialogStep('prompt');
        setLookupStudentId('');
        setLookupError(null);
    };

    const handleLookupSubmit = async () => {
        const trimmedLookup = lookupStudentId.trim();
        if (!trimmedLookup) {
            setLookupError('Please enter your Student ID.');
            return;
        }

        setIsCheckingStudentId(true);
        setLookupError(null);

        try {
            const response = await fetch(buildApiUrl('student_lookup.php'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ studentIdNumber: trimmedLookup }),
            });

            const result = await response.json().catch(() => null);

            if (!response.ok || !result || result.status !== 'success') {
                const message = result?.message ?? 'Student ID not found.';
                throw new Error(message);
            }

            const profile = result.data ?? {};
            const foundStudentId: string = profile.studentIdNumber ?? trimmedLookup.toUpperCase();
            const foundName: string = profile.name ?? '';

            setIsReturningStudentFlow(true);
            setStudentIdNumber(foundStudentId);
            setFullName(foundName);
            setReturningStudentName(foundName || null);
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            closeReturningDialog();
            toast({
                title: 'Student found',
                description: `We matched your records for ${foundStudentId}. Please update your email and password to continue.`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to look up that Student ID right now.';
            setLookupError(message);
        } finally {
            setIsCheckingStudentId(false);
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        const trimmedName = fullName.trim();
        const trimmedEmail = email.trim();

        if (!trimmedName || !trimmedEmail) {
            toast({
                variant: 'destructive',
                title: 'Missing information',
                description: 'Please provide both your full name and email address.',
            });
            return;
        }

        if (password.length < 8) {
            toast({
                variant: 'destructive',
                title: 'Weak password',
                description: 'Password must be at least 8 characters long.',
            });
            return;
        }

        if (password !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Passwords do not match',
                description: 'Make sure the password and confirmation match exactly.',
            });
            return;
        }

        const trimmedStudentId = studentIdNumber.trim();

        setIsSubmitting(true);
        try {
            const payloadBody: Record<string, unknown> = {
                fullName: trimmedName,
                email: trimmedEmail,
                password,
                confirmPassword,
            };

            if (trimmedStudentId) {
                payloadBody.studentIdNumber = trimmedStudentId;
            }

            const response = await fetch(buildApiUrl('student_signup.php'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payloadBody),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok || !payload || payload.status !== 'success') {
                const message = payload?.message ?? `Signup failed with status ${response.status}.`;
                throw new Error(message);
            }

            const assignedStudentId: string | undefined = payload.data?.studentIdNumber;
            const isReturning: boolean | undefined = payload.data?.isReturning;

            resetForm();
            await refreshAdminData();

            toast({
                title: isReturning ? 'Welcome back' : 'Account created',
                description: assignedStudentId
                    ? `Your student account is ready. Your Student ID is ${assignedStudentId}.`
                    : 'Your student account is ready. You can log in now.',
            });

            const successUrl = assignedStudentId
                ? `/student-login?signup=success&studentId=${encodeURIComponent(assignedStudentId)}`
                : '/student-login?signup=success';
            router.push(successUrl);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Signup failed',
                description: error instanceof Error ? error.message : 'Something went wrong while creating your account.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={cn(
            "dark",
            "flex flex-col min-h-screen bg-background",
            "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.3),hsl(var(--background)))]",
        )}>
            <main className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md relative">
                    <Button asChild variant="ghost" size="icon" className="absolute top-4 left-4">
                        <Link href="/student-login">
                            <ArrowLeft />
                            <span className="sr-only">Back to Login</span>
                        </Link>
                    </Button>
                    <Card className="shadow-[0_8px_16px_-4px_hsl(var(--primary)/0.3),0_-8px_16px_-4px_hsl(var(--accent)/0.3)] rounded-2xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Create Student Account</CardTitle>
                            <CardDescription>
                                Fill out the form below to create your account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                {isReturningStudentFlow && returningStudentName && (
                                    <p className="text-xs text-muted-foreground text-left">Welcome back, {returningStudentName}. Confirm your details below to reactivate your account.</p>
                                )}
                                <div className="space-y-2 text-left">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        type="text"
                                        placeholder="Juan Dela Cruz"
                                        required
                                        className="rounded-xl"
                                        value={fullName}
                                        onChange={(event) => setFullName(event.target.value)}
                                        readOnly={isReturningStudentFlow}
                                        aria-readonly={isReturningStudentFlow}
                                    />
                                </div>
                                <div className="space-y-2 text-left">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="student@example.com"
                                        required
                                        className="rounded-xl"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                    />
                                </div>
                                {isReturningStudentFlow && (
                                    <input type="hidden" name="studentIdNumber" value={studentIdNumber} />
                                )}
                                <div className="space-y-2 text-left">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative group">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            className="rounded-xl pr-10"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2 text-left">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <div className="relative group">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            required
                                            className="rounded-xl pr-10"
                                            value={confirmPassword}
                                            onChange={(event) => setConfirmPassword(event.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <Button type="submit" className="w-full rounded-xl" disabled={isSubmitting}>
                                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <footer className="py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
                <p className="text-xs text-muted-foreground text-center">
                    &copy; BUMBBLEBITTECH | All rights reserved.
                </p>
            </footer>
            <Dialog open={showReturningDialog} onOpenChange={(open) => {
                if (!open) {
                    closeReturningDialog();
                } else {
                    setShowReturningDialog(true);
                }
            }}>
                <DialogContent className="sm:max-w-md">
                    {returningDialogStep === 'prompt' ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>Are you an existing student?</DialogTitle>
                                <DialogDescription>Answering this helps us locate your records and speed up the signup process.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-3 pt-2">
                                <Button onClick={() => {
                                    setReturningDialogStep('lookup');
                                    setLookupStudentId('');
                                    setLookupError(null);
                                }}>
                                    Yes, I have a Student ID
                                </Button>
                                <Button variant="outline" onClick={() => {
                                    setIsReturningStudentFlow(false);
                                    closeReturningDialog();
                                }}>
                                    No, I&apos;m a new student
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle>Enter your Student ID</DialogTitle>
                                <DialogDescription>We&apos;ll check if your ID already exists in our system.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2">
                                <Label htmlFor="lookupStudentId">Student ID</Label>
                                <Input
                                    id="lookupStudentId"
                                    type="text"
                                    placeholder="24-00-0001"
                                    value={lookupStudentId}
                                    onChange={(event) => setLookupStudentId(event.target.value)}
                                    autoComplete="off"
                                />
                                {lookupError && (
                                    <p className="text-sm text-destructive">{lookupError}</p>
                                )}
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => {
                                        setReturningDialogStep('prompt');
                                        setLookupStudentId('');
                                        setLookupError(null);
                                    }}
                                >
                                    Back
                                </Button>
                                <Button type="button" onClick={handleLookupSubmit} disabled={isCheckingStudentId}>
                                    {isCheckingStudentId ? 'Checking...' : 'Continue'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
