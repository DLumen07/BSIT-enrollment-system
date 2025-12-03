
'use client';
import React, { useState, useCallback } from 'react';
import { AdminUser, roles } from '../../data/admin-users';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, PlusCircle, Trash2, Pencil, Eye, EyeOff, Shield } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdmin } from '../../context/admin-context';
import { useToast } from '@/hooks/use-toast';


export default function AdministratorsPage() {
    const { adminData, refreshAdminData } = useAdmin();
    const { adminUsers, adminRoles: roleOptions } = adminData;
    const availableRoles = roleOptions.length > 0 ? roleOptions : roles;
    const { toast } = useToast();

    const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
        .replace(/\/$/, '')
        .trim();

    const buildApiUrl = useCallback((endpoint: string) => `${API_BASE_URL}/${endpoint.replace(/^\//, '')}`, [API_BASE_URL]);

    const callAdminApi = useCallback(async (endpoint: string, payload: unknown) => {
        const response = await fetch(buildApiUrl(endpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        });

        let responseBody: any = null;
        try {
            responseBody = await response.json();
        } catch (error) {
            // Ignore JSON parse errors; rely on status code for error reporting.
        }

        if (!response.ok) {
            const message = responseBody?.message ?? `Request failed with status ${response.status}`;
            throw new Error(message);
        }

        if (!responseBody || responseBody.status !== 'success') {
            throw new Error(responseBody?.message ?? 'Request failed due to an unknown server error.');
        }

        return responseBody;
    }, [buildApiUrl]);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [deleteInput, setDeleteInput] = useState('');

    const [busyAction, setBusyAction] = useState<string | null>(null);
    const isBusy = useCallback((key: string) => busyAction === key, [busyAction]);

    const [addName, setAddName] = useState('');
    const [addEmail, setAddEmail] = useState('');
    const [addRole, setAddRole] = useState<AdminUser['role']>('Admin');
    const [addPassword, setAddPassword] = useState('');
    const [addConfirmPassword, setAddConfirmPassword] = useState('');
    const [showAddPassword, setShowAddPassword] = useState(false);
    const [showAddConfirmPassword, setShowAddConfirmPassword] = useState(false);

    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editRole, setEditRole] = useState<AdminUser['role']>('Admin');
    const [editPassword, setEditPassword] = useState('');
    const [editConfirmPassword, setEditConfirmPassword] = useState('');
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);

    const resetAddForm = () => {
        setAddName('');
        setAddEmail('');
        setAddRole('Admin');
        setAddPassword('');
        setAddConfirmPassword('');
        setShowAddPassword(false);
        setShowAddConfirmPassword(false);
    };

    const resetEditForm = (user?: AdminUser | null) => {
        if (user) {
            setEditName(user.name);
            setEditEmail(user.email);
            setEditRole(user.role);
        } else {
            setEditName('');
            setEditEmail('');
            setEditRole('Admin');
        }
        setEditPassword('');
        setEditConfirmPassword('');
        setShowEditPassword(false);
        setShowEditConfirmPassword(false);
    };

    const handleAddDialogChange = (open: boolean) => {
        if (isBusy('create-admin')) {
            return;
        }
        if (open) {
            resetAddForm();
        }
        setIsAddDialogOpen(open);
        if (!open) {
            resetAddForm();
        }
    };

    const handleEditDialogChange = (open: boolean) => {
        if (isBusy('update-admin')) {
            return;
        }
        if (open && selectedUser) {
            resetEditForm(selectedUser);
        }
        setIsEditDialogOpen(open);
        if (!open) {
            setSelectedUser(null);
            resetEditForm(null);
        }
    };

    const openAddDialog = () => {
        resetAddForm();
        setIsAddDialogOpen(true);
    };

    const openEditDialog = (user: AdminUser) => {
        setSelectedUser(user);
        resetEditForm(user);
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (user: AdminUser) => {
        setSelectedUser(user);
        setIsDeleteDialogOpen(true);
        setDeleteInput('');
    };

    const handleAddUser = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isBusy('create-admin')) {
            return;
        }

        if (addPassword !== addConfirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Passwords do not match',
                description: 'Please make sure both password fields match.',
            });
            return;
        }

        const trimmedName = addName.trim();
        const trimmedEmail = addEmail.trim();

        if (!trimmedName || !trimmedEmail) {
            toast({
                variant: 'destructive',
                title: 'Missing information',
                description: 'Please provide both name and email.',
            });
            return;
        }

        setBusyAction('create-admin');
        try {
            await callAdminApi('create_admin.php', {
                name: trimmedName,
                email: trimmedEmail,
                role: addRole,
                password: addPassword,
            });

            toast({
                title: 'Administrator Added',
                description: `${trimmedName} has been added successfully.`,
            });

            setIsAddDialogOpen(false);
            resetAddForm();
            await refreshAdminData();
        } catch (error) {
            console.error('Failed to create administrator', error);
            toast({
                variant: 'destructive',
                title: 'Failed to add administrator',
                description: error instanceof Error ? error.message : 'An unexpected error occurred.',
            });
        } finally {
            setBusyAction(null);
        }
    };

    const handleEditUser = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedUser || isBusy('update-admin')) {
            return;
        }

        if (editPassword !== editConfirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Passwords do not match',
                description: 'Please make sure both password fields match.',
            });
            return;
        }

        const trimmedName = editName.trim();
        const trimmedEmail = editEmail.trim();

        if (!trimmedName || !trimmedEmail) {
            toast({
                variant: 'destructive',
                title: 'Missing information',
                description: 'Please provide both name and email.',
            });
            return;
        }

        const payload: Record<string, unknown> = {
            userId: selectedUser.id,
            name: trimmedName,
            email: trimmedEmail,
            role: editRole,
        };

        if (editPassword !== '') {
            payload.password = editPassword;
        }

        setBusyAction('update-admin');
        try {
            await callAdminApi('update_admin.php', payload);

            toast({
                title: 'Administrator Updated',
                description: `${trimmedName} has been updated successfully.`,
            });

            setIsEditDialogOpen(false);
            setSelectedUser(null);
            resetEditForm(null);
            await refreshAdminData();
        } catch (error) {
            console.error('Failed to update administrator', error);
            toast({
                variant: 'destructive',
                title: 'Failed to update administrator',
                description: error instanceof Error ? error.message : 'An unexpected error occurred.',
            });
        } finally {
            setBusyAction(null);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser || isBusy('delete-admin')) {
            return;
        }

        const superAdmins = adminUsers.filter((user) => user.role === 'Super Admin');
        if (selectedUser.role === 'Super Admin' && superAdmins.length <= 1) {
            toast({
                variant: 'destructive',
                title: 'Protected Account',
                description: 'You cannot delete the last Super Admin.',
            });
            setIsDeleteDialogOpen(false);
            return;
        }

        setBusyAction('delete-admin');
        try {
            await callAdminApi('delete_admin.php', { userId: selectedUser.id });

            toast({
                title: 'Administrator Removed',
                description: `${selectedUser.name} has been removed successfully.`,
            });

            setIsDeleteDialogOpen(false);
            setSelectedUser(null);
            setDeleteInput('');
            await refreshAdminData();
        } catch (error) {
            console.error('Failed to delete administrator', error);
            toast({
                variant: 'destructive',
                title: 'Failed to delete administrator',
                description: error instanceof Error ? error.message : 'An unexpected error occurred.',
            });
        } finally {
            setBusyAction(null);
        }
    };

    const getRoleBadgeVariant = (role: AdminUser['role']) => {
        return 'outline';
    };

    return (
        <>
            <div className="flex-1 p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Administrators</h1>
                        <p className="text-slate-400 mt-1">
                            Manage user accounts, roles, and permissions.
                        </p>
                    </div>
                     <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
                        <DialogTrigger asChild>
                                <Button className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20" onClick={openAddDialog} disabled={isBusy('create-admin')}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Admin
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200 sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="text-white">Add New Administrator</DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Enter the details for the new admin user.
                                </DialogDescription>
                            </DialogHeader>
                            <form id="add-user-form" onSubmit={handleAddUser}>
                                <div className="space-y-4 py-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-slate-200">Full Name</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            value={addName}
                                            onChange={(event) => setAddName(event.target.value)}
                                            required
                                            disabled={isBusy('create-admin')}
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-slate-200">Email Address</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            value={addEmail}
                                            onChange={(event) => setAddEmail(event.target.value)}
                                            required
                                            disabled={isBusy('create-admin')}
                                            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role" className="text-slate-200">Role</Label>
                                        <Select
                                            name="role"
                                            value={addRole}
                                            onValueChange={(value) => setAddRole(value as AdminUser['role'])}
                                            required
                                            disabled={isBusy('create-admin')}
                                        >
                                            <SelectTrigger id="role" className="bg-white/5 border-white/10 text-white focus:ring-blue-500/20 rounded-xl">
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                                {availableRoles.map((role) => (
                                                    <SelectItem key={role} value={role} className="focus:bg-white/10 focus:text-white">{role}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password" className="text-slate-200">Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                name="password"
                                                type={showAddPassword ? 'text' : 'password'}
                                                value={addPassword}
                                                onChange={(event) => setAddPassword(event.target.value)}
                                                required
                                                disabled={isBusy('create-admin')}
                                                className="pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white hover:bg-white/10"
                                                onClick={() => setShowAddPassword((prev) => !prev)}
                                                disabled={isBusy('create-admin')}
                                            >
                                                {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                <span className="sr-only">Toggle password visibility</span>
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword" className="text-slate-200">Confirm Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                type={showAddConfirmPassword ? 'text' : 'password'}
                                                value={addConfirmPassword}
                                                onChange={(event) => setAddConfirmPassword(event.target.value)}
                                                required
                                                disabled={isBusy('create-admin')}
                                                className="pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white hover:bg-white/10"
                                                onClick={() => setShowAddConfirmPassword((prev) => !prev)}
                                                disabled={isBusy('create-admin')}
                                            >
                                                {showAddConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                <span className="sr-only">Toggle confirmation visibility</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => handleAddDialogChange(false)}
                                    disabled={isBusy('create-admin')}
                                    className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    form="add-user-form"
                                    disabled={isBusy('create-admin')}
                                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
                                >
                                    {isBusy('create-admin') ? 'Saving...' : 'Add User'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-semibold text-white">User List</CardTitle>
                                <CardDescription className="text-slate-400">
                                    A list of all administrator accounts in the system.
                                </CardDescription>
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
                                        <TableHead className="text-right text-slate-400 font-medium">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {adminUsers.map((user) => (
                                        <TableRow key={user.id} className="hover:bg-white/5 border-white/5">
                                            <TableCell className="text-slate-300">
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="border border-white/10">
                                                        <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person avatar"/>
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
                                                        user.role === 'Super Admin' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                                        user.role === 'Admin' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                        "bg-slate-800 text-slate-300 border-white/10"
                                                    }
                                                >
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200">
                                                        <DropdownMenuItem onSelect={() => openEditDialog(user)} className="focus:bg-white/10 focus:text-white">
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit User
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-white/10" />
                                                        <DropdownMenuItem
                                                            className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
                                                            onSelect={() => openDeleteDialog(user)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete User
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
                <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Administrator</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update the details for {selectedUser?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="edit-user-form" onSubmit={handleEditUser}>
                        <div className="space-y-4 py-2">
                             <div className="space-y-2">
                                <Label htmlFor="edit-name" className="text-slate-200">Full Name</Label>
                                <Input
                                    id="edit-name"
                                    name="name"
                                    value={editName}
                                    onChange={(event) => setEditName(event.target.value)}
                                    required
                                    disabled={isBusy('update-admin')}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-email" className="text-slate-200">Email Address</Label>
                                <Input
                                    id="edit-email"
                                    name="email"
                                    type="email"
                                    value={editEmail}
                                    onChange={(event) => setEditEmail(event.target.value)}
                                    required
                                    disabled={isBusy('update-admin')}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-role" className="text-slate-200">Role</Label>
                                <Select
                                    name="role"
                                    value={editRole}
                                    onValueChange={(value) => setEditRole(value as AdminUser['role'])}
                                    required
                                    disabled={isBusy('update-admin')}
                                >
                                    <SelectTrigger id="edit-role" className="bg-white/5 border-white/10 text-white focus:ring-blue-500/20 rounded-xl">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                        {availableRoles.map((role) => (
                                            <SelectItem key={role} value={role} className="focus:bg-white/10 focus:text-white">{role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-password" className="text-slate-200">New Password <span className="text-xs text-slate-500">(optional)</span></Label>
                                <div className="relative">
                                    <Input
                                        id="edit-password"
                                        name="password"
                                        type={showEditPassword ? 'text' : 'password'}
                                        value={editPassword}
                                        onChange={(event) => setEditPassword(event.target.value)}
                                        disabled={isBusy('update-admin')}
                                        className="pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white hover:bg-white/10"
                                        onClick={() => setShowEditPassword((prev) => !prev)}
                                        disabled={isBusy('update-admin')}
                                    >
                                        {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        <span className="sr-only">Toggle password visibility</span>
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-confirm-password" className="text-slate-200">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="edit-confirm-password"
                                        name="confirmPassword"
                                        type={showEditConfirmPassword ? 'text' : 'password'}
                                        value={editConfirmPassword}
                                        onChange={(event) => setEditConfirmPassword(event.target.value)}
                                        disabled={isBusy('update-admin')}
                                        className="pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-xl"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white hover:bg-white/10"
                                        onClick={() => setShowEditConfirmPassword((prev) => !prev)}
                                        disabled={isBusy('update-admin')}
                                    >
                                        {showEditConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        <span className="sr-only">Toggle confirmation visibility</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => handleEditDialogChange(false)}
                            disabled={isBusy('update-admin')}
                            className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="edit-user-form"
                            disabled={isBusy('update-admin')}
                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
                        >
                            {isBusy('update-admin') ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            This action cannot be undone. This will permanently delete the account for <span className="font-semibold text-white">{selectedUser?.name}</span>.
                            <br/><br/>
                            To confirm, please type "delete" below.
                        </AlertDialogDescription>
                        <Input 
                            id="delete-confirm" 
                            name="delete-confirm"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="mt-4 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-red-500/50 focus:ring-red-500/20 rounded-xl"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteInput('')} disabled={isBusy('delete-admin')} className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteInput !== 'delete' || isBusy('delete-admin')}
                            className="bg-red-600 hover:bg-red-500 text-white rounded-xl"
                            onClick={handleDeleteUser}
                        >
                            {isBusy('delete-admin') ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
