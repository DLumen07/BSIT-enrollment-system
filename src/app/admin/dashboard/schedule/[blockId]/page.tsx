
'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Trash2, Pencil, Clock, UserX, AlertTriangle, MapPin } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useAdmin, Instructor } from '../../../context/admin-context';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export type Subject = {
    id: number;
    code: string;
    description: string;
    day: string;
    startTime: string;
    endTime: string;
    instructorId?: number | null;
    instructor?: string;
    room?: string | null;
    color: string;
};

type ScheduleMutationResponse =
    | {
        status: 'success';
        message?: string;
        data?: {
            schedule?: Subject;
            scheduleId?: number;
        };
    }
    | {
        status: 'error';
        message?: string;
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

const TBA_INSTRUCTOR = 'TBA';
const TBA_ROOM = 'TBA';

const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
    .replace(/\/$/, '')
    .trim();

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
    const { adminData, setAdminData, refreshAdminData } = useAdmin();
    const { schedules, instructors, subjects: allSubjectsFromContext, students } = adminData;

    const instructorMap = useMemo(() => new Map(instructors.map((ins) => [ins.id, ins])), [instructors]);
    const instructorsByName = useMemo(() => {
        const map = new Map<string, Instructor>();
        instructors.forEach((ins) => {
            map.set(ins.name.toUpperCase(), ins);
        });
        return map;
    }, [instructors]);

    const assignColor = useCallback((id?: number | null, fallbackIndex?: number) => {
        const paletteLength = colorChoices.length;
        if (paletteLength === 0) {
            return 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400';
        }
        const base = typeof id === 'number' && Number.isFinite(id)
            ? Math.abs(id)
            : Math.abs(fallbackIndex ?? 0);
        return colorChoices[base % paletteLength];
    }, []);

    const subjects = useMemo(() => {
        const blockSchedules = schedules[blockId] ?? [];
        return blockSchedules.map((subject, index) => ({
            ...subject,
            color: subject.color ?? assignColor(subject.id, index),
        }));
    }, [assignColor, blockId, schedules]);

    const dayOrder = useMemo(() => {
        const order = new Map<string, number>();
        days.forEach((day, index) => {
            order.set(day, index);
        });
        return order;
    }, []);

    const sortSchedulesForBlock = useCallback((entries: Subject[]) => {
        return [...entries].sort((a, b) => {
            const dayDelta = (dayOrder.get(a.day) ?? 0) - (dayOrder.get(b.day) ?? 0);
            if (dayDelta !== 0) {
                return dayDelta;
            }
            return a.startTime.localeCompare(b.startTime);
        });
    }, [dayOrder]);

    const updateBlockSchedules = useCallback((transform: (current: Subject[]) => Subject[]) => {
        setAdminData((prev) => {
            const current = prev.schedules[blockId] ?? [];
            const transformed = transform([...current]);
            const normalized = transformed.map((entry, index) => ({
                ...entry,
                color: entry.color ?? assignColor(entry.id, index),
            }));

            return {
                ...prev,
                schedules: {
                    ...prev.schedules,
                    [blockId]: sortSchedulesForBlock(normalized),
                },
            };
        });
    }, [assignColor, blockId, setAdminData, sortSchedulesForBlock]);

    const parseInstructorSelection = useCallback((value: FormDataEntryValue | null | undefined): { id: number | null; name: string } => {
        const raw = typeof value === 'string' ? value : '';

        if (!raw || raw.startsWith('__') || raw === TBA_INSTRUCTOR) {
            return { id: null, name: TBA_INSTRUCTOR };
        }

        const numericId = Number.parseInt(raw, 10);
        if (Number.isNaN(numericId)) {
            return { id: null, name: TBA_INSTRUCTOR };
        }

        const instructor = instructorMap.get(numericId);
        if (!instructor) {
            return { id: null, name: TBA_INSTRUCTOR };
        }

        return { id: numericId, name: instructor.name };
    }, [instructorMap]);

    const getInstructorSelectValue = useCallback((subject?: Subject | null) => {
        if (!subject) {
            return undefined;
        }

        if (subject.instructorId && instructorMap.has(subject.instructorId)) {
            return subject.instructorId.toString();
        }

        if (subject.instructor) {
            const normalizedName = subject.instructor.toUpperCase();
            if (normalizedName === TBA_INSTRUCTOR) {
                return TBA_INSTRUCTOR;
            }
            const instructor = instructorsByName.get(normalizedName);
            if (instructor) {
                return instructor.id.toString();
            }
        }

        return TBA_INSTRUCTOR;
    }, [instructorMap, instructorsByName]);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [deleteInput, setDeleteInput] = useState('');
    const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('');
    const [isAddSubmitting, setIsAddSubmitting] = useState(false);
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);
    const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
    const [addRoom, setAddRoom] = useState('');
    const [isAddRoomTBA, setIsAddRoomTBA] = useState(false);
    const [editRoom, setEditRoom] = useState('');
    const [isEditRoomTBA, setIsEditRoomTBA] = useState(false);

    const studentsInBlock = useMemo(() => students.filter(s => s.block === blockId), [students, blockId]);
    
    const blockYear = useMemo(() => adminData.blocks.find(b => b.name === blockId)?.year, [adminData.blocks, blockId]);

    const availableSubjectsForBlock = useMemo(() => {
        if (!blockYear) return [];
        return allSubjectsFromContext[blockYear] || [];
    }, [allSubjectsFromContext, blockYear]);

    const findInstructorsForSubject = useCallback(
        (subjectCode?: string | null): Instructor[] => {
            if (!subjectCode) {
                return [];
            }

            const normalizedCode = subjectCode.toUpperCase();

            return instructors.filter((instructor) =>
                (instructor.subjects ?? []).some((subjectId) => subjectId.toUpperCase() === normalizedCode),
            );
        },
        [instructors],
    );

    const eligibleInstructorsForAdd = useMemo(
        () => findInstructorsForSubject(selectedSubjectCode),
        [findInstructorsForSubject, selectedSubjectCode],
    );

    const eligibleInstructorsForEdit = useMemo(() => {
        if (!subjectToEdit) {
            return [] as Instructor[];
        }

        const matches = [...findInstructorsForSubject(subjectToEdit.code)];

        if (subjectToEdit.instructorId) {
            const alreadyIncluded = matches.some((instructor) => instructor.id === subjectToEdit.instructorId);
            if (!alreadyIncluded) {
                const fallback = instructors.find((instructor) => instructor.id === subjectToEdit.instructorId);
                if (fallback) {
                    matches.push(fallback);
                }
            }
        } else if (subjectToEdit.instructor) {
            const normalizedName = subjectToEdit.instructor.toUpperCase();
            if (normalizedName !== TBA_INSTRUCTOR) {
                const fallbackByName = instructorsByName.get(normalizedName);
                if (fallbackByName && !matches.some((instructor) => instructor.id === fallbackByName.id)) {
                    matches.push(fallbackByName);
                }
            }
        }

        return matches;
    }, [findInstructorsForSubject, subjectToEdit, instructors, instructorsByName]);

    useEffect(() => {
        if (subjectToEdit) {
            const rawRoom = subjectToEdit.room ?? '';
            const trimmedRoom = rawRoom.trim();
            if (trimmedRoom === '' || trimmedRoom.toUpperCase() === TBA_ROOM) {
                setIsEditRoomTBA(true);
                setEditRoom('');
            } else {
                setIsEditRoomTBA(false);
                setEditRoom(rawRoom);
            }
        } else {
            setIsEditRoomTBA(false);
            setEditRoom('');
        }
    }, [subjectToEdit]);


    const hasConflict = (newSubject: Omit<Subject, 'id' | 'color' | 'description'>, editingSubjectId: number | null = null) => {
        const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        const newStartTime = toMinutes(newSubject.startTime);
        const newEndTime = toMinutes(newSubject.endTime);
        const newInstructorId = typeof newSubject.instructorId === 'number' && Number.isFinite(newSubject.instructorId)
            ? newSubject.instructorId
            : null;
        const newInstructorName = (newSubject.instructor ?? '').trim();
        const normalizedNewInstructorName = newInstructorName.toUpperCase();
        const hasInstructor = (newInstructorId !== null && newInstructorId > 0)
            || (newInstructorName !== '' && normalizedNewInstructorName !== TBA_INSTRUCTOR);
        const newRoomRaw = (newSubject.room ?? '').trim();
        const normalizedNewRoom = newRoomRaw.toUpperCase();
        const hasRoom = normalizedNewRoom !== '' && normalizedNewRoom !== TBA_ROOM;

        const instructorDisplayName = newInstructorName !== ''
            ? newInstructorName
            : (newInstructorId !== null ? instructorMap.get(newInstructorId)?.name ?? 'Selected instructor' : TBA_INSTRUCTOR);

        for (const [blockName, schedule] of Object.entries(schedules)) {
            for (const existingSubject of schedule) {
                if (editingSubjectId && existingSubject.id === editingSubjectId) continue;
                if (existingSubject.day !== newSubject.day) continue;

                const existingStartTime = toMinutes(existingSubject.startTime);
                const existingEndTime = toMinutes(existingSubject.endTime);
                const existingInstructorId = typeof existingSubject.instructorId === 'number' && Number.isFinite(existingSubject.instructorId)
                    ? existingSubject.instructorId
                    : null;
                const existingInstructorName = (existingSubject.instructor ?? '').trim();
                const normalizedExistingInstructor = existingInstructorName.toUpperCase();
                const existingHasInstructor = (existingInstructorId !== null && existingInstructorId > 0)
                    || (existingInstructorName !== '' && normalizedExistingInstructor !== TBA_INSTRUCTOR);
                const existingRoomRaw = (existingSubject.room ?? '').trim();
                const normalizedExistingRoom = existingRoomRaw.toUpperCase();
                const existingHasRoom = normalizedExistingRoom !== '' && normalizedExistingRoom !== TBA_ROOM;
                
                const timeOverlap = newStartTime < existingEndTime && newEndTime > existingStartTime;

                const instructorConflict = hasInstructor && existingHasInstructor && (
                    (newInstructorId !== null && existingInstructorId !== null && newInstructorId === existingInstructorId)
                    || (
                        (newInstructorId === null || newInstructorId <= 0)
                        && (existingInstructorId === null || existingInstructorId <= 0)
                        && newInstructorName !== ''
                        && newInstructorName === existingInstructorName
                    )
                );

                if (instructorConflict && timeOverlap) {
                     toast({
                        variant: "destructive",
                        title: "Scheduling Conflict",
                        description: `${instructorDisplayName} is already scheduled for ${existingSubject.code} in ${blockName} at this time.`,
                    });
                    return true;
                }

                if (hasRoom && existingHasRoom && normalizedExistingRoom === normalizedNewRoom && timeOverlap) {
                    toast({
                        variant: "destructive",
                        title: "Room Conflict",
                        description: `Room ${newRoomRaw} is already booked for ${existingSubject.code} in ${blockName} at this time.`,
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

    const handleAddSubject = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isAddSubmitting) {
            return;
        }

        const formData = new FormData(e.currentTarget);

        const selectedSubjectCodeValue = formData.get('subject');
        const selectedSubject = typeof selectedSubjectCodeValue === 'string'
            ? availableSubjectsForBlock.find((s) => s.code === selectedSubjectCodeValue)
            : undefined;

        if (!selectedSubject) {
            toast({
                variant: "destructive",
                title: "Invalid Subject",
                description: "Please select a valid subject from the list.",
            });
            return;
        }

        const instructorSelection = parseInstructorSelection(formData.get('instructor'));

        const normalizedAddRoom = isAddRoomTBA ? null : (() => {
            const raw = addRoom.trim();
            return raw === '' || raw.toUpperCase() === TBA_ROOM ? null : raw;
        })();

        const newSubjectData: Omit<Subject, 'id' | 'color' | 'description'> = {
            code: selectedSubject.code,
            instructor: instructorSelection.name,
            instructorId: instructorSelection.id,
            day: (formData.get('day') as string) ?? '',
            startTime: (formData.get('startTime') as string) ?? '',
            endTime: (formData.get('endTime') as string) ?? '',
            room: normalizedAddRoom,
        };

        if (!newSubjectData.day || !newSubjectData.startTime || !newSubjectData.endTime) {
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

        setIsAddSubmitting(true);

        try {
            const response = await fetch(`${API_BASE_URL}/create_schedule.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    blockName: blockId,
                    subjectId: selectedSubject.id,
                    dayOfWeek: newSubjectData.day,
                    startTime: newSubjectData.startTime,
                    endTime: newSubjectData.endTime,
                    instructorId: instructorSelection.id,
                    room: normalizedAddRoom,
                }),
            });

            const payload = await response.json().catch(() => null) as ScheduleMutationResponse | null;

            if (!response.ok || !payload || payload.status !== 'success' || !payload.data?.schedule) {
                const message = payload?.message ?? `Failed to create schedule (${response.status})`;
                throw new Error(message);
            }

            const createdSchedule = payload.data.schedule;

            updateBlockSchedules((current) => [
                ...current,
                {
                    ...createdSchedule,
                    description: createdSchedule.description ?? selectedSubject.description,
                    instructor: createdSchedule.instructor ?? newSubjectData.instructor,
                    instructorId: createdSchedule.instructorId ?? instructorSelection.id,
                    room: createdSchedule.room ?? newSubjectData.room ?? null,
                },
            ]);

            setIsAddDialogOpen(false);
            setSelectedSubjectCode('');
            setAddRoom('');
            setIsAddRoomTBA(false);
            toast({
                title: "Schedule Added",
                description: `${createdSchedule.code} has been added to the schedule for ${blockId}.`,
            });

            try {
                await refreshAdminData();
            } catch (refreshError) {
                console.error('Failed to refresh admin data after creating schedule', refreshError);
                toast({
                    variant: "default",
                    title: "Refresh Failed",
                    description: "Schedule saved but the latest data could not be fetched automatically. Please reload to confirm.",
                });
            }
        } catch (error) {
            console.error('Failed to add schedule', error);
            toast({
                variant: "destructive",
                title: "Failed to Add Schedule",
                description: error instanceof Error ? error.message : 'Unexpected error occurred while creating the schedule.',
            });
        } finally {
            setIsAddSubmitting(false);
        }
    };

    const handleEditSubject = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!subjectToEdit || isEditSubmitting) {
            return;
        }

        const formData = new FormData(e.currentTarget);
        const subjectCodeFromState = subjectToEdit.code;

        const selectedSubject = availableSubjectsForBlock.find((s) => s.code === subjectCodeFromState);

        if (!selectedSubject) {
            toast({
                variant: "destructive",
                title: "Invalid Subject",
                description: "An error occurred while trying to find the subject details.",
            });
            return;
        }

        const instructorSelection = parseInstructorSelection(formData.get('instructor'));

        const normalizedEditRoom = isEditRoomTBA ? null : (() => {
            const raw = editRoom.trim();
            return raw === '' || raw.toUpperCase() === TBA_ROOM ? null : raw;
        })();

        const updatedSubjectData: Omit<Subject, 'id' | 'color' | 'description'> = {
            code: selectedSubject.code,
            instructor: instructorSelection.name,
            instructorId: instructorSelection.id,
            day: (formData.get('day') as string) ?? '',
            startTime: (formData.get('startTime') as string) ?? '',
            endTime: (formData.get('endTime') as string) ?? '',
            room: normalizedEditRoom,
        };

        if (hasConflict(updatedSubjectData, subjectToEdit.id)) {
            return;
        }

        setIsEditSubmitting(true);

        try {
            const response = await fetch(`${API_BASE_URL}/update_schedule.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    scheduleId: subjectToEdit.id,
                    dayOfWeek: updatedSubjectData.day,
                    startTime: updatedSubjectData.startTime,
                    endTime: updatedSubjectData.endTime,
                    instructorId: instructorSelection.id,
                    room: normalizedEditRoom,
                }),
            });

            const payload = await response.json().catch(() => null) as ScheduleMutationResponse | null;

            if (!response.ok || !payload || payload.status !== 'success' || !payload.data?.schedule) {
                const message = payload?.message ?? `Failed to update schedule (${response.status})`;
                throw new Error(message);
            }

            const updatedSchedule = payload.data.schedule;

            updateBlockSchedules((current) => current.map((item) =>
                item.id === subjectToEdit.id
                    ? {
                        ...item,
                        ...updatedSchedule,
                        description: updatedSchedule.description ?? selectedSubject.description ?? item.description,
                        instructor: updatedSchedule.instructor ?? updatedSubjectData.instructor,
                        instructorId: updatedSchedule.instructorId ?? instructorSelection.id,
                        room: updatedSchedule.room ?? updatedSubjectData.room ?? null,
                    }
                    : item,
            ));

            setIsEditDialogOpen(false);
            setSubjectToEdit(null);
            setEditRoom('');
            setIsEditRoomTBA(false);
            toast({
                title: "Schedule Updated",
                description: `${updatedSchedule.code} has been updated.`,
            });

            try {
                await refreshAdminData();
            } catch (refreshError) {
                console.error('Failed to refresh admin data after updating schedule', refreshError);
                toast({
                    variant: "default",
                    title: "Refresh Failed",
                    description: "Schedule updated but the latest data could not be fetched automatically. Please reload to confirm.",
                });
            }
        } catch (error) {
            console.error('Failed to update schedule', error);
            toast({
                variant: "destructive",
                title: "Failed to Update Schedule",
                description: error instanceof Error ? error.message : 'Unexpected error occurred while updating the schedule.',
            });
        } finally {
            setIsEditSubmitting(false);
        }
    };

    const openEditDialog = (subject: Subject) => {
        if (isEditSubmitting) {
            return;
        }
        const rawRoom = subject.room ?? '';
        const trimmedRoom = rawRoom.trim();
        if (trimmedRoom === '' || trimmedRoom.toUpperCase() === TBA_ROOM) {
            setIsEditRoomTBA(true);
            setEditRoom('');
        } else {
            setIsEditRoomTBA(false);
            setEditRoom(rawRoom);
        }
        setSubjectToEdit(subject);
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (subject: Subject) => {
        if (isDeleteSubmitting) {
            return;
        }
        setSubjectToDelete(subject);
        setIsDeleteDialogOpen(true);
        setDeleteInput('');
    };

    const handleDeleteSubject = async () => {
        if (!subjectToDelete || isDeleteSubmitting) {
            return;
        }

        setIsDeleteSubmitting(true);
        const scheduleId = subjectToDelete.id;
        const deletedCode = subjectToDelete.code;

        try {
            const response = await fetch(`${API_BASE_URL}/delete_schedule.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    scheduleId,
                }),
            });

            const payload = await response.json().catch(() => null) as ScheduleMutationResponse | null;

            if (!response.ok || !payload || payload.status !== 'success') {
                const message = payload?.message ?? `Failed to delete schedule (${response.status})`;
                throw new Error(message);
            }

            updateBlockSchedules((current) => current.filter((item) => item.id !== scheduleId));

            setIsDeleteDialogOpen(false);
            setSubjectToDelete(null);
            setDeleteInput('');
            toast({
                title: "Schedule Removed",
                description: `${deletedCode} has been removed from the schedule.`,
            });

            try {
                await refreshAdminData();
            } catch (refreshError) {
                console.error('Failed to refresh admin data after deleting schedule', refreshError);
                toast({
                    variant: "default",
                    title: "Refresh Failed",
                    description: "Schedule deleted but the latest data could not be fetched automatically. Please reload to confirm.",
                });
            }
        } catch (error) {
            console.error('Failed to delete schedule', error);
            toast({
                variant: "destructive",
                title: "Failed to Delete Schedule",
                description: error instanceof Error ? error.message : 'Unexpected error occurred while deleting the schedule.',
            });
        } finally {
            setIsDeleteSubmitting(false);
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
                 <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                        if (isAddSubmitting) {
                            return;
                        }
                        setIsAddDialogOpen(open);
                        if (open) {
                            setSelectedSubjectCode('');
                            setAddRoom('');
                            setIsAddRoomTBA(false);
                        } else {
                            setSelectedSubjectCode('');
                            setAddRoom('');
                            setIsAddRoomTBA(false);
                        }
                    }}>
                    <DialogTrigger asChild>
                        <Button className="rounded-full" disabled={isAddSubmitting}>
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
                                    <Select
                                        name="subject"
                                        required
                                        disabled={isAddSubmitting}
                                        value={selectedSubjectCode}
                                        onValueChange={(value) => setSelectedSubjectCode(value)}
                                    >
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
                                     <Select name="instructor" disabled={isAddSubmitting}>
                                        <SelectTrigger className="col-span-3 rounded-xl">
                                            <SelectValue placeholder="Select an instructor (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedSubjectCode.length === 0 ? (
                                                <SelectItem value="__select-subject" disabled>
                                                    Select a subject first
                                                </SelectItem>
                                            ) : (
                                                <>
                                                    {eligibleInstructorsForAdd.map((ins) => (
                                                        <SelectItem key={ins.id} value={ins.id.toString()}>{ins.name}</SelectItem>
                                                    ))}
                                                    <SelectItem value={TBA_INSTRUCTOR}>
                                                        {eligibleInstructorsForAdd.length > 0
                                                            ? 'Assign Later (TBA)'
                                                            : 'No eligible instructors – set to TBA'}
                                                    </SelectItem>
                                                </>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="room" className="text-right">Room</Label>
                                    <div className="col-span-3 flex items-center gap-3">
                                        <Input
                                            id="room"
                                            name="room"
                                            value={isAddRoomTBA ? '' : addRoom}
                                            onChange={(event) => setAddRoom(event.target.value)}
                                            disabled={isAddSubmitting || isAddRoomTBA}
                                            placeholder="e.g., Room 101"
                                            className="rounded-xl"
                                        />
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Switch
                                                id="room-tba"
                                                checked={isAddRoomTBA}
                                                onCheckedChange={setIsAddRoomTBA}
                                                disabled={isAddSubmitting}
                                            />
                                            <span>TBA</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="day" className="text-right">Day</Label>
                                    <Select name="day" required disabled={isAddSubmitting}>
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
                                    <Select name="startTime" required disabled={isAddSubmitting}>
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
                                    <Select name="endTime" required disabled={isAddSubmitting}>
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
                            <Button
                                variant="outline"
                                onClick={() => setIsAddDialogOpen(false)}
                                className="rounded-xl"
                                disabled={isAddSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                form="add-subject-form"
                                className="rounded-xl"
                                disabled={isAddSubmitting}
                            >
                                {isAddSubmitting ? 'Saving...' : 'Create Schedule'}
                            </Button>
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
                                const normalizedRoom = (subject.room ?? '').trim();
                                const hasRoomAssigned = normalizedRoom !== '' && normalizedRoom.toUpperCase() !== TBA_ROOM;

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
                                        {hasRoomAssigned ? (
                                            <div className="mt-1 flex items-center gap-1 text-muted-foreground text-[10px]">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{normalizedRoom}</span>
                                            </div>
                                        ) : (
                                            <div className="mt-1 flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px]">
                                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                                <span className="truncate">Room TBA</span>
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
            <Dialog
                open={isEditDialogOpen}
                onOpenChange={(open) => {
                    if (isEditSubmitting) {
                        return;
                    }
                    setIsEditDialogOpen(open);
                    if (!open) {
                        setSubjectToEdit(null);
                        setEditRoom('');
                        setIsEditRoomTBA(false);
                    }
                }}
            >
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
                                <Select
                                    name="instructor"
                                    defaultValue={getInstructorSelectValue(subjectToEdit)}
                                    disabled={isEditSubmitting}
                                >
                                    <SelectTrigger className="col-span-3 rounded-xl">
                                        <SelectValue placeholder="Select an instructor (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjectToEdit ? (
                                            <>
                                                {eligibleInstructorsForEdit.map((ins) => (
                                                    <SelectItem key={ins.id} value={ins.id.toString()}>{ins.name}</SelectItem>
                                                ))}
                                                <SelectItem value={TBA_INSTRUCTOR}>
                                                    Assign Later (TBA)
                                                </SelectItem>
                                            </>
                                        ) : null}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-room" className="text-right">Room</Label>
                                <div className="col-span-3 flex items-center gap-3">
                                    <Input
                                        id="edit-room"
                                        name="room"
                                        value={isEditRoomTBA ? '' : editRoom}
                                        onChange={(event) => setEditRoom(event.target.value)}
                                        disabled={isEditSubmitting || isEditRoomTBA}
                                        placeholder="e.g., Room 101"
                                        className="rounded-xl"
                                    />
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Switch
                                            id="edit-room-tba"
                                            checked={isEditRoomTBA}
                                            onCheckedChange={setIsEditRoomTBA}
                                            disabled={isEditSubmitting}
                                        />
                                        <span>TBA</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-day" className="text-right">Day</Label>
                                <Select name="day" defaultValue={subjectToEdit?.day} required disabled={isEditSubmitting}>
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
                                <Select name="startTime" defaultValue={subjectToEdit?.startTime} required disabled={isEditSubmitting}>
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
                                <Select name="endTime" defaultValue={subjectToEdit?.endTime} required disabled={isEditSubmitting}>
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
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                            className="rounded-xl"
                            disabled={isEditSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="edit-subject-form"
                            className="rounded-xl"
                            disabled={isEditSubmitting}
                        >
                            {isEditSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => {
                    if (isDeleteSubmitting) {
                        return;
                    }
                    setIsDeleteDialogOpen(open);
                    if (!open) {
                        setDeleteInput('');
                    }
                }}
            >
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
                            disabled={isDeleteSubmitting}
                            className="mt-4"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteInput('')} disabled={isDeleteSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            disabled={deleteInput !== 'delete' || isDeleteSubmitting}
                            onClick={handleDeleteSubject}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleteSubmitting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
