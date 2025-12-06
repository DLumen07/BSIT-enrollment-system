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
import { MoreHorizontal, PlusCircle, Trash2, Pencil, Calendar, ChevronDown, Eye, EyeOff, GraduationCap, X } from 'lucide-react';
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

const getYearLevelColor = (yearLevel: number) => {
    switch (yearLevel) {
        case 1:
            return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20';
        case 2:
            return 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20';
        case 3:
            return 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20';
        case 4:
            return 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20';
        default:
            return 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700';
    }
};

const getYearLevelTextColor = (yearLevel: number) => {
    switch (yearLevel) {
        case 1: return 'text-emerald-400';
        case 2: return 'text-blue-400';
        case 3: return 'text-purple-400';
        case 4: return 'text-amber-400';
        default: return 'text-slate-400';
    }
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

    const getSubjectYearLevel = (subjectCode: string) => {
        const subject = availableSubjects.find(s => s.id === subjectCode);
        return subject ? subject.yearLevel : 0;
    };

    return (
        <div className="space-y-3">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between rounded-xl bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white">
                        <span>{selectedSubjects.length > 0 ? `${selectedSubjects.length} selected` : 'Select subjects'}</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full rounded-xl max-h-72 overflow-y-auto bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                    <DropdownMenuLabel className="text-slate-400">Available Subjects</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-white/10" />
                    {availableSubjects.map(subject => (
                        <DropdownMenuCheckboxItem
                            key={subject.id}
                            checked={selectedSubjects.includes(subject.id)}
                            onSelect={(e) => { e.preventDefault(); handleSelect(subject.id); }}
                            className="focus:bg-white/10 focus:text-white"
                        >
                            <span className={`font-medium ${getYearLevelTextColor(subject.yearLevel)}`}>
                                {subject.id}
                            </span>
                            <span className="text-slate-400">
                                {subject.label.substring(subject.id.length)}
                            </span>
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            {selectedSubjects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedSubjects.map(subject => (
                        <Badge key={subject} variant="secondary" className={`${getYearLevelColor(getSubjectYearLevel(subject))} border cursor-pointer`} onClick={() => handleSelect(subject)}>
                            {subject}
                            <X className="ml-1 h-3 w-3" />
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
};


export default function InstructorsPage() {
    const { adminData, refreshAdminData } = useAdmin();
    const { instructors, availableSubjects } = adminData;
    const { toast } = useToast();

    const getSubjectYearLevel = (subjectCode: string) => {
        const subject = availableSubjects.find(s => s.id === subjectCode);
        return subject ? subject.yearLevel : 0;
    };
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
            <div className="flex-1 p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Instructors</h1>
                        <p className="text-slate-400 mt-1">
                            Manage instructor profiles and their assigned subjects.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button onClick={openAddDialog} className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 border-0">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Instructor
                        </Button>
                    </div>
                </div>

                <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                    <GraduationCap className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold text-white">Instructor List</CardTitle>
                                    <CardDescription className="text-slate-400">
                                        A list of all instructors in the system.
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="hidden md:flex items-center gap-3 text-xs bg-slate-900/50 px-3 py-2 rounded-xl border border-white/10">
                                <span className="text-slate-500 font-medium mr-1">Year Levels:</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-slate-400">1st</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-slate-400">2nd</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                    <span className="text-slate-400">3rd</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                    <span className="text-slate-400">4th</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="rounded-xl border border-white/10 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="hover:bg-white/5 border-white/10">
                                        <TableHead className="text-slate-400 font-medium">Instructor</TableHead>
                                        <TableHead className="text-slate-400 font-medium">Subjects Handled</TableHead>
                                        <TableHead className="text-right text-slate-400 font-medium">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {instructors.map((instructor) => (
                                        <TableRow key={instructor.id} className="hover:bg-white/5 border-white/5">
                                            <TableCell className="text-slate-300">
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="border border-white/10">
                                                        <AvatarImage src={instructor.avatar} alt={instructor.name} data-ai-hint="person avatar"/>
                                                        <AvatarFallback className="bg-slate-800 text-slate-200">{instructor.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="grid gap-1">
                                                        <p className="font-medium text-slate-200">{instructor.name}</p>
                                                        <p className="text-sm text-slate-500">{instructor.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {instructor.subjects.map(subject => {
                                                        const yearLevel = getSubjectYearLevel(subject);
                                                        const colorClass = getYearLevelColor(yearLevel);
                                                        return (
                                                            <Badge key={subject} variant="secondary" className={`${colorClass} border`}>
                                                                {subject}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                                         <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
                                                            <Link href={`/admin/dashboard/instructors/${instructor.id}/schedule`}>
                                                                <Calendar className="mr-2 h-4 w-4" />
                                                                View Schedule
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => openEditDialog(instructor)} className="focus:bg-white/10 focus:text-white">
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit Profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-white/10" />
                                                        <DropdownMenuItem
                                                            className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
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
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) {
                    resetForm();
                }
            }}>
                <DialogContent className="rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-white">Add New Instructor</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Create an account for the new instructor.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="add-instructor-form" onSubmit={handleAddInstructor}>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-slate-300">Full Name</Label>
                                <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required className="rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                                <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-300">Password</Label>
                                <div className="relative group">
                                    <Input id="password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-xl pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"/>
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowPassword(p => !p)}>
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
                                <div className="relative group">
                                    <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="rounded-xl pr-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"/>
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowConfirmPassword(p => !p)}>
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subjects" className="text-slate-300">Subjects Handled</Label>
                                <MultiSelectSubject selectedSubjects={subjects} onSelectionChange={setSubjects} />
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white" disabled={isBusy('create-instructor')}>Cancel</Button>
                        <Button type="submit" form="add-instructor-form" className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-0" disabled={isBusy('create-instructor')}>
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
                <DialogContent className="rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Instructor</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update the details for {selectedInstructor?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="edit-instructor-form" onSubmit={handleEditInstructor}>
                        <div className="space-y-4 py-2">
                             <div className="space-y-2">
                                <Label htmlFor="edit-name" className="text-slate-300">Full Name</Label>
                                <Input id="edit-name" name="name" value={name} onChange={(e) => setName(e.target.value)} required className="rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-email" className="text-slate-300">Email Address</Label>
                                <Input id="edit-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20" />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="edit-subjects" className="text-slate-300">Subjects Handled</Label>
                                <MultiSelectSubject selectedSubjects={subjects} onSelectionChange={setSubjects} />
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white" disabled={selectedInstructor ? isBusy(`edit-instructor-${selectedInstructor.id}`) : false}>Cancel</Button>
                        <Button
                            type="submit"
                            form="edit-instructor-form"
                            className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-0"
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
                <AlertDialogContent className="rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            This action cannot be undone. This will permanently delete the profile for <span className="font-semibold text-white">{selectedInstructor?.name}</span>.
                            <br/><br/>
                            To confirm, please type "delete" below.
                        </AlertDialogDescription>
                         <Input 
                            id="delete-confirm" 
                            name="delete-confirm"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="mt-4 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-red-500/50 focus:ring-red-500/20"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteInput('')} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteInput !== 'delete' || (selectedInstructor ? isBusy(`delete-instructor-${selectedInstructor.id}`) : false)}
                            className="bg-red-600 hover:bg-red-500 text-white border-0 rounded-xl"
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
