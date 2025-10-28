
'use client';
import React, { useState } from 'react';
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
import { MoreHorizontal, PlusCircle, Trash2, Pencil, Calendar, ChevronDown, Check, Eye, EyeOff } from 'lucide-react';
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
    const { adminData, setAdminData } = useAdmin();
    const { instructors } = adminData;
    const { toast } = useToast();

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
    const [deleteInput, setDeleteInput] = useState('');

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
    
    const handleAddInstructor = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: 'Passwords do not match',
                description: 'Please ensure the password and confirmation match.',
            });
            return;
        }

        try {
            const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/create_user.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role: 'instructor' })
            });
            const userData = await userResponse.json();
            if (!userResponse.ok) throw new Error(userData.message);

            const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/create_instructor_profile.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userData.id, name, department: 'IT', avatar_url: `https://picsum.photos/seed/${userData.id}/40/40` })
            });
            const profileData = await profileResponse.json();
            if (!profileResponse.ok) throw new Error(profileData.message);

            const newInstructor: Instructor = {
                id: profileData.user_id,
                name: profileData.name,
                email: email,
                subjects,
                avatar: profileData.avatar_url,
            };
            setAdminData(prev => ({...prev, instructors: [...prev.instructors, newInstructor]}));
            setIsAddDialogOpen(false);
            toast({
                title: 'Instructor Account Created',
                description: `An account for ${name} has been successfully created.`,
            });
        } catch (error) {
            toast({ title: "Error", description: "Failed to create instructor.", variant: "destructive" });
        }
    };

    const handleEditInstructor = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedInstructor) return;

        const updatedInstructorData = {
            user_id: selectedInstructor.id,
            name,
            department: 'IT',
            avatar_url: selectedInstructor.avatar,
        };

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/update_instructor_profile.php`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedInstructorData)
            });
            if (!response.ok) throw new Error();

            const updatedInstructor = {
                ...selectedInstructor,
                name,
                email,
                subjects,
            };
            setAdminData(prev => ({
                ...prev,
                instructors: prev.instructors.map(u => u.id === selectedInstructor.id ? updatedInstructor : u)
            }));
            setIsEditDialogOpen(false);
            setSelectedInstructor(null);
            toast({ title: "Success", description: "Instructor updated successfully." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update instructor.", variant: "destructive" });
        }
    };

    const handleDeleteInstructor = async () => {
        if (!selectedInstructor) return;
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/delete_instructor_profile.php`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: selectedInstructor.id })
            });
            if (!response.ok) throw new Error();
            setAdminData(prev => ({
                ...prev,
                instructors: prev.instructors.filter(u => u.id !== selectedInstructor.id)
            }));
            setIsDeleteDialogOpen(false);
            setSelectedInstructor(null);
            toast({ title: "Success", description: "Instructor deleted successfully." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete instructor.", variant: "destructive" });
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
             <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button type="submit" form="add-instructor-form" className="rounded-xl">Create Account</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button type="submit" form="edit-instructor-form" className="rounded-xl">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
                            disabled={deleteInput !== 'delete'}
                            className="bg-destructive hover:bg-destructive/90 rounded-xl"
                            onClick={handleDeleteInstructor}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
