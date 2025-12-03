
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Eye, EyeOff, User, Lock, Mail, Shield, Settings, Save, Key, CheckCircle2 } from 'lucide-react';
import { useInstructor } from '@/app/instructor/context/instructor-context';
import { useAdmin } from '@/app/admin/context/admin-context';
import { resolveMediaUrl } from '@/lib/utils';
import { notifyDataChanged } from '@/lib/live-sync';

const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
    .replace(/\/+$/, '')
    .trim();

export default function InstructorSettingsPage() {
    const { toast } = useToast();
    const { instructorData, setInstructorData } = useInstructor();
    const { setAdminData } = useAdmin();
    const avatarInputRef = useRef<HTMLInputElement | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    
    const [email, setEmail] = useState('');
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if(instructorData) {
            setEmail(instructorData.personal.email);
        }
    }, [instructorData]);


    if (!instructorData) return null;
    
    const { personal } = instructorData;

    const handleAvatarUploadClick = () => {
        avatarInputRef.current?.click();
    };

    const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!instructorData) {
            return;
        }

        const file = event.target.files?.[0] ?? null;
        event.target.value = '';
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Invalid file',
                description: 'Please select an image file (PNG, JPG, or WEBP).',
                variant: 'destructive',
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'File too large',
                description: 'Please choose an image smaller than 5 MB.',
                variant: 'destructive',
            });
            return;
        }

        setAvatarUploading(true);
        try {
            const formData = new FormData();
            formData.append('role', 'instructor');
            formData.append('id', String(instructorData.personal.id));
            formData.append('avatar', file);

            const response = await fetch(`${API_BASE_URL}/upload_avatar.php`, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            let payload: any = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok || !payload || payload.status !== 'success') {
                const message = payload?.message ?? `Failed to upload avatar (status ${response.status}).`;
                throw new Error(message);
            }

            const avatarUrl = resolveMediaUrl(payload.data?.avatarUrl ?? payload.avatarUrl ?? null, API_BASE_URL);
            if (!avatarUrl) {
                throw new Error('Server returned an invalid avatar URL.');
            }

            setInstructorData(prev => {
                if (!prev) {
                    return prev;
                }
                return {
                    ...prev,
                    personal: {
                        ...prev.personal,
                        avatar: avatarUrl,
                    },
                };
            });

            setAdminData(prev => {
                if (!prev) {
                    return prev;
                }
                const updatedInstructors = prev.instructors.map((instructor) =>
                    instructor.id === instructorData.personal.id
                        ? { ...instructor, avatar: avatarUrl }
                        : instructor,
                );
                return { ...prev, instructors: updatedInstructors };
            });

            notifyDataChanged();

            toast({ title: 'Profile photo updated', description: 'Your avatar has been refreshed.' });
        } catch (error) {
            toast({
                title: 'Upload failed',
                description: error instanceof Error ? error.message : 'Unable to upload avatar right now.',
                variant: 'destructive',
            });
        } finally {
            setAvatarUploading(false);
        }
    };

    const handleSaveChanges = () => {
        if (!setInstructorData) return;
        
        setInstructorData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                personal: {
                    ...prev.personal,
                    email: email,
                }
            }
        });

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
        <main className="flex-1 p-4 sm:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <Settings className="h-6 w-6 text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-200">Account Settings</h1>
                    </div>
                    <p className="text-slate-400 pl-12">
                        Manage your profile information and account security.
                    </p>
                </div>
            </div>
            
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Identity Card */}
                <div className="lg:col-span-4 space-y-6">
                     <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                        <div className="h-32 bg-transparent relative">
                            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
                        </div>
                        <CardContent className="relative pt-0 flex flex-col items-center text-center -mt-12 pb-8">
                            <div className="relative mb-4 group">
                                <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full opacity-75 blur group-hover:opacity-100 transition duration-1000"></div>
                                <Avatar className="h-28 w-28 border-4 border-black/40 relative">
                                    <AvatarImage src={personal.avatar} alt={personal.name} className="object-cover" />
                                    <AvatarFallback className="bg-slate-800 text-slate-200 text-2xl">{personal.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="absolute bottom-0 right-0 rounded-full h-9 w-9 shadow-lg border-2 border-black/40 hover:bg-blue-500 hover:text-white transition-colors"
                                    onClick={handleAvatarUploadClick}
                                    disabled={avatarUploading}
                                >
                                    <Camera className="h-4 w-4" />
                                </Button>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={handleAvatarFileChange}
                                />
                            </div>
                            
                            <h2 className="text-xl font-bold text-slate-100">{personal.name}</h2>
                            <div className="flex items-center gap-1.5 mt-1 text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/20">
                                <Shield className="h-3 w-3" />
                                <span>Instructor Account</span>
                            </div>
                            
                            <div className="w-full mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-slate-200">Active</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mt-1">Status</div>
                                </div>
                                <div className="text-center border-l border-white/5">
                                    <div className="text-2xl font-bold text-slate-200">BSIT</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mt-1">Department</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Settings Forms */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Profile Section */}
                    <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                        <CardHeader className="border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <User className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-slate-200 text-lg">Personal Information</CardTitle>
                                    <CardDescription className="text-slate-400">Update your basic contact details.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <Input 
                                            value={personal.name} 
                                            disabled 
                                            className="pl-9 rounded-xl bg-white/5 border-white/10 text-slate-400 cursor-not-allowed" 
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500">Name changes must be requested from administration.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                        <Input 
                                            id="email" 
                                            value={email} 
                                            onChange={(e) => setEmail(e.target.value)} 
                                            className="pl-9 rounded-xl bg-white/5 border-white/10 text-slate-200 focus-visible:ring-blue-500/50" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-black/20 border-t border-white/5 py-4 flex justify-end">
                            <Button onClick={handleSaveChanges} className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20">
                                <Save className="h-4 w-4 mr-2" />
                                Save Changes
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Security Section */}
                    <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-xl overflow-hidden">
                        <form onSubmit={handlePasswordChange}>
                            <CardHeader className="border-b border-white/5 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg">
                                        <Lock className="h-5 w-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-slate-200 text-lg">Security Settings</CardTitle>
                                        <CardDescription className="text-slate-400">Manage your password and account security.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="current-password" className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Current Password</Label>
                                        <div className="relative group">
                                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <Input 
                                                id="current-password" 
                                                type={showCurrentPassword ? 'text' : 'password'} 
                                                value={currentPassword} 
                                                onChange={(e) => setCurrentPassword(e.target.value)} 
                                                required 
                                                className="pl-9 pr-10 rounded-xl bg-white/5 border-white/10 text-slate-200 focus-visible:ring-purple-500/50"
                                                placeholder="Enter your current password"
                                            />
                                            <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-500 hover:text-slate-300 hover:bg-transparent" 
                                                onClick={() => setShowCurrentPassword(prev => !prev)}
                                            >
                                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="new-password" className="text-slate-400 text-xs uppercase tracking-wider font-semibold">New Password</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                <Input 
                                                    id="new-password" 
                                                    type={showNewPassword ? 'text' : 'password'} 
                                                    value={newPassword} 
                                                    onChange={(e) => setNewPassword(e.target.value)} 
                                                    required 
                                                    className="pl-9 pr-10 rounded-xl bg-white/5 border-white/10 text-slate-200 focus-visible:ring-purple-500/50"
                                                    placeholder="Min. 8 characters"
                                                />
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-500 hover:text-slate-300 hover:bg-transparent" 
                                                    onClick={() => setShowNewPassword(prev => !prev)}
                                                >
                                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm-password" className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Confirm Password</Label>
                                            <div className="relative group">
                                                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                <Input 
                                                    id="confirm-password" 
                                                    type={showConfirmPassword ? 'text' : 'password'} 
                                                    value={confirmPassword} 
                                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                                    required 
                                                    className="pl-9 pr-10 rounded-xl bg-white/5 border-white/10 text-slate-200 focus-visible:ring-purple-500/50"
                                                    placeholder="Re-enter new password"
                                                />
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-500 hover:text-slate-300 hover:bg-transparent" 
                                                    onClick={() => setShowConfirmPassword(prev => !prev)}
                                                >
                                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-black/20 border-t border-white/5 py-4 flex justify-end">
                                <Button type="submit" className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20">
                                    <Save className="h-4 w-4 mr-2" />
                                    Update Password
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </div>
        </main>
    );
}
