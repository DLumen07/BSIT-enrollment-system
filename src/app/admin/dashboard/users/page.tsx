
'use client';
import React, { useState, useMemo } from 'react';
import { useAdmin } from '../../context/admin-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

type UnifiedUser = {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
};

export default function UsersPage() {
    const { adminData } = useAdmin();
    const [searchTerm, setSearchTerm] = useState('');

    const allUsers = useMemo(() => {
        if (!adminData) return [];
        
        const admins: UnifiedUser[] = adminData.adminUsers.map(u => ({
            id: `admin-${u.id}`,
            name: u.name,
            email: u.email,
            role: u.role,
            avatar: u.avatar,
        }));

        const instructors: UnifiedUser[] = adminData.instructors.map(u => ({
            id: `instructor-${u.id}`,
            name: u.name,
            email: u.email,
            role: 'Instructor',
            avatar: u.avatar,
        }));

        const students: UnifiedUser[] = adminData.students.map(u => ({
            id: `student-${u.id}`,
            name: u.name,
            email: u.email,
            role: 'Student',
            avatar: u.avatar,
        }));

        return [...admins, ...instructors, ...students];
    }, [adminData]);

    const filteredUsers = useMemo(() => {
        return allUsers.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.role.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allUsers, searchTerm]);

    const getRoleBadgeVariant = (role: string) => {
        if (role.includes('Admin')) return 'default';
        if (role === 'Instructor') return 'secondary';
        if (role === 'Student') return 'outline';
        return 'outline';
    };

    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">System Users</h1>
                    <p className="text-muted-foreground">
                        A unified list of all users in the system.
                    </p>
                </div>
            </div>

            <Card className="rounded-xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>All Users</CardTitle>
                            <CardDescription>
                                Total users found: {filteredUsers.length}
                            </CardDescription>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] rounded-xl"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <Avatar>
                                                    <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person avatar" />
                                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="grid gap-1">
                                                    <p className="font-medium">{user.name}</p>
                                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                 {filteredUsers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
