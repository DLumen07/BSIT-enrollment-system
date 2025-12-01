
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Eye, EyeOff } from 'lucide-react';
import { useInstructor } from '@/app/instructor/context/instructor-context';
import { useAdmin } from '@/app/admin/context/admin-context';
import { resolveMediaUrl } from '@/lib/utils';
import { notifyDataChanged } from '@/lib/live-sync';

const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
    .replace(/\/+$/, '')
    .trim();

const InfoField = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null;
    return (
        <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">{label}</Label>
            <p className="font-medium">{value}</p>
        </div>
    );
};


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


    if (!instructorData) return <div>Loading...</div>;
    
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
                                    <AvatarImage src={personal.avatar} alt={personal.name} data-ai-hint="person avatar"/>
                                    <AvatarFallback>{personal.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background hover:bg-muted"
                                    onClick={handleAvatarUploadClick}
                                    disabled={avatarUploading}
                                    aria-busy={avatarUploading}
                                >
                                    <Camera className="h-4 w-4" />
                                    <span className="sr-only">{avatarUploading ? 'Uploading photo' : 'Change photo'}</span>
                                </Button>
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={handleAvatarFileChange}
                                />
                            </div>
                            <h2 className="text-xl font-semibold">{personal.name}</h2>
                            <p className="text-sm text-muted-foreground">{personal.email}</p>
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
                                        Update your contact information here.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <InfoField label="Name" value={personal.name} />
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl" />
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
                                        <div className="space-y-2">
                                            <Label htmlFor="current-password">Current Password</Label>
                                            <div className="relative group">
                                                <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="rounded-xl pr-10"/>
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowCurrentPassword(prev => !prev)}>
                                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new-password">New Password</Label>
                                            <div className="relative group">
                                                <Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="rounded-xl pr-10"/>
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowNewPassword(prev => !prev)}>
                                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                         <div className="space-y-2">
                                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                                            <div className="relative group">
                                                <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="rounded-xl pr-10"/>
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowConfirmPassword(prev => !prev)}>
                                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
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
