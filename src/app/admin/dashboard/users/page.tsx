
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { useAdmin } from '../../context/admin-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';

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
    const [roleFilter, setRoleFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

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
        return allUsers.filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.role.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (roleFilter === 'All') return matchesSearch;
            if (roleFilter === 'Admin') return matchesSearch && (user.role.includes('Admin') || user.role === 'Moderator');
            return matchesSearch && user.role === roleFilter;
        });
    }, [allUsers, searchTerm, roleFilter]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getRoleBadgeVariant = (role: string) => {
        if (role.includes('Admin')) return 'default';
        if (role === 'Instructor') return 'secondary';
        if (role === 'Student') return 'outline';
        return 'outline';
    };

    return (
        <div className="flex-1 p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 tracking-tight">System Users</h1>
                    <p className="text-slate-400 mt-1">
                        A unified list of all users in the system.
                    </p>
                </div>
            </div>

            <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                <CardHeader className="border-b border-white/5 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-semibold text-white">All Users</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Total users found: {filteredUsers.length}
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                <Input
                                    type="search"
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 sm:w-[300px] rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                                />
                            </div>
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-[140px] rounded-xl bg-white/5 border-white/10 text-white">
                                    <SelectValue placeholder="Filter by role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Roles</SelectItem>
                                    <SelectItem value="Student">Student</SelectItem>
                                    <SelectItem value="Instructor">Instructor</SelectItem>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="hover:bg-white/5 border-white/10">
                                    <TableHead className="text-slate-400 font-medium">User</TableHead>
                                    <TableHead className="text-slate-400 font-medium">Role</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedUsers.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-white/5 border-white/5">
                                        <TableCell className="text-slate-300">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="border border-white/10">
                                                    <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person avatar" />
                                                    <AvatarFallback className="bg-slate-800 text-slate-200">{user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="grid gap-1">
                                                    <p className="font-medium text-slate-200">{user.name}</p>
                                                    <p className="text-sm text-slate-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant="outline"
                                                className={
                                                    user.role.includes('Admin') ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                    user.role === 'Instructor' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                    user.role === 'Student' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                    "bg-slate-800 text-slate-300 border-white/10"
                                                }
                                            >
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                 {filteredUsers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="h-24 text-center text-slate-500">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <div className="text-sm text-slate-400">
                                Page {currentPage} of {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
