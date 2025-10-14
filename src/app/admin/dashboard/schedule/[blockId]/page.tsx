
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Trash2, Pencil, Clock, UserX, AlertTriangle } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAdmin } from '../../../context/admin-context';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export type Subject = {
    id: number;
    code: string;
    description: string;
    day: string;
    startTime: string;
    endTime: string;
    instructor?: string;
    color: string;
};

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = Array.from({ length: 12 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`); // 7 AM to 6 PM

const HOUR_HEIGHT_REM = 4; // 4rem = 64px per hour

const timeToPosition = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    const totalMinutes = (hour - 7) * 60 + minute;
    return (totalMinutes / 60) * HOUR_HEIGHT_REM;
};

const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

const colorChoices = [
    'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400',
    'bg-green-200/50 dark:bg-green-800/50 border-green-400',
    'bg-yellow-200/50 dark:bg-yellow-800/50 border-yellow-400',
    'bg-orange-200/50 dark:bg-orange-800/50 border-orange-400',
    'bg-purple-200/50 dark:bg-purple-800/50 border-purple-400',
    'bg-pink-200/50 dark:bg-pink-800/50 border-pink-400',
    'bg-red-200/50 dark:bg-red-800/50 border-red-400',
    'bg-indigo-200/50 dark:bg-indigo-800/50 border-indigo-400',
];

const detailedTimeSlots = Array.from({ length: 12 * 2 }, (_, i) => {
    const hour = Math.floor(i / 2) + 7;
    const minute = (i % 2) * 30;
    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    return { value: time, label: formatTime(time) };
});

export default function SchedulePage() {
    const params = useParams();
    const blockId = decodeURIComponent(params.blockId as string);
    const { toast } = useToast();
    const { adminData, setAdminData } = useAdmin();
    const { schedules, instructors, subjects: allSubjectsFromContext, students } = adminData;

    const subjects = schedules[blockId] || [];

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [deleteInput, setDeleteInput] = useState('');

    const studentsInBlock = useMemo(() => students.filter(s => s.block === blockId), [students, blockId]);
    
    const blockYear = useMemo(() => adminData.blocks.find(b => b.name === blockId)?.year, [adminData.blocks, blockId]);

    const availableSubjectsForBlock = useMemo(() => {
        if (!blockYear) return [];
        return allSubjectsFromContext[blockYear] || [];
    }, [allSubjectsFromContext, blockYear]);


    const hasConflict = (newSubject: Omit<Subject, 'id' | 'color' | 'description'>, editingSubjectId: number | null = null) => {
        const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const newStartTime = toMinutes(newSubject.startTime);
        const newEndTime = toMinutes(newSubject.endTime);

        for (const [blockName, schedule] of Object.entries(schedules)) {
            for (const existingSubject of schedule) {
                if (editingSubjectId && existingSubject.id === editingSubjectId) continue;
                if (existingSubject.day !== newSubject.day) continue;

                const existingStartTime = toMinutes(existingSubject.startTime);
                const existingEndTime = toMinutes(existingSubject.endTime);
                
                const timeOverlap = newStartTime < existingEndTime && newEndTime > existingStartTime;

                if (newSubject.instructor && newSubject.instructor === existingSubject.instructor && timeOverlap) {
                     toast({
                        variant: "destructive",
                        title: "Scheduling Conflict",
                        description: `${newSubject.instructor} is already scheduled for ${existingSubject.code} in ${blockName} at this time.`,
                    });
                    return true;
                }
                
                if (blockName === blockId && timeOverlap) {
                    toast({
                        variant: "destructive",
                        title: "Scheduling Conflict",
                        description: `Block ${blockId} already has a class (${existingSubject.code}) scheduled at this time.`,
                    });
                    return true;
                }
            }
        }
        return false;
    }

    const handleAddSubject = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        const selectedSubjectId = formData.get('subject') as string;
        const selectedSubject = availableSubjectsForBlock.find(s => s.code === selectedSubjectId);

        if (!selectedSubject) {
            toast({
                variant: "destructive",
                title: "Invalid Subject",
                description: "Please select a valid subject from the list.",
            });
            return;
        }

        const newSubjectData = {
            code: selectedSubject.code,
            instructor: formData.get('instructor') as string,
            day: formData.get('day') as string,
            startTime: formData.get('startTime') as string,
            endTime: formData.get('endTime') as string,
        };

        if (Object.values(newSubjectData).some(val => val === null || val === '')) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill out all required fields.",
            });
            return;
        }

        if (hasConflict(newSubjectData)) {
            return;
        }

        const randomColor = colorChoices[Math.floor(Math.random() * colorChoices.length)];
        
        const newSubject: Subject = { 
            ...newSubjectData, 
            id: Date.now(), 
            description: selectedSubject.description,
            color: randomColor 
        };

        const newSchedules = {
            ...schedules,
            [blockId]: [...(schedules[blockId] || []), newSubject]
        };

        setAdminData(prev => ({...prev, schedules: newSchedules}));
        setIsAddDialogOpen(false);
         toast({
            title: "Schedule Added",
            description: `${newSubject.code} has been added to the schedule for ${blockId}.`,
        });
    };
    
    const handleEditSubject = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!subjectToEdit) return;

        const formData = new FormData(e.currentTarget);
        const subjectCodeFromState = subjectToEdit.code;
        
        const selectedSubject = availableSubjectsForBlock.find(s => s.code === subjectCodeFromState);

        if (!selectedSubject) {
            toast({ variant: "destructive", title: "Invalid Subject", description: "An error occurred while trying to find the subject details." });
            return;
        }

        const updatedSubjectData = {
            code: selectedSubject.code,
            instructor: formData.get('instructor') as string,
            day: formData.get('day') as string,
            startTime: formData.get('startTime') as string,
            endTime: formData.get('endTime') as string,
        };

        if (hasConflict(updatedSubjectData, subjectToEdit.id)) {
            return;
        }

        const updatedSubject: Subject = { 
            ...subjectToEdit,
            ...updatedSubjectData,
            description: selectedSubject.description,
        };
        
        const updatedSubjects = subjects.map(s => s.id === subjectToEdit.id ? updatedSubject : s);
        const updatedSchedules = {...schedules, [blockId]: updatedSubjects };

        setAdminData(prev => ({...prev, schedules: updatedSchedules}));

        setIsEditDialogOpen(false);
        setSubjectToEdit(null);
        toast({
            title: "Schedule Updated",
            description: `${updatedSubject.code} has been updated.`,
        });
    };

    const openEditDialog = (subject: Subject) => {
        setSubjectToEdit(subject);
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (subject: Subject) => {
        setSubjectToDelete(subject);
        setIsDeleteDialogOpen(true);
        setDeleteInput('');
    };

    const handleDeleteSubject = () => {
        if (subjectToDelete) {
            const updatedSubjects = subjects.filter(s => s.id !== subjectToDelete.id);
            const updatedSchedules = {...schedules, [blockId]: updatedSubjects };
            setAdminData(prev => ({...prev, schedules: updatedSchedules}));

            setIsDeleteDialogOpen(false);
            setSubjectToDelete(null);
            toast({
                title: "Schedule Removed",
                description: `${subjectToDelete.code} has been removed from the schedule.`,
            });
        }
    };

    return (
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Class Schedule for {blockId}</h1>
                    <p className="text-muted-foreground">
                        Manage the subjects, schedule, and instructors for this block.
                    </p>
                </div>
                 <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Schedule
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Schedule</DialogTitle>
                            <DialogDescription>
                                Enter the details for the new schedule.
                            </DialogDescription>
                        </DialogHeader>
                        <form id="add-subject-form" onSubmit={handleAddSubject}>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="subject" className="text-right">Subject</Label>
                                    <Select name="subject" required>
                                        <SelectTrigger className="col-span-3 rounded-xl">
                                            <SelectValue placeholder="Select a subject" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableSubjectsForBlock.map(sub => {
                                                 const completedSubjectsForStudents = studentsInBlock.map(student => adminData.getCompletedSubjects(student.studentId).map(s => s.code));
                                                 const allStudentsHavePrereq = studentsInBlock.every(student => {
                                                     const studentCompleted = adminData.getCompletedSubjects(student.studentId).map(s => s.code);
                                                     return !sub.prerequisite || studentCompleted.includes(sub.prerequisite);
                                                 });

                                                if (!sub.prerequisite || allStudentsHavePrereq) {
                                                    return <SelectItem key={sub.id} value={sub.code}>{sub.description}</SelectItem>;
                                                }
                                                
                                                return (
                                                    <TooltipProvider key={sub.id}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="relative flex w-full cursor-not-allowed select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-muted-foreground opacity-50 outline-none">
                                                                    {sub.description}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Some students in this block have not passed the prerequisite ({sub.prerequisite}).</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="instructor" className="text-right">Instructor</Label>
                                     <Select name="instructor">
                                        <SelectTrigger className="col-span-3 rounded-xl">
                                            <SelectValue placeholder="Select an instructor (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {instructors.map(ins => <SelectItem key={ins.id} value={ins.name}>{ins.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="day" className="text-right">Day</Label>
                                    <Select name="day" required>
                                        <SelectTrigger className="col-span-3 rounded-xl">
                                            <SelectValue placeholder="Select a day" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {days.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="startTime" className="text-right">Start Time</Label>
                                    <Select name="startTime" required>
                                        <SelectTrigger className="col-span-3 rounded-xl">
                                            <SelectValue placeholder="Select start time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {detailedTimeSlots.map(ts => <SelectItem key={`start-${ts.value}`} value={ts.value}>{ts.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="endTime" className="text-right">End Time</Label>
                                    <Select name="endTime" required>
                                        <SelectTrigger className="col-span-3 rounded-xl">
                                            <SelectValue placeholder="Select end time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {detailedTimeSlots.map(ts => <SelectItem key={`end-${ts.value}`} value={ts.value}>{ts.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </form>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl">Cancel</Button>
                            <Button type="submit" form="add-subject-form" className="rounded-xl">Create Schedule</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardContent className="p-4 overflow-x-auto">
                     <div className="grid grid-cols-[4rem_repeat(6,1fr)] min-w-[800px]">
                        {/* Top-left empty cell */}
                        <div></div>
                        {/* Day Headers */}
                        {days.map(day => (
                            <div key={day} className="h-10 text-center font-semibold text-muted-foreground text-sm p-2 sticky top-0 bg-background z-10">{day}</div>
                        ))}

                        {/* Time Column and Grid */}
                        <div className="col-start-1 row-start-2 relative">
                             {timeSlots.map((time) => (
                                <div key={time} className="h-16 relative">
                                    <div className="absolute -top-2.5 right-2 text-xs text-muted-foreground">{formatTime(time)}</div>
                                </div>
                            ))}
                        </div>
                        <div className="col-start-2 col-span-6 row-start-2 relative grid grid-cols-6" style={{ height: `${timeSlots.length * HOUR_HEIGHT_REM}rem`}}>
                             {/* Grid Lines */}
                            {Array.from({ length: 12 * 6 }).map((_, i) => (
                                <div key={i} className="h-16 border-t border-r border-dashed"></div>
                            ))}
                            
                            {/* Scheduled Subjects */}
                            {subjects.map(subject => {
                                const top = timeToPosition(subject.startTime);
                                const height = timeToPosition(subject.endTime) - top;
                                const dayIndex = days.indexOf(subject.day);
                                
                                if (dayIndex === -1) return null;

                                const hasInstructor = !!subject.instructor;
                                const cardColor = hasInstructor ? subject.color : 'bg-red-200/50 dark:bg-red-900/50 border-red-500';

                                return (
                                    <div
                                        key={subject.id}
                                        className={cn("absolute rounded-lg p-2 border text-xs overflow-hidden m-px", cardColor)}
                                        style={{
                                            top: `${top}rem`,
                                            height: `${height}rem`,
                                            left: `calc(${(100 / 6) * dayIndex}% + 2px)`,
                                            width: `calc(${(100 / 6)}% - 4px)`,
                                        }}
                                    >
                                        <p className="font-bold truncate">{subject.code}</p>
                                        <p className="truncate">{subject.description}</p>
                                        {hasInstructor ? (
                                            <p className="truncate text-muted-foreground">{subject.instructor}</p>
                                        ) : (
                                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                                                <UserX className="h-3 w-3 shrink-0" />
                                                <span>No Instructor</span>
                                            </div>
                                        )}
                                        
                                        <div className="absolute bottom-1 right-1 left-1 text-muted-foreground flex items-center gap-1 bg-background/50 backdrop-blur-sm p-1 rounded-sm text-[10px]">
                                            <Clock className="h-3 w-3 shrink-0" />
                                            <span className="truncate">{formatTime(subject.startTime)} - {formatTime(subject.endTime)}</span>
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="absolute top-0 right-0 h-6 w-6 p-1 text-muted-foreground hover:bg-transparent hover:text-accent focus-visible:ring-0 focus-visible:ring-offset-0">
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
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Schedule</DialogTitle>
                        <DialogDescription>
                            Update the details for {subjectToEdit?.code}.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="edit-subject-form" onSubmit={handleEditSubject}>
                         <div className="grid gap-4 py-4">
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-subject-display" className="text-right">Subject</Label>
                                <div className="col-span-3 h-10 flex items-center">
                                    <p id="edit-subject-display" className="text-sm font-medium">
                                        {subjectToEdit?.description}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-instructor" className="text-right">Instructor</Label>
                                <Select name="instructor" defaultValue={subjectToEdit?.instructor}>
                                    <SelectTrigger className="col-span-3 rounded-xl">
                                        <SelectValue placeholder="Select an instructor (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {instructors.map(ins => <SelectItem key={ins.id} value={ins.name}>{ins.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-day" className="text-right">Day</Label>
                                <Select name="day" defaultValue={subjectToEdit?.day} required>
                                    <SelectTrigger className="col-span-3 rounded-xl">
                                        <SelectValue placeholder="Select a day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {days.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-startTime" className="text-right">Start Time</Label>
                                <Select name="startTime" defaultValue={subjectToEdit?.startTime} required>
                                    <SelectTrigger className="col-span-3 rounded-xl">
                                        <SelectValue placeholder="Select start time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {detailedTimeSlots.map(ts => <SelectItem key={`edit-start-${ts.value}`} value={ts.value}>{ts.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-endTime" className="text-right">End Time</Label>
                                <Select name="endTime" defaultValue={subjectToEdit?.endTime} required>
                                    <SelectTrigger className="col-span-3 rounded-xl">
                                        <SelectValue placeholder="Select end time" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {detailedTimeSlots.map(ts => <SelectItem key={`edit-end-${ts.value}`} value={ts.value}>{ts.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button type="submit" form="edit-subject-form" className="rounded-xl">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the schedule for <span className="font-semibold">{subjectToDelete?.code}</span>.
                             <br/><br/>
                            To confirm, please type "delete" below.
                        </AlertDialogDescription>
                        <Input 
                            id="delete-confirm" 
                            name="delete-confirm"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="mt-4"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteInput('')}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            disabled={deleteInput !== 'delete'}
                            onClick={handleDeleteSubject}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
