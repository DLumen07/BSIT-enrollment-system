
'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Trash2, Pencil, Clock, UserX, AlertTriangle, MapPin, CalendarClock, User2, Layers } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
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
import { useAdmin, Instructor, deriveTeachingAssignments } from '../../../context/admin-context';
import { useToast } from "@/hooks/use-toast";

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

const HOUR_HEIGHT_REM = 5; // Increased height for better readability

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

// Color palette for schedule blocks to ensure visibility in dark mode
const SCHEDULE_COLORS = [
    { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-100', accent: 'text-blue-400' },
    { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-100', accent: 'text-orange-400' },
    { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-100', accent: 'text-green-400' },
    { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-100', accent: 'text-purple-400' },
    { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-100', accent: 'text-pink-400' },
    { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-100', accent: 'text-cyan-400' },
];

const getSubjectColor = (code: string) => {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
    }
    return SCHEDULE_COLORS[Math.abs(hash) % SCHEDULE_COLORS.length];
};

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

    const subjects = useMemo(() => {
        const blockSchedules = schedules[blockId] ?? [];
        return blockSchedules.map((subject) => ({
            ...subject,
            color: subject.color ?? '',
        }));
    }, [blockId, schedules]);

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
            const normalized = transformed.map((entry) => ({
                ...entry,
                color: entry.color ?? '',
            }));

            const updatedSchedules = {
                ...prev.schedules,
                [blockId]: sortSchedulesForBlock(normalized),
            };

            return {
                ...prev,
                schedules: updatedSchedules,
                teachingAssignments: deriveTeachingAssignments(
                    updatedSchedules,
                    prev.academicYear,
                    prev.semester,
                    prev.instructors,
                ),
            };
        });
    }, [blockId, setAdminData, sortSchedulesForBlock]);

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

    const blockYear = useMemo(() => adminData.blocks.find(b => b.name === blockId)?.year, [adminData.blocks, blockId]);

    const availableSubjectsForBlock = useMemo(() => {
        if (!blockYear) return [];
        const subjectsForYear = allSubjectsFromContext[blockYear] || [];
        const validSemesters: Array<'1st-sem' | '2nd-sem' | 'summer'> = ['1st-sem', '2nd-sem', 'summer'];
        const activeSemester = validSemesters.includes(adminData.semester as '1st-sem' | '2nd-sem' | 'summer')
            ? (adminData.semester as '1st-sem' | '2nd-sem' | 'summer')
            : '1st-sem';
        const filtered = subjectsForYear.filter(subject => subject.semester === activeSemester);
        return filtered.length > 0 ? filtered : subjectsForYear;
    }, [allSubjectsFromContext, blockYear, adminData.semester]);

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
        <main className="flex-1 p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <CalendarClock className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold">Class Schedule for {blockId}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <span className="text-muted-foreground">Manage the subjects, schedule, and instructors for this block.</span>
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
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
                                <Button className="rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 border-0" disabled={isAddSubmitting}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Schedule
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                                <DialogHeader>
                                    <DialogTitle className="text-white">Add New Schedule</DialogTitle>
                                    <DialogDescription className="text-slate-400">
                                        Enter the details for the new schedule.
                                    </DialogDescription>
                                </DialogHeader>
                                <form id="add-subject-form" onSubmit={handleAddSubject}>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="subject" className="text-right text-slate-300">Subject</Label>
                                            <Select
                                                name="subject"
                                                required
                                                disabled={isAddSubmitting}
                                                value={selectedSubjectCode}
                                                onValueChange={(value) => setSelectedSubjectCode(value)}
                                            >
                                                <SelectTrigger className="col-span-3 rounded-xl bg-white/5 border-white/10 text-white focus:ring-blue-500/20">
                                                    <SelectValue placeholder="Select a subject" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                                    {availableSubjectsForBlock.map((sub) => (
                                                        <SelectItem key={sub.id} value={sub.code} className="focus:bg-white/10 focus:text-white">
                                                            {sub.description}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="instructor" className="text-right text-slate-300">Instructor</Label>
                                             <Select name="instructor" disabled={isAddSubmitting}>
                                                <SelectTrigger className="col-span-3 rounded-xl bg-white/5 border-white/10 text-white focus:ring-blue-500/20">
                                                    <SelectValue placeholder="Select an instructor (optional)" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                                    {selectedSubjectCode.length === 0 ? (
                                                        <SelectItem value="__select-subject" disabled className="text-slate-500">
                                                            Select a subject first
                                                        </SelectItem>
                                                    ) : (
                                                        <>
                                                            {eligibleInstructorsForAdd.map((ins) => (
                                                                <SelectItem key={ins.id} value={ins.id.toString()} className="focus:bg-white/10 focus:text-white">{ins.name}</SelectItem>
                                                            ))}
                                                            <SelectItem value={TBA_INSTRUCTOR} className="focus:bg-white/10 focus:text-white">
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
                                            <Label htmlFor="room" className="text-right text-slate-300">Room</Label>
                                            <div className="col-span-3 flex items-center gap-3">
                                                <Input
                                                    id="room"
                                                    name="room"
                                                    value={isAddRoomTBA ? '' : addRoom}
                                                    onChange={(event) => setAddRoom(event.target.value)}
                                                    disabled={isAddSubmitting || isAddRoomTBA}
                                                    placeholder="e.g., Room 101"
                                                    className="rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                                                />
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <Switch
                                                        id="room-tba"
                                                        checked={isAddRoomTBA}
                                                        onCheckedChange={setIsAddRoomTBA}
                                                        disabled={isAddSubmitting}
                                                        className="data-[state=checked]:bg-blue-600"
                                                    />
                                                    <span>TBA</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="day" className="text-right text-slate-300">Day</Label>
                                            <Select name="day" required disabled={isAddSubmitting}>
                                                <SelectTrigger className="col-span-3 rounded-xl bg-white/5 border-white/10 text-white focus:ring-blue-500/20">
                                                    <SelectValue placeholder="Select a day" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                                    {days.map(day => <SelectItem key={day} value={day} className="focus:bg-white/10 focus:text-white">{day}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="startTime" className="text-right text-slate-300">Start Time</Label>
                                            <Select name="startTime" required disabled={isAddSubmitting}>
                                                <SelectTrigger className="col-span-3 rounded-xl bg-white/5 border-white/10 text-white focus:ring-blue-500/20">
                                                    <SelectValue placeholder="Select start time" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                                    {detailedTimeSlots.map(ts => <SelectItem key={`start-${ts.value}`} value={ts.value} className="focus:bg-white/10 focus:text-white">{ts.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="endTime" className="text-right text-slate-300">End Time</Label>
                                            <Select name="endTime" required disabled={isAddSubmitting}>
                                                <SelectTrigger className="col-span-3 rounded-xl bg-white/5 border-white/10 text-white focus:ring-blue-500/20">
                                                    <SelectValue placeholder="Select end time" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                                    {detailedTimeSlots.map(ts => <SelectItem key={`end-${ts.value}`} value={ts.value} className="focus:bg-white/10 focus:text-white">{ts.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </form>
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsAddDialogOpen(false)}
                                        className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                                        disabled={isAddSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        form="add-subject-form"
                                        className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-0"
                                        disabled={isAddSubmitting}
                                    >
                                        {isAddSubmitting ? 'Saving...' : 'Create Schedule'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <div className="min-w-[1000px] p-6">
                        <div className="grid grid-cols-[5rem_repeat(6,1fr)]">
                            {/* Header Row */}
                            <div className="h-12 border-b border-white/10"></div>
                            {days.map(day => (
                                <div key={day} className="h-12 flex items-center justify-center border-b border-white/10 bg-white/5 first:rounded-tl-lg last:rounded-tr-lg">
                                    <span className="font-semibold text-sm text-foreground">{day}</span>
                                </div>
                            ))}

                            {/* Time Slots & Grid */}
                            <div className="col-start-1 row-start-2 relative border-r border-white/10 bg-white/5/50">
                                {timeSlots.map((time) => (
                                    <div key={time} className="relative" style={{ height: `${HOUR_HEIGHT_REM}rem` }}>
                                        <div className="absolute -top-3 right-3 text-xs font-medium text-muted-foreground">
                                            {formatTime(time)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="col-start-2 col-span-6 row-start-2 relative grid grid-cols-6 bg-white/5/20" style={{ height: `${timeSlots.length * HOUR_HEIGHT_REM}rem` }}>
                                {/* Grid Lines */}
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div 
                                        key={`h-line-${i}`} 
                                        className="absolute w-full border-t border-dashed border-white/10"
                                        style={{ top: `${i * HOUR_HEIGHT_REM}rem` }}
                                    />
                                ))}
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div 
                                        key={`v-line-${i}`} 
                                        className="absolute h-full border-r border-dashed border-white/10"
                                        style={{ left: `${(i + 1) * (100 / 6)}%` }}
                                    />
                                ))}

                                {/* Schedule Blocks */}
                                {subjects.map(subject => {
                                    const dayIndex = days.indexOf(subject.day);
                                    if (dayIndex === -1) return null;

                                    const startPosition = timeToPosition(subject.startTime);
                                    const endPosition = timeToPosition(subject.endTime);
                                    const blockHeight = Math.max(endPosition - startPosition, 1.5);
                                    const colorScheme = getSubjectColor(subject.code);

                                    const normalizedRoom = (subject.room ?? '').trim();
                                    const hasRoomAssigned = normalizedRoom !== '' && normalizedRoom.toUpperCase() !== TBA_ROOM;

                                    return (
                                        <div
                                            key={subject.id}
                                            className={cn(
                                                'absolute rounded-lg p-3 border text-xs overflow-hidden transition-all hover:z-10 hover:shadow-lg hover:scale-[1.02] group cursor-default',
                                                colorScheme.bg,
                                                colorScheme.border
                                            )}
                                            style={{
                                                top: `${startPosition}rem`,
                                                height: `${blockHeight}rem`,
                                                left: `calc(${(100 / 6) * dayIndex}% + 4px)`,
                                                width: `calc(${100 / 6}% - 8px)`,
                                            }}
                                        >
                                            <div className="flex flex-col h-full justify-between gap-1">
                                                <div>
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <span className={cn("font-bold text-[11px] px-1.5 py-0.5 rounded bg-black/20 backdrop-blur-sm", colorScheme.accent)}>
                                                            {subject.code}
                                                        </span>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-5 w-5 p-0.5 text-white/50 hover:bg-white/10 hover:text-white focus-visible:ring-0 focus-visible:ring-offset-0 -mr-1 -mt-1">
                                                                    <MoreHorizontal className="h-3 w-3" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200">
                                                                <DropdownMenuItem onSelect={() => openEditDialog(subject)} className="focus:bg-white/10 focus:text-white">
                                                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem 
                                                                    className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
                                                                    onSelect={() => openDeleteDialog(subject)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                    <p className={cn("font-medium leading-tight line-clamp-2 mb-1", colorScheme.text)}>
                                                        {subject.description}
                                                    </p>
                                                </div>
                                                
                                                <div className="space-y-1 mt-auto">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                                                        <User2 className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">{subject.instructor || 'TBA'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
                                                        <MapPin className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">{hasRoomAssigned ? normalizedRoom : 'TBA'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-medium pt-1 border-t border-white/5 mt-1">
                                                        <Clock className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">
                                                            {formatTime(subject.startTime)} - {formatTime(subject.endTime)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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
                <DialogContent className="rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Schedule</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update the details for {subjectToEdit?.code}.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="edit-subject-form" onSubmit={handleEditSubject}>
                         <div className="grid gap-4 py-4">
                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-subject-display" className="text-right text-slate-300">Subject</Label>
                                <div className="col-span-3 h-10 flex items-center">
                                    <p id="edit-subject-display" className="text-sm font-medium text-white">
                                        {subjectToEdit?.description}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-instructor" className="text-right text-slate-300">Instructor</Label>
                                <Select
                                    name="instructor"
                                    defaultValue={getInstructorSelectValue(subjectToEdit)}
                                    disabled={isEditSubmitting}
                                >
                                    <SelectTrigger className="col-span-3 rounded-xl bg-white/5 border-white/10 text-white focus:ring-blue-500/20">
                                        <SelectValue placeholder="Select an instructor (optional)" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                        {subjectToEdit ? (
                                            <>
                                                {eligibleInstructorsForEdit.map((ins) => (
                                                    <SelectItem key={ins.id} value={ins.id.toString()} className="focus:bg-white/10 focus:text-white">{ins.name}</SelectItem>
                                                ))}
                                                <SelectItem value={TBA_INSTRUCTOR} className="focus:bg-white/10 focus:text-white">
                                                    Assign Later (TBA)
                                                </SelectItem>
                                            </>
                                        ) : null}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-room" className="text-right text-slate-300">Room</Label>
                                <div className="col-span-3 flex items-center gap-3">
                                    <Input
                                        id="edit-room"
                                        name="room"
                                        value={isEditRoomTBA ? '' : editRoom}
                                        onChange={(event) => setEditRoom(event.target.value)}
                                        disabled={isEditSubmitting || isEditRoomTBA}
                                        placeholder="e.g., Room 101"
                                        className="rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                                    />
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Switch
                                            id="edit-room-tba"
                                            checked={isEditRoomTBA}
                                            onCheckedChange={setIsEditRoomTBA}
                                            disabled={isEditSubmitting}
                                            className="data-[state=checked]:bg-blue-600"
                                        />
                                        <span>TBA</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-day" className="text-right text-slate-300">Day</Label>
                                <Select name="day" defaultValue={subjectToEdit?.day} required disabled={isEditSubmitting}>
                                    <SelectTrigger className="col-span-3 rounded-xl bg-white/5 border-white/10 text-white focus:ring-blue-500/20">
                                        <SelectValue placeholder="Select a day" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                        {days.map(day => <SelectItem key={day} value={day} className="focus:bg-white/10 focus:text-white">{day}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-startTime" className="text-right text-slate-300">Start Time</Label>
                                <Select name="startTime" defaultValue={subjectToEdit?.startTime} required disabled={isEditSubmitting}>
                                    <SelectTrigger className="col-span-3 rounded-xl bg-white/5 border-white/10 text-white focus:ring-blue-500/20">
                                        <SelectValue placeholder="Select start time" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                        {detailedTimeSlots.map(ts => <SelectItem key={`edit-start-${ts.value}`} value={ts.value} className="focus:bg-white/10 focus:text-white">{ts.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-endTime" className="text-right text-slate-300">End Time</Label>
                                <Select name="endTime" defaultValue={subjectToEdit?.endTime} required disabled={isEditSubmitting}>
                                    <SelectTrigger className="col-span-3 rounded-xl bg-white/5 border-white/10 text-white focus:ring-blue-500/20">
                                        <SelectValue placeholder="Select end time" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                        {detailedTimeSlots.map(ts => <SelectItem key={`edit-end-${ts.value}`} value={ts.value} className="focus:bg-white/10 focus:text-white">{ts.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                            className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                            disabled={isEditSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="edit-subject-form"
                            className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-0"
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
                <AlertDialogContent className="rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            This action cannot be undone. This will permanently delete the schedule for <span className="font-semibold text-white">{subjectToDelete?.code}</span>.
                             <br/><br/>
                            To confirm, please type "delete" below.
                        </AlertDialogDescription>
                        <Input 
                            id="delete-confirm" 
                            name="delete-confirm"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            disabled={isDeleteSubmitting}
                            className="mt-4 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-red-500/50 focus:ring-red-500/20"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel 
                            onClick={() => setDeleteInput('')} 
                            disabled={isDeleteSubmitting}
                            className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            disabled={deleteInput !== 'delete' || isDeleteSubmitting}
                            onClick={handleDeleteSubject}
                            className="rounded-xl bg-red-600 hover:bg-red-500 text-white border-0"
                        >
                            {isDeleteSubmitting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}
