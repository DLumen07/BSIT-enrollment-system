
'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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


type Subject = {
    id: number;
    code: string;
    description: string;
    units: number;
};

type YearLevelSubjects = Record<string, Subject[]>;

const initialSubjects: YearLevelSubjects = {
    '1st-year': [
        { id: 101, code: 'IT 101', description: 'Introduction to Computing', units: 3 },
        { id: 102, code: 'MATH 101', description: 'Calculus 1', units: 3 },
    ],
    '2nd-year': [
         { id: 201, code: 'IT 201', description: 'Data Structures & Algorithms', units: 3 },
    ],
    '3rd-year': [],
    '4th-year': [],
};

const yearLevels = [
    { value: '1st-year', label: '1st Year' },
    { value: '2nd-year', label: '2nd Year' },
    { value: '3rd-year', label: '3rd Year' },
    { value: '4th-year', label: '4th Year' },
];

export default function ManageSubjectsPage() {
    const [subjects, setSubjects] = useState<YearLevelSubjects>(initialSubjects);
    const [activeTab, setActiveTab] = useState(yearLevels[0].value);
    
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);

    const openAddDialog = () => {
        setCurrentSubject(null);
        setIsAddDialogOpen(true);
    };

    const openEditDialog = (subject: Subject) => {
        setCurrentSubject(subject);
        setIsEditDialogOpen(true);
    };
    
    const openDeleteDialog = (subject: Subject) => {
        setCurrentSubject(subject);
        setIsDeleteDialogOpen(true);
    };

    const handleAddSubject = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newSubject: Subject = {
            id: Date.now(),
            code: formData.get('code') as string,
            description: formData.get('description') as string,
            units: parseInt(formData.get('units') as string, 10),
        };
        setSubjects(prev => ({
            ...prev,
            [activeTab]: [...prev[activeTab], newSubject],
        }));
        setIsAddDialogOpen(false);
    };

    const handleEditSubject = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!currentSubject) return;
        const formData = new FormData(e.currentTarget);
        const updatedSubject = {
            ...currentSubject,
            code: formData.get('code') as string,
            description: formData.get('description') as string,
            units: parseInt(formData.get('units') as string, 10),
        };
        setSubjects(prev => ({
            ...prev,
            [activeTab]: prev[activeTab].map(s => s.id === currentSubject.id ? updatedSubject : s),
        }));
        setIsEditDialogOpen(false);
        setCurrentSubject(null);
    };

     const handleDeleteSubject = () => {
        if (!currentSubject) return;
        setSubjects(prev => ({
            ...prev,
            [activeTab]: prev[activeTab].filter(s => s.id !== currentSubject.id),
        }));
        setIsDeleteDialogOpen(false);
        setCurrentSubject(null);
    };

  return (
    <>
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Manage Subjects</h1>
                    <p className="text-muted-foreground">Add, edit, or remove subjects for each year level.</p>
                </div>
                 <Button onClick={openAddDialog} className="rounded-full">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Subject
                </Button>
            </div>
            
            <Card>
                <CardContent className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-4">
                            {yearLevels.map(yl => (
                                <TabsTrigger key={yl.value} value={yl.value}>
                                    {yl.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    
                         {yearLevels.map(yl => (
                            <TabsContent key={yl.value} value={yl.value}>
                                <div className="border rounded-lg mt-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Subject Code</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead>Units</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {subjects[yl.value].length > 0 ? (
                                                subjects[yl.value].map(subject => (
                                                    <TableRow key={subject.id}>
                                                        <TableCell className="font-medium">{subject.code}</TableCell>
                                                        <TableCell>{subject.description}</TableCell>
                                                        <TableCell>{subject.units}</TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-accent focus-visible:ring-0 focus-visible:ring-offset-0">
                                                                        <span className="sr-only">Open menu</span>
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onSelect={() => openEditDialog(subject)}>
                                                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem 
                                                                        className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                                        onSelect={() => openDeleteDialog(subject)}
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center h-24">
                                                        No subjects created for this year level.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Subject</DialogTitle>
                    <DialogDescription>
                        Enter details for the new subject for {yearLevels.find(yl => yl.value === activeTab)?.label}.
                    </DialogDescription>
                </DialogHeader>
                <form id="add-subject-form" onSubmit={handleAddSubject}>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="code">Subject Code</Label>
                            <Input id="code" name="code" placeholder="e.g., IT 102" required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input id="description" name="description" placeholder="e.g., Computer Programming 1" required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="units">Units</Label>
                            <Input id="units" name="units" type="number" placeholder="e.g., 3" required />
                        </div>
                    </div>
                </form>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" form="add-subject-form">Create Subject</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Subject</DialogTitle>
                    <DialogDescription>Update the details for {currentSubject?.code}.</DialogDescription>
                </DialogHeader>
                <form id="edit-subject-form" onSubmit={handleEditSubject}>
                     <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit-code">Subject Code</Label>
                            <Input id="edit-code" name="code" defaultValue={currentSubject?.code} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Input id="edit-description" name="description" defaultValue={currentSubject?.description} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="edit-units">Units</Label>
                            <Input id="edit-units" name="units" type="number" defaultValue={currentSubject?.units} required />
                        </div>
                    </div>
                </form>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" form="edit-subject-form">Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the subject <span className="font-semibold">{currentSubject?.code}</span>. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSubject} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}

    

    

    