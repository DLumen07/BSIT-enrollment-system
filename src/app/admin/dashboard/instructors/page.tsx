'use client';
import React, { useState, useCallback } from 'react';
import Link from 'next/link';
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
import { MoreHorizontal, PlusCircle, Trash2, Pencil, Calendar, ChevronDown, Eye, EyeOff } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAdmin, Instructor } from '../../context/admin-context';
import { useToast } from '@/hooks/use-toast';

type ApiSuccessResponse<T = unknown> = {
    status: 'success';
    data?: T;
    message?: string;
};


const MultiSelectSubject = ({ selectedSubjects, onSelectionChange }: { selectedSubjects: string[], onSelectionChange: (selected: string[]) => void }) => {
    const { adminData } = useAdmin();
    const { availableSubjects } = adminData;
    
    const handleSelect = (subjectId: string) => {
        const isSelected = selectedSubjects.includes(subjectId);
        if (isSelected) {
            onSelectionChange(selectedSubjects.filter(id => id !== subjectId));
        } else {
            onSelectionChange([...selectedSubjects, subjectId]);
        }
    };

    return (
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between rounded-xl">
                    <span>{selectedSubjects.length > 0 ? `${selectedSubjects.length} selected` : 'Select subjects'}</span>
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full rounded-xl">
                <DropdownMenuLabel>Available Subjects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableSubjects.map(subject => (
                    <DropdownMenuCheckboxItem
                        key={subject.id}
                        checked={selectedSubjects.includes(subject.id)}
                        onSelect={(e) => { e.preventDefault(); handleSelect(subject.id); }}
                    >
                        {subject.label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};


export default function InstructorsPage() {
    const { adminData, refreshAdminData } = useAdmin();
    const { instructors } = adminData;
    const { toast } = useToast();
    const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api').replace(/\/$/, '').trim();
    const buildApiUrl = useCallback((endpoint: string) => `${API_BASE_URL}/${endpoint.replace(/^\//, '')}`, [API_BASE_URL]);
    const callInstructorApi = useCallback(async (endpoint: string, payload: unknown): Promise<ApiSuccessResponse> => {
        const response = await fetch(buildApiUrl(endpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        });

        let data: any = null;
        try {
            data = await response.json();
        } catch (error) {
            // Ignore parse errors; status handling below will surface issues.
        }

        if (!response.ok) {
            const message = data?.message ?? `Request failed with status ${response.status}`;
            throw new Error(message);
        }

        if (!data || data.status !== 'success') {
            throw new Error(data?.message ?? 'Request failed due to an unknown server error.');
        }

        return data as ApiSuccessResponse;
    }, [buildApiUrl]);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
    const [deleteInput, setDeleteInput] = useState('');
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const isBusy = useCallback((key: string) => busyAction === key, [busyAction]);

    // State for form inputs
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subjects, setSubjects] = useState<string[]>([]);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const resetForm = () => {
        setName('');
        setEmail('');
        setSubjects([]);
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const openAddDialog = () => {
        resetForm();
        setIsAddDialogOpen(true);
    };

    const openEditDialog = (instructor: Instructor) => {
        setSelectedInstructor(instructor);
        setName(instructor.name);
        setEmail(instructor.email);
        setSubjects(instructor.subjects);
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (instructor: Instructor) => {
        setSelectedInstructor(instructor);
        setIsDeleteDialogOpen(true);
        setDeleteInput('');
    };

    const handleAddInstructor = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (password !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Passwords do not match',
                description: 'Please ensure the password and confirmation match.',
            });
            return;
        }

        const actionKey = 'create-instructor';
        if (isBusy(actionKey)) {
            return;
        }

        const payload = {
            name,
            email,
            password,
            subjects,
            avatar: `https://picsum.photos/seed/instructor-${Date.now()}/64/64`,
        };

        setBusyAction(actionKey);

        try {
            await callInstructorApi('create_instructor.php', payload);
            await refreshAdminData();
            toast({
                title: 'Instructor Account Created',
                description: `An account for ${name} has been successfully created.`,
            });
            setIsAddDialogOpen(false);
            resetForm();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create instructor.';
            toast({
                variant: 'destructive',
                title: 'Create Failed',
                description: message,
            });
        } finally {
            setBusyAction(null);
        }
    };

    const handleEditInstructor = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedInstructor) {
            return;
        }

        const actionKey = `edit-instructor-${selectedInstructor.id}`;
        if (isBusy(actionKey)) {
            return;
        }

        const payload = {
            instructorId: selectedInstructor.id,
            name,
            email,
            subjects,
            avatar: selectedInstructor.avatar ?? '',
        };

        setBusyAction(actionKey);

        try {
            await callInstructorApi('update_instructor.php', payload);
            await refreshAdminData();
            toast({
                title: 'Instructor Updated',
                description: `${name}'s profile has been updated successfully.`,
            });
            setIsEditDialogOpen(false);
            setSelectedInstructor(null);
            resetForm();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update instructor.';
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: message,
            });
        } finally {
            setBusyAction(null);
        }
    };

    const handleDeleteInstructor = async () => {
        if (!selectedInstructor) {
            return;
        }

        const actionKey = `delete-instructor-${selectedInstructor.id}`;
        if (isBusy(actionKey)) {
            return;
        }

        setBusyAction(actionKey);

        try {
            await callInstructorApi('delete_instructor.php', { instructorId: selectedInstructor.id });
            await refreshAdminData();
            toast({
                title: 'Instructor Deleted',
                description: `${selectedInstructor.name}'s account has been removed.`,
            });
            setIsDeleteDialogOpen(false);
            setSelectedInstructor(null);
            setDeleteInput('');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete instructor.';
            toast({
                variant: 'destructive',
                title: 'Delete Failed',
                description: message,
            });
        } finally {
            setBusyAction(null);
        }
    };

    return (
        <>
            <main className="flex-1 p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight">Instructors</h1>
                        <p className="text-muted-foreground">
                            Manage instructor profiles and their assigned subjects.
                        </p>
                    </div>
                    <Button onClick={openAddDialog} className="rounded-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Instructor
                    </Button>
                </div>

                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>Instructor List</CardTitle>
                        <CardDescription>
                            A list of all instructors in the system.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Instructor</TableHead>
                                    <TableHead>Subjects Handled</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {instructors.map((instructor) => (
                                    <TableRow key={instructor.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <Avatar>
                                                    <AvatarImage src={instructor.avatar} alt={instructor.name} data-ai-hint="person avatar"/>
                                                    <AvatarFallback>{instructor.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="grid gap-1">
                                                    <p className="font-medium">{instructor.name}</p>
                                                    <p className="text-sm text-muted-foreground">{instructor.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {instructor.subjects.map(subject => (
                                                    <Badge key={subject} variant="secondary">{subject}</Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 hover:text-accent">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl">
                                                     <DropdownMenuItem asChild>
                                                        <Link href={`/admin/dashboard/instructors/${instructor.id}/schedule`}>
                                                            <Calendar className="mr-2 h-4 w-4" />
                                                            View Schedule
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => openEditDialog(instructor)}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                        onSelect={() => openDeleteDialog(instructor)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Instructor
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

            {/* Add Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) {
                    resetForm();
                }
            }}>
                <DialogContent className="rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Add New Instructor</DialogTitle>
                        <DialogDescription>
                            Create an account for the new instructor.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="add-instructor-form" onSubmit={handleAddInstructor}>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required className="rounded-xl"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative group">
                                    <Input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-xl pr-10"/>
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowPassword(p => !p)}>
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <div className="relative group">
                                    <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="rounded-xl pr-10"/>
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowConfirmPassword(p => !p)}>
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subjects">Subjects Handled</Label>
                                <MultiSelectSubject selectedSubjects={subjects} onSelectionChange={setSubjects} />
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl" disabled={isBusy('create-instructor')}>Cancel</Button>
                        <Button type="submit" form="add-instructor-form" className="rounded-xl" disabled={isBusy('create-instructor')}>
                            {isBusy('create-instructor') ? 'Creating...' : 'Create Account'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) {
                    setSelectedInstructor(null);
                    resetForm();
                }
            }}>
                <DialogContent className="rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Instructor</DialogTitle>
                        <DialogDescription>
                            Update the details for {selectedInstructor?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="edit-instructor-form" onSubmit={handleEditInstructor}>
                        <div className="space-y-4 py-2">
                             <div className="space-y-2">
                                <Label htmlFor="edit-name">Full Name</Label>
                                <Input id="edit-name" name="name" value={name} onChange={(e) => setName(e.target.value)} required className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email Address</Label>
                                <Input id="edit-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl" />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="edit-subjects">Subjects Handled</Label>
                                <MultiSelectSubject selectedSubjects={subjects} onSelectionChange={setSubjects} />
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl" disabled={selectedInstructor ? isBusy(`edit-instructor-${selectedInstructor.id}`) : false}>Cancel</Button>
                        <Button
                            type="submit"
                            form="edit-instructor-form"
                            className="rounded-xl"
                            disabled={!selectedInstructor || isBusy(`edit-instructor-${selectedInstructor.id}`)}
                        >
                            {selectedInstructor && isBusy(`edit-instructor-${selectedInstructor.id}`) ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                setIsDeleteDialogOpen(open);
                if (!open) {
                    setDeleteInput('');
                    setSelectedInstructor(null);
                }
            }}>
                <AlertDialogContent className="rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the profile for <span className="font-semibold">{selectedInstructor?.name}</span>.
                            <br/><br/>
                            To confirm, please type "delete" below.
                        </AlertDialogDescription>
                         <Input 
                            id="delete-confirm" 
                            name="delete-confirm"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="mt-4 rounded-xl"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteInput('')} className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteInput !== 'delete' || (selectedInstructor ? isBusy(`delete-instructor-${selectedInstructor.id}`) : false)}
                            className="bg-destructive hover:bg-destructive/90 rounded-xl"
                            onClick={handleDeleteInstructor}
                        >
                            {selectedInstructor && isBusy(`delete-instructor-${selectedInstructor.id}`) ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
