'use client';

import { ArrowLeft, Eye, EyeOff, User, Mail, Lock, IdCard, UserPlus, Copyright } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { BSITBackground } from '@/components/bsit-background';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';

type ReturningLookupResult = {
    studentIdNumber: string;
    name: string | null;
    email: string;
    temporaryPassword: string;
};

export default function StudentSignupPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showReturningDialog, setShowReturningDialog] = useState(true);
    const [returningDialogStep, setReturningDialogStep] = useState<'prompt' | 'lookup' | 'result'>('prompt');
    const [lookupStudentId, setLookupStudentId] = useState('');
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [isCheckingStudentId, setIsCheckingStudentId] = useState(false);
    const [lookupResult, setLookupResult] = useState<ReturningLookupResult | null>(null);
    const { toast } = useToast();
    const router = useRouter();
    const { refreshAdminData } = useAdmin();
    const [isClient, setIsClient] = useState(false);

    // 3D Tilt Logic
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    };

    const apiBaseUrl = useMemo(() => {
        return (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
            .replace(/\/$/, '')
            .trim();
    }, []);

    const buildApiUrl = useMemo(() => {
        return (endpoint: string) => `${apiBaseUrl}/${endpoint.replace(/^\//, '')}`;
    }, [apiBaseUrl]);

    const resetForm = () => {
        setFirstName('');
        setMiddleName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    useEffect(() => {
        setIsClient(true);
        setShowReturningDialog(true);
    }, []);

    const closeReturningDialog = () => {
        setShowReturningDialog(false);
        setReturningDialogStep('prompt');
        setLookupStudentId('');
        setLookupError(null);
        setLookupResult(null);
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
            const registeredEmail: string = profile.email ?? '';
            const temporaryPassword: string = profile.temporaryPassword ?? '';

            if (!registeredEmail) {
                throw new Error('We found your student record, but no email is on file. Please contact the registrar.');
            }

            if (!temporaryPassword) {
                throw new Error('We were unable to generate a temporary password. Please contact the registrar.');
            }

            setLookupResult({
                studentIdNumber: foundStudentId,
                name: profile.name ?? null,
                email: registeredEmail,
                temporaryPassword,
            });
            setLookupStudentId('');
            setLookupError(null);
            setReturningDialogStep('result');
            toast({
                title: 'Account located',
                description: `Use the Student Login page with ${registeredEmail} and the temporary password we provided.`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to look up that Student ID right now.';
            setLookupError(message);
        } finally {
            setIsCheckingStudentId(false);
        }
    };

    const handleRedirectToLogin = () => {
        closeReturningDialog();
        router.push('/student-login?mode=temp');
    };

    const handleRedirectToForgotPassword = () => {
        closeReturningDialog();
        router.push('/student-login?mode=forgot');
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isSubmitting) {
            return;
        }

        const trimmedFirstName = firstName.trim();
        const trimmedMiddleName = middleName.trim();
        const trimmedLastName = lastName.trim();
        const trimmedEmail = email.trim();

        if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
            toast({
                variant: 'destructive',
                title: 'Missing information',
                description: 'Please provide your first name, last name, and email address.',
            });
            return;
        }

        const nameSegments: string[] = [];
        const appendSegment = (value: string) => {
            const normalized = value.replace(/\s+/g, ' ').trim();
            if (!normalized) {
                return;
            }
            const alreadyListed = nameSegments.some((segment) =>
                segment.localeCompare(normalized, undefined, { sensitivity: 'accent' }) === 0
            );
            if (!alreadyListed) {
                nameSegments.push(normalized);
            }
        };

        appendSegment(trimmedFirstName);
        appendSegment(trimmedMiddleName);
        appendSegment(trimmedLastName);

        const normalizedFullName = nameSegments.join(' ');

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

        setIsSubmitting(true);
        try {
            const payloadBody: Record<string, unknown> = {
                firstName: trimmedFirstName,
                middleName: trimmedMiddleName,
                lastName: trimmedLastName,
                fullName: normalizedFullName,
                email: trimmedEmail,
                password,
                confirmPassword,
            };

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
        <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-orange-500/30">
            <BSITBackground />

            <main className="container relative z-10 px-4 flex flex-col items-center justify-center py-10">
                <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="relative group perspective-[1000px] w-full max-w-5xl"
                    onMouseMove={handleMouseMove}
                >
                    {/* Gradient Border */}
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-900 via-orange-500 to-white rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-500" />
                    
                    <div className="relative w-full bg-[#0B1121]/90 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl p-8 md:p-10">
                        
                        {/* Back Button (Inside Card) */}
                        <Link 
                            href="/student-login" 
                            className="absolute top-6 left-6 z-20 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-medium group/back"
                        >
                            <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover/back:bg-white/10 transition-all">
                                <ArrowLeft className="w-4 h-4" />
                            </div>
                        </Link>

                        {/* Tech Grid Pattern Reveal */}
                        <motion.div
                            className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-40"
                            style={{
                                backgroundImage: 'radial-gradient(rgba(59, 130, 246, 0.15) 1px, transparent 1px)',
                                backgroundSize: '24px 24px',
                                maskImage: useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, black, transparent)`,
                                WebkitMaskImage: useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, black, transparent)`,
                            }}
                        />

                        {/* Spotlight */}
                        <motion.div
                            className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-500 group-hover:opacity-100"
                            style={{
                                background: useMotionTemplate`
                                radial-gradient(
                                    650px circle at ${mouseX}px ${mouseY}px,
                                    rgba(59, 130, 246, 0.05),
                                    rgba(30, 58, 138, 0.1),
                                    transparent 80%
                                )
                                `,
                            }}
                        />

                        <div className="relative z-10 grid gap-8 lg:gap-12 lg:grid-cols-[1.05fr_0.95fr] pt-6 text-left">
                            <div className="flex flex-col gap-6">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-blue-200/70">BSIT Enrollment</p>
                                <div className="space-y-4">
                                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                                        Build your BSIT identity with confidence
                                    </h1>
                                    <p className="text-slate-400 leading-relaxed">
                                        Start fresh or reconnect an existing student ID. Your data stays encrypted, synced with the registrar, and ready for enrollment approvals.
                                    </p>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
                                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-200">
                                                <IdCard className="w-4 h-4" />
                                            </div>
                                            Returning Students
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Use the lookup flow to unlock your temporary credentials and keep every past record intact.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
                                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                                            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-200">
                                                <UserPlus className="w-4 h-4" />
                                            </div>
                                            Guided Security
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed">
                                            Two-step password confirmation and live validation prevent typos before they reach our servers.
                                        </p>
                                    </div>
                                </div>
                                <ul className="space-y-2 text-sm text-slate-400">
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                        Auto-generated student ID after signup
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                        Seamless transition to the enrollment dashboard
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        Live feedback if anything looks incomplete
                                    </li>
                                </ul>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6 md:p-8 shadow-xl shadow-blue-900/20 backdrop-blur">
                                {isClient && (
                                    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName" className="text-slate-300">First Name</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    id="firstName"
                                                    type="text"
                                                    placeholder="Juan"
                                                    required
                                                    autoComplete="given-name"
                                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10 h-12"
                                                    value={firstName}
                                                    onChange={(event) => setFirstName(event.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="middleName" className="text-slate-300">Middle Name</Label>
                                            <div className="relative">
                                                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    id="middleName"
                                                    type="text"
                                                    placeholder="Santos"
                                                    autoComplete="additional-name"
                                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10 h-12"
                                                    value={middleName}
                                                    onChange={(event) => setMiddleName(event.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="lastName" className="text-slate-300">Last Name</Label>
                                            <div className="relative">
                                                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    id="lastName"
                                                    type="text"
                                                    placeholder="Dela Cruz"
                                                    required
                                                    autoComplete="family-name"
                                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10 h-12"
                                                    value={lastName}
                                                    onChange={(event) => setLastName(event.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="email" className="text-slate-300">Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="student@example.com"
                                                    required
                                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10 h-12"
                                                    value={email}
                                                    onChange={(event) => setEmail(event.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password" className="text-slate-300">Password</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    id="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10 pr-10 h-12"
                                                    value={password}
                                                    onChange={(event) => setPassword(event.target.value)}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white hover:bg-transparent"
                                                    onClick={() => setShowPassword((prev) => !prev)}
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    id="confirmPassword"
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    required
                                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10 pr-10 h-12"
                                                    value={confirmPassword}
                                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white hover:bg-transparent"
                                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                                >
                                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.01]" disabled={isSubmitting}>
                                                {isSubmitting ? 'Creating Account...' : 'Create Account'}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>

            <footer className="absolute bottom-6 w-full text-center flex items-center justify-center gap-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">
                <Copyright className="w-3 h-3" />
                <span>DarenDL7</span>
                <span className="w-px h-3 bg-slate-700/50 mx-1" />
                <span>All Rights Reserved</span>
            </footer>

            <Dialog open={showReturningDialog} onOpenChange={(open) => {
                if (!open) {
                    closeReturningDialog();
                } else {
                    setShowReturningDialog(true);
                }
            }}>
                <DialogContent className="sm:max-w-md bg-[#0B1121]/95 backdrop-blur-xl border-white/10 text-white shadow-2xl">
                    {returningDialogStep === 'prompt' ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-white">Are you an existing student?</DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Answering this helps us locate your records and speed up the signup process.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 pt-4">
                                <Button 
                                    className="h-16 bg-blue-600 hover:bg-blue-500 text-white border-none rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]"
                                    onClick={() => {
                                        setReturningDialogStep('lookup');
                                        setLookupStudentId('');
                                        setLookupError(null);
                                    }}
                                >
                                    <div className="flex items-center gap-4 w-full px-2">
                                        <div className="p-2 bg-white/10 rounded-lg">
                                            <IdCard className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col items-start text-left">
                                            <span className="text-sm font-bold">Yes, I have a Student ID</span>
                                            <span className="text-[10px] font-normal opacity-80">I'm a returning student</span>
                                        </div>
                                    </div>
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="h-16 border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all hover:scale-[1.02]"
                                    onClick={() => {
                                        closeReturningDialog();
                                    }}
                                >
                                    <div className="flex items-center gap-4 w-full px-2">
                                        <div className="p-2 bg-white/5 border border-white/10 rounded-lg">
                                            <UserPlus className="w-5 h-5" />
                                        </div>
                                        <div className="flex flex-col items-start text-left">
                                            <span className="text-sm font-bold">No, I&apos;m a new student</span>
                                            <span className="text-[10px] font-normal opacity-80">Create a new record</span>
                                        </div>
                                    </div>
                                </Button>
                            </div>
                        </>
                    ) : returningDialogStep === 'lookup' ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-white">Enter your Student ID</DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    We&apos;ll check if your ID already exists in our system.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="lookupStudentId" className="text-slate-300">Student ID Number</Label>
                                    <div className="relative">
                                        <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="lookupStudentId"
                                            type="text"
                                            placeholder="e.g. 24-00-0001"
                                            value={lookupStudentId}
                                            onChange={(event) => setLookupStudentId(event.target.value)}
                                            autoComplete="off"
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10 h-12"
                                        />
                                    </div>
                                    {lookupError && (
                                        <div className="space-y-3 text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400" />
                                                <p>{lookupError}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-10 border-red-500/40 text-red-200 hover:text-white hover:bg-red-500/20"
                                                    onClick={handleRedirectToForgotPassword}
                                                >
                                                    Forgot Password Flow
                                                </Button>
                                                <Button
                                                    type="button"
                                                    className="h-10 bg-blue-600 hover:bg-blue-500 text-white"
                                                    onClick={handleRedirectToLogin}
                                                >
                                                    Go to Student Login
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <DialogFooter className="gap-3 sm:gap-0">
                                <Button
                                    variant="outline"
                                    type="button"
                                    className="h-11 border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl"
                                    onClick={() => {
                                        setReturningDialogStep('prompt');
                                        setLookupStudentId('');
                                        setLookupError(null);
                                    }}
                                >
                                    Back
                                </Button>
                                <Button 
                                    type="button" 
                                    className="h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]"
                                    onClick={handleLookupSubmit} 
                                    disabled={isCheckingStudentId}
                                >
                                    {isCheckingStudentId ? 'Checking...' : 'Continue'}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-white">We found your account</DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Sign in using the registered email below. We generated a temporary password based on your birthdate.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/10">
                                            <Mail className="w-5 h-5 text-blue-200" />
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-400">Registered Email</p>
                                            <p className="text-base font-semibold text-white break-words">
                                                {lookupResult?.email ?? 'Unavailable'}
                                            </p>
                                        </div>
                                    </div>
                                    {lookupResult?.studentIdNumber && (
                                        <p className="mt-2 text-xs text-slate-400">
                                            Student ID: <span className="font-semibold text-white">{lookupResult.studentIdNumber}</span>
                                        </p>
                                    )}
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/10">
                                            <Lock className="w-5 h-5 text-blue-200" />
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-slate-400">Temporary Password</p>
                                            <p className="text-xl font-mono font-semibold text-blue-200 mt-1">
                                                {lookupResult?.temporaryPassword ?? 'Unavailable'}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="mt-3 text-xs text-slate-400">
                                        Use this password on the Student Login page, then update your password after signing in.
                                    </p>
                                </div>
                            </div>
                            <DialogFooter className="justify-end">
                                <Button
                                    type="button"
                                    className="h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02]"
                                    onClick={handleRedirectToLogin}
                                >
                                    Go to Student Login
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
