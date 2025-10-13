
'use client';
import React, { useState } from 'react';
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
import { MoreHorizontal, PlusCircle, Trash2, Pencil, Shield } from 'lucide-react';
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


type AdminUser = {
    id: number;
    name: string;
    email: string;
    role: 'Super Admin' | 'Admin' | 'Moderator';
    avatar: string;
};

const initialAdminUsers: AdminUser[] = [
    { id: 1, name: 'Alice Johnson', email: 'alice.j@example.com', role: 'Super Admin', avatar: 'https://picsum.photos/seed/aj-avatar/40/40' },
    { id: 2, name: 'Bob Williams', email: 'bob.w@example.com', role: 'Admin', avatar: 'https://picsum.photos/seed/bw-avatar/40/40' },
    { id: 3, name: 'Charlie Brown', email: 'charlie.b@example.com', role: 'Admin', avatar: 'https://picsum.photos/seed/cb-avatar/40/40' },
    { id: 4, name: 'Diana Miller', email: 'diana.m@example.com', role: 'Admin', avatar: 'https://picsum.photos/seed/dm-avatar/40/40' },
    { id: 5, name: 'Ethan Garcia', email: 'ethan.g@example.com', role: 'Moderator', avatar: 'https://picsum.photos/seed/eg-avatar/40/40' },
];

const roles: AdminUser['role'][] = ['Super Admin', 'Admin', 'Moderator'];


export default function AdministratorsPage() {
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>(initialAdminUsers);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

    const openEditDialog = (user: AdminUser) => {
        setSelectedUser(user);
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (user: AdminUser) => {
        setSelectedUser(user);
        setIsDeleteDialogOpen(true);
    };
    
    const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newUser: AdminUser = {
            id: Date.now(),
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            role: formData.get('role') as AdminUser['role'],
            avatar: `https://picsum.photos/seed/${Date.now()}/40/40`,
        };
        setAdminUsers([...adminUsers, newUser]);
        setIsAddDialogOpen(false);
    };

    const handleEditUser = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedUser) return;
        const formData = new FormData(e.currentTarget);
        const updatedUser = {
            ...selectedUser,
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            role: formData.get('role') as AdminUser['role'],
        };
        setAdminUsers(adminUsers.map(u => u.id === selectedUser.id ? updatedUser : u));
        setIsEditDialogOpen(false);
        setSelectedUser(null);
    };

    const handleDeleteUser = () => {
        if (!selectedUser) return;
        // Prevent deleting the last Super Admin
        const superAdmins = adminUsers.filter(u => u.role === 'Super Admin');
        if (selectedUser.role === 'Super Admin' && superAdmins.length === 1) {
            alert('You cannot delete the last Super Admin.');
            setIsDeleteDialogOpen(false);
            return;
        }
        setAdminUsers(adminUsers.filter(u => u.id !== selectedUser.id));
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
    };

    const getRoleBadgeVariant = (role: AdminUser['role']) => {
        switch (role) {
            case 'Super Admin':
                return 'default';
            case 'Admin':
                return 'secondary';
            case 'Moderator':
                return 'outline';
            default:
                return 'outline';
        }
    };

    return (
        <>
            <main className="flex-1 p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight">Administrators</h1>
                        <p className="text-muted-foreground">
                            Manage user accounts, roles, and permissions.
                        </p>
                    </div>
                     <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Admin
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Administrator</DialogTitle>
                                <DialogDescription>
                                    Enter the details for the new admin user.
                                </DialogDescription>
                            </DialogHeader>
                            <form id="add-user-form" onSubmit={handleAddUser}>
                                <div className="space-y-4 py-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input id="name" name="name" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" name="email" type="email" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="role">Role</Label>
                                        <Select name="role" defaultValue="Admin" required>
                                            <SelectTrigger id="role">
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roles.map(role => (
                                                    <SelectItem key={role} value={role}>{role}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </form>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" form="add-user-form">Add User</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>User List</CardTitle>
                        <CardDescription>
                            A list of all administrator accounts in the system.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {adminUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <Avatar>
                                                    <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="person avatar"/>
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
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onSelect={() => openEditDialog(user)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit User
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
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
                    </CardContent>
                </Card>
            </main>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Administrator</DialogTitle>
                        <DialogDescription>
                            Update the details for {selectedUser?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="edit-user-form" onSubmit={handleEditUser}>
                        <div className="space-y-4 py-2">
                             <div className="space-y-2">
                                <Label htmlFor="edit-name">Full Name</Label>
                                <Input id="edit-name" name="name" defaultValue={selectedUser?.name} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email Address</Label>
                                <Input id="edit-email" name="email" type="email" defaultValue={selectedUser?.email} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-role">Role</Label>
                                <Select name="role" defaultValue={selectedUser?.role} required>
                                    <SelectTrigger id="edit-role">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map(role => (
                                            <SelectItem key={role} value={role}>{role}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="edit-user-form">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the account for <span className="font-semibold">{selectedUser?.name}</span>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={handleDeleteUser}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
