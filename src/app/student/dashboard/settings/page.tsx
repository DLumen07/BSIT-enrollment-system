
'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function StudentSettingsPage() {
    const { toast } = useToast();
    const [email, setEmail] = useState('student.name@example.com');
    const [contactNumber, setContactNumber] = useState('09123456789');
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');


    const handleSaveContact = () => {
        toast({
            title: "Contact Info Saved",
            description: "Your contact information has been updated.",
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

        // Add password change logic here
        
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
                    Manage your account settings and preferences.
                </p>
            </div>
            
            <Tabs defaultValue="contact" className="max-w-xl">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="contact">Contact Information</TabsTrigger>
                    <TabsTrigger value="password">Password</TabsTrigger>
                </TabsList>
                <TabsContent value="contact">
                     <Card className="rounded-xl">
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                            <CardDescription>
                                Keep your contact details up to date.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                             <div className="space-y-1">
                                <Label htmlFor="contact-number">Contact Number</Label>
                                <Input id="contact-number" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSaveContact} className="rounded-xl">Save Contact Info</Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
                <TabsContent value="password">
                    <Card className="rounded-xl">
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
                                    <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                                </div>
                                 <div className="space-y-1">
                                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                                    <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="rounded-xl">Change Password</Button>
                            </CardFooter>
                        </form>
                    </Card>
                </TabsContent>
            </Tabs>
        </main>
    );
}
