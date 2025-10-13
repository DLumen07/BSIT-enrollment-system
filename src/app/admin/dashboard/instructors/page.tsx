
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
import { MoreHorizontal, PlusCircle, Trash2, Pencil, Calendar, ChevronDown, Check } from 'lucide-react';
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
    DialogTrigger,
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


export type Instructor = {
    id: number;
    name: string;
    email: string;
    subjects: string[];
    avatar: string;
};

export const initialInstructors: Instructor[] = [
    { id: 1, name: 'Dr. Alan Turing', email: 'alan.turing@university.edu', subjects: ['IT 101', 'IT 201'], avatar: 'https://picsum.photos/seed/at-avatar/40/40' },
    { id: 2, name: 'Prof. Ada Lovelace', email: 'ada.lovelace@university.edu', subjects: ['MATH 101'], avatar: 'https://picsum.photos/seed/al-avatar/40/40' },
    { id: 3, name: 'Dr. Grace Hopper', email: 'grace.hopper@university.edu', subjects: ['IT 301', 'IT 401'], avatar: 'https://picsum.photos/seed/gh-avatar/40/40' },
    { id: 4, name: 'Mr. Charles Babbage', email: 'charles.babbage@university.edu', subjects: ['ENG 101'], avatar: 'https://picsum.photos/seed/cb-avatar/40/40' },
];

export const availableSubjects = [
    { id: 'IT 101', label: 'IT 101 - Intro to Computing' },
    { id: 'IT 201', label: 'IT 201 - Data Structures' },
    { id: 'IT 301', label: 'IT 301 - Web Development' },
    { id: 'IT 401', label: 'IT 401 - Capstone Project' },
    { id: 'MATH 101', label: 'MATH 101 - Calculus 1' },
    { id: 'ENG 101', label: 'ENG 101 - English Composition' },
];

const MultiSelectSubject = ({ selectedSubjects, onSelectionChange }: { selectedSubjects: string[], onSelectionChange: (selected: string[]) => void }) => {
    
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
                <Button variant="outline" className="w-full justify-between">
                    <span>{selectedSubjects.length > 0 ? `${selectedSubjects.length} selected` : 'Select subjects'}</span>
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
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
    const [instructors, setInstructors] = useState<Instructor[]>(initialInstructors);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);

    // State for form inputs
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subjects, setSubjects] = useState<string[]>([]);

    const resetForm = () => {
        setName('');
        setEmail('');
        setSubjects([]);
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
    };
    
    const handleAddInstructor = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const newInstructor: Instructor = {
            id: Date.now(),
            name,
            email,
            subjects,
            avatar: `https://picsum.photos/seed/${Date.now()}/40/40`,
        };
        setInstructors([...instructors, newInstructor]);
        setIsAddDialogOpen(false);
    };

    const handleEditInstructor = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedInstructor) return;
        const updatedInstructor = {
            ...selectedInstructor,
            name,
            email,
            subjects,
        };
        setInstructors(instructors.map(u => u.id === selectedInstructor.id ? updatedInstructor : u));
        setIsEditDialogOpen(false);
        setSelectedInstructor(null);
    };

    const handleDeleteInstructor = () => {
        if (!selectedInstructor) return;
        setInstructors(instructors.filter(u => u.id !== selectedInstructor.id));
        setIsDeleteDialogOpen(false);
        setSelectedInstructor(null);
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

                <Card>
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
                                                <DropdownMenuContent align="end">
                                                     <DropdownMenuItem>
                                                        <Calendar className="mr-2 h-4 w-4" />
                                                        View Schedule
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Instructor</DialogTitle>
                        <DialogDescription>
                            Enter the details for the new instructor.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="add-instructor-form" onSubmit={handleAddInstructor}>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subjects">Subjects Handled</Label>
                                <MultiSelectSubject selectedSubjects={subjects} onSelectionChange={setSubjects} />
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="add-instructor-form">Add Instructor</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
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
                                <Input id="edit-name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email Address</Label>
                                <Input id="edit-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="edit-subjects">Subjects Handled</Label>
                                <MultiSelectSubject selectedSubjects={subjects} onSelectionChange={setSubjects} />
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" form="edit-instructor-form">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the profile for <span className="font-semibold">{selectedInstructor?.name}</span>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
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
