
'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
    Camera, Eye, EyeOff, Calendar as CalendarIcon, Trash2, Download,
    User, Mail, Shield, Lock, Save, Megaphone, Clock, Search, Filter, 
    FileText, CheckCircle2, AlertCircle, X, ChevronRight, Upload, RefreshCw,
    School, GraduationCap, Bell
} from 'lucide-react';
import { useAdmin } from '../../context/admin-context';
import type { AdminAnnouncement } from '../../context/admin-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DayContentProps } from 'react-day-picker';
import { format, isSameDay } from 'date-fns';
import { cn, resolveMediaUrl } from '@/lib/utils';
import { notifyDataChanged } from '@/lib/live-sync';
import { Separator } from '@/components/ui/separator';
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


const InfoField = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null;
    return (
        <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">{label}</Label>
            <p className="font-medium">{value}</p>
        </div>
    );
};

type RolloverSummary = {
    closingAcademicYear: string;
    closingSemester: string;
    nextAcademicYear: string;
    nextSemester: string;
    enrollmentStartDate?: string | null;
    enrollmentEndDate?: string | null;
    summary: {
        totalActiveStudents: number;
        promoted: number;
        held: number;
        graduated: number;
    };
    students: Array<{
        studentUserId: number;
        studentIdNumber: string;
        name: string;
        action: 'promoted' | 'held' | 'graduated';
        previousYearLevel: number;
        newYearLevel: number;
        promotionHoldReason?: string | null;
    }>;
};

type ProgramEvent = {
    id: number;
    eventDate: string;
    title: string;
    description: string | null;
    createdAt: string;
    updatedAt?: string;
    createdBy?: {
        id: number | null;
        name?: string | null;
        email?: string | null;
    };
};

export default function AdminSettingsPage() {
    const { toast } = useToast();
    const { adminData, setAdminData, refreshAdminData } = useAdmin();
    const {
        currentUser,
        academicYear,
        semester,
        enrollmentStartDate,
        enrollmentEndDate,
        academicYearOptions,
        semesterOptions,
        phasedEnrollmentSchedule,
        activeEnrollmentPhase: serverActiveEnrollmentPhase = 'all',
    } = adminData;

    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementMessage, setAnnouncementMessage] = useState('');
    const [announcementAudience, setAnnouncementAudience] = useState<'All' | 'Students' | 'Instructors'>('Students');
    const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>(adminData.announcements ?? []);
    const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);

    const [editableData, setEditableData] = React.useState({
        name: '',
        email: '',
    });
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    
    const [currentAcademicYear, setCurrentAcademicYear] = useState(academicYear);
    const [currentSemester, setCurrentSemester] = useState(semester);

    const [startDate, setStartDate] = useState<Date | undefined>(enrollmentStartDate);
    const [endDate, setEndDate] = useState<Date | undefined>(enrollmentEndDate);
    const [activeEnrollmentPhase, setActiveEnrollmentPhase] = useState(serverActiveEnrollmentPhase ?? 'all');

    const [rolloverPreview, setRolloverPreview] = useState<RolloverSummary | null>(null);
    const [rolloverPreviewSignature, setRolloverPreviewSignature] = useState<string | null>(null);
    const [rolloverPreviewParams, setRolloverPreviewParams] = useState<{
        academicYear: string;
        semester: string;
        startDateIso: string | null;
        endDateIso: string | null;
    } | null>(null);
    const [showRolloverDialog, setShowRolloverDialog] = useState(false);
    const [isPreviewingRollover, setIsPreviewingRollover] = useState(false);
    const [isExecutingRollover, setIsExecutingRollover] = useState(false);
    const [rolloverProgressMessage, setRolloverProgressMessage] = useState<string | null>(null);
    const silentRolloverDialogClose = useRef(false);
    const [programCalendarDate, setProgramCalendarDate] = useState<Date>(new Date());
    const [programTitleInput, setProgramTitleInput] = useState('');
    const [programDescriptionInput, setProgramDescriptionInput] = useState('');
    const [programEvents, setProgramEvents] = useState<ProgramEvent[]>([]);
    const [isLoadingProgramEvents, setIsLoadingProgramEvents] = useState(true);
    const [isCreatingProgramEvent, setIsCreatingProgramEvent] = useState(false);
    const [deletingProgramEventId, setDeletingProgramEventId] = useState<number | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement | null>(null);

    const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
        .replace(/\/$/, '')
        .trim();

    const todayStart = useMemo(() => {
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        return base;
    }, []);

    const termChanged = useMemo(() => (
        currentAcademicYear !== academicYear || currentSemester !== semester
    ), [currentAcademicYear, academicYear, currentSemester, semester]);

    const enrollmentPhaseOptions = useMemo(() => {
        const scheduleKeys = Object.keys(phasedEnrollmentSchedule ?? {});
        if (scheduleKeys.length > 0) {
            return scheduleKeys;
        }
        return ['1st-year', '2nd-year', '3rd-year', '4th-year'];
    }, [phasedEnrollmentSchedule]);

    const formatPhaseLabel = useCallback((value: string) => {
        if (value === 'all') {
            return 'All year levels';
        }
        return value
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }, []);

    const getEventDateValue = useCallback((event: ProgramEvent) => {
        const legacyDate = (event as unknown as { date?: string }).date;
        const rawValue = (event.eventDate ?? legacyDate ?? '').trim();
        if (!rawValue) {
            return null;
        }
        const normalized = rawValue.includes('T') ? rawValue : `${rawValue}T00:00:00`;
        const parsed = new Date(normalized);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        return parsed;
    }, []);

    const getEventSortValue = useCallback((event: ProgramEvent) => {
        const eventDate = getEventDateValue(event);
        if (eventDate) {
            return eventDate.getTime();
        }
        const fallback = Date.parse(event.createdAt ?? '');
        return Number.isNaN(fallback) ? 0 : fallback;
    }, [getEventDateValue]);

    const sortProgramEvents = useCallback((events: ProgramEvent[]) => {
        return [...events].sort((a, b) => {
            const primaryDiff = getEventSortValue(a) - getEventSortValue(b);
            if (primaryDiff !== 0) {
                return primaryDiff;
            }
            const createdDiff = Date.parse(a.createdAt ?? '') - Date.parse(b.createdAt ?? '');
            if (!Number.isNaN(createdDiff) && createdDiff !== 0) {
                return createdDiff;
            }
            return a.id - b.id;
        });
    }, [getEventSortValue]);

    const programsForSelectedDate = useMemo(() => {
        return programEvents
            .filter((event) => {
                const eventDate = getEventDateValue(event);
                return eventDate ? isSameDay(eventDate, programCalendarDate) : false;
            })
            .sort((a, b) => {
                const createdDiff = Date.parse(a.createdAt ?? '') - Date.parse(b.createdAt ?? '');
                if (!Number.isNaN(createdDiff) && createdDiff !== 0) {
                    return createdDiff;
                }
                return a.id - b.id;
            });
    }, [getEventDateValue, programCalendarDate, programEvents]);

    const calendarProgramDates = useMemo(() => (
        programEvents
            .map(event => getEventDateValue(event))
            .filter((date): date is Date => Boolean(date))
    ), [getEventDateValue, programEvents]);

    const calendarProgramDateKeys = useMemo(() => {
        const keys = new Set<string>();
        calendarProgramDates.forEach((date) => {
            if (!Number.isNaN(date.getTime())) {
                keys.add(date.toDateString());
            }
        });
        return keys;
    }, [calendarProgramDates]);

    const buildApiUrl = useCallback(
        (endpoint: string) => `${API_BASE_URL}/${endpoint.replace(/^\//, '')}`,
        [API_BASE_URL],
    );

    const callAdminApi = useCallback(
        async (endpoint: string, payload: Record<string, unknown>) => {
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
                // Ignore JSON parse issues; rely on status code + default message.
            }

            if (!response.ok) {
                const message = data?.message ?? `Request failed with status ${response.status}`;
                throw new Error(message);
            }

            if (!data || data.status !== 'success') {
                throw new Error(data?.message ?? 'Server returned an error status.');
            }

            return data;
        },
        [buildApiUrl],
    );

    const handleAvatarUploadClick = () => {
        avatarInputRef.current?.click();
    };

    const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!currentUser) {
            return;
        }

        const file = event.target.files?.[0] ?? null;
        event.target.value = '';
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Invalid file',
                description: 'Please choose an image file (PNG, JPG, or WEBP).',
                variant: 'destructive',
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'File too large',
                description: 'Please pick an image smaller than 5 MB.',
                variant: 'destructive',
            });
            return;
        }

        setIsUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('role', 'admin');
            formData.append('id', String(currentUser.id));
            formData.append('avatar', file);

            const response = await fetch(buildApiUrl('upload_avatar.php'), {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            let payload: any = null;
            try {
                payload = await response.json();
            } catch {
                payload = null;
            }

            if (!response.ok || !payload || payload.status !== 'success') {
                const message = payload?.message ?? `Failed to upload avatar (status ${response.status}).`;
                throw new Error(message);
            }

            const avatarUrl = resolveMediaUrl(payload.data?.avatarUrl ?? payload.avatarUrl ?? null, API_BASE_URL);
            if (!avatarUrl) {
                throw new Error('Server did not return a valid avatar URL.');
            }

            setAdminData(prev => {
                const base = prev ?? adminData;
                if (!base) {
                    return prev;
                }
                const updatedCurrentUser = base.currentUser && base.currentUser.id === currentUser.id
                    ? { ...base.currentUser, avatar: avatarUrl }
                    : base.currentUser;
                const updatedAdminUsers = base.adminUsers.map((adminUser) =>
                    adminUser.id === currentUser.id ? { ...adminUser, avatar: avatarUrl } : adminUser,
                );
                return { ...base, currentUser: updatedCurrentUser, adminUsers: updatedAdminUsers };
            });

            sessionStorage.setItem('currentUser', JSON.stringify({ ...currentUser, avatar: avatarUrl }));

            toast({
                title: 'Profile photo updated',
                description: 'Your avatar has been refreshed across the portal.',
            });
        } catch (error) {
            toast({
                title: 'Upload failed',
                description: error instanceof Error ? error.message : 'Unable to upload avatar right now.',
                variant: 'destructive',
            });
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const formatDateForApi = useCallback((value?: Date | null) => {
        if (!value) {
            return null;
        }
        return format(value, 'yyyy-MM-dd');
    }, []);

    const validateEnrollmentDates = useCallback(() => {
        if (startDate && endDate && startDate > endDate) {
            toast({ variant: 'destructive', title: 'Invalid Date Range', description: 'Enrollment start date cannot be after the end date.' });
            return false;
        }

        if (startDate && startDate < todayStart) {
            toast({
                variant: 'destructive',
                title: 'Start date is in the past',
                description: 'Adjust the enrollment schedule so it begins today or later.',
            });
            return false;
        }

        if (endDate && endDate < todayStart) {
            toast({
                variant: 'destructive',
                title: 'End date is in the past',
                description: 'Enrollment end date must be today or a future date.',
            });
            return false;
        }

        return true;
    }, [endDate, startDate, todayStart, toast]);

    const buildPreviewSignature = useCallback((preview: RolloverSummary | null) => {
        if (!preview) {
            return null;
        }

        const compactStudents = preview.students.map(student => ({
            studentUserId: student.studentUserId,
            action: student.action,
            newYearLevel: student.newYearLevel,
            promotionHoldReason: student.promotionHoldReason ?? null,
        }));

        return JSON.stringify({
            summary: preview.summary,
            nextAcademicYear: preview.nextAcademicYear,
            nextSemester: preview.nextSemester,
            students: compactStudents,
        });
    }, []);

    useEffect(() => {
        let isMounted = true;
        const loadProgramEvents = async () => {
            setIsLoadingProgramEvents(true);
            try {
                const response = await callAdminApi('program_events.php', { action: 'list' });
                if (!isMounted) {
                    return;
                }
                const eventsPayload = Array.isArray(response?.data?.events)
                    ? response.data.events as ProgramEvent[]
                    : [];
                setProgramEvents(sortProgramEvents(eventsPayload));
            } catch (error) {
                if (isMounted) {
                    const message = error instanceof Error ? error.message : 'Unable to load program events.';
                    toast({
                        variant: 'destructive',
                        title: 'Program calendar unavailable',
                        description: message,
                    });
                }
            } finally {
                if (isMounted) {
                    setIsLoadingProgramEvents(false);
                }
            }
        };

        loadProgramEvents();
        return () => {
            isMounted = false;
        };
    }, [callAdminApi, sortProgramEvents, toast]);

    const handlePublishAnnouncement = async (event?: React.FormEvent | React.MouseEvent) => {
        event?.preventDefault();
        if (isPublishingAnnouncement) {
            return;
        }

        if (!currentUser) {
            toast({
                variant: 'destructive',
                title: 'Missing administrator context',
                description: 'Please sign in again before publishing announcements.',
            });
            return;
        }

        const trimmedTitle = announcementTitle.trim();
        const trimmedMessage = announcementMessage.trim();

        if (trimmedTitle === '' || trimmedMessage === '') {
            toast({
                variant: 'destructive',
                title: 'Missing information',
                description: 'Provide a title and message before publishing an announcement.',
            });
            return;
        }

        setIsPublishingAnnouncement(true);

        try {
            const response = await callAdminApi('create_announcement.php', {
                title: trimmedTitle,
                message: trimmedMessage,
                audience: announcementAudience,
                createdBy: currentUser.id,
            });

            const createdAnnouncement = (response?.data?.announcement ?? null) as AdminAnnouncement | null;
            if (!createdAnnouncement) {
                throw new Error('Unexpected response from the server.');
            }

            setAnnouncements(prev => {
                const filtered = prev.filter(item => item.id !== createdAnnouncement.id);
                return [createdAnnouncement, ...filtered].slice(0, 50);
            });

            setAdminData(prev => {
                const filtered = prev.announcements.filter(item => item.id !== createdAnnouncement.id);
                return {
                    ...prev,
                    announcements: [createdAnnouncement, ...filtered].slice(0, 50),
                };
            });

            setAnnouncementTitle('');
            setAnnouncementMessage('');
            setAnnouncementAudience('Students');

            notifyDataChanged();

            toast({
                title: 'Announcement published',
                description: 'Students will see the new announcement on their dashboard.',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to publish announcement.';
            toast({
                variant: 'destructive',
                title: 'Publish failed',
                description: message,
            });
        } finally {
            setIsPublishingAnnouncement(false);
        }
    };

    const handleSelectProgramDate = useCallback((value?: Date) => {
        if (value) {
            setProgramCalendarDate(value);
        }
    }, []);

    const handleAddProgramEvent = useCallback(async () => {
        const trimmedTitle = programTitleInput.trim();
        const trimmedDescription = programDescriptionInput.trim();
        if (trimmedTitle === '') {
            toast({
                variant: 'destructive',
                title: 'Program title required',
                description: 'Provide a program name before adding it to the calendar.',
            });
            return;
        }

        if (!currentUser) {
            toast({
                variant: 'destructive',
                title: 'Missing administrator context',
                description: 'Please refresh and sign in again before scheduling programs.',
            });
            return;
        }

        setIsCreatingProgramEvent(true);
        try {
            const response = await callAdminApi('program_events.php', {
                action: 'create',
                title: trimmedTitle,
                description: trimmedDescription === '' ? null : trimmedDescription,
                eventDate: format(programCalendarDate, 'yyyy-MM-dd'),
                createdBy: currentUser.id,
            });

            const createdEvent = response?.data?.event as ProgramEvent | undefined;
            if (!createdEvent) {
                throw new Error('Unexpected response while creating program event.');
            }

            setProgramEvents(prev => sortProgramEvents([
                ...prev.filter(event => event.id !== createdEvent.id),
                createdEvent,
            ]));
            setProgramTitleInput('');
            setProgramDescriptionInput('');

            toast({
                title: 'Program scheduled',
                description: `${createdEvent.title} was added for ${format(programCalendarDate, 'PPPP')}.`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to add program event right now.';
            toast({
                variant: 'destructive',
                title: 'Add event failed',
                description: message,
            });
        } finally {
            setIsCreatingProgramEvent(false);
        }
    }, [callAdminApi, currentUser, programCalendarDate, programDescriptionInput, programTitleInput, sortProgramEvents, toast]);

    const handleRemoveProgramEvent = useCallback(async (eventId: number, eventTitle?: string) => {
        setDeletingProgramEventId(eventId);
        try {
            await callAdminApi('program_events.php', { action: 'delete', eventId });
            setProgramEvents(prev => prev.filter(event => event.id !== eventId));
            toast({
                title: 'Program removed',
                description: eventTitle
                    ? `${eventTitle} was removed from the calendar.`
                    : 'The selected program entry was removed from the calendar.',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to remove program event right now.';
            toast({
                variant: 'destructive',
                title: 'Remove event failed',
                description: message,
            });
        } finally {
            setDeletingProgramEventId(null);
        }
    }, [callAdminApi, toast]);

    const ProgramCalendarDay = useCallback((dayProps: DayContentProps) => {
        const { date, activeModifiers } = dayProps;
        const hasProgram = calendarProgramDateKeys.has(date.toDateString());
        return (
            <div className="relative flex h-full w-full items-center justify-center text-sm font-medium">
                <span>{date.getDate()}</span>
                {hasProgram && (
                    <span
                        aria-hidden="true"
                        className={cn(
                            'absolute bottom-1 h-1.5 w-1.5 rounded-full',
                            activeModifiers.selected ? 'bg-primary-foreground' : 'bg-primary',
                        )}
                    />
                )}
            </div>
        );
    }, [calendarProgramDateKeys]);

    const handlePreviewRollover = async () => {
        if (!currentUser || currentUser.role !== 'Super Admin') {
            toast({
                variant: 'destructive',
                title: 'Insufficient permissions',
                description: 'Only Super Administrators can run the academic rollover.',
            });
            return;
        }

        if (!termChanged) {
            toast({
                variant: 'destructive',
                title: 'No term changes detected',
                description: 'Select the upcoming academic year and semester before previewing the rollover.',
            });
            return;
        }

        const startDateIso = formatDateForApi(startDate ?? null);
        const endDateIso = formatDateForApi(endDate ?? null);
        const originalStartIso = formatDateForApi(enrollmentStartDate ?? null);
        const originalEndIso = formatDateForApi(enrollmentEndDate ?? null);
        const datesChanged = startDateIso !== originalStartIso || endDateIso !== originalEndIso;

        if (datesChanged && !validateEnrollmentDates()) {
            return;
        }

        setIsPreviewingRollover(true);
        setRolloverProgressMessage(null);

        try {
            const startDateIso = formatDateForApi(startDate ?? null);
            const endDateIso = formatDateForApi(endDate ?? null);

            const previewResponse = await callAdminApi('academic_rollover.php', {
                dryRun: true,
                nextAcademicYear: currentAcademicYear,
                nextSemester: currentSemester,
                triggeredByUserId: currentUser.id,
                enrollmentStartDate: startDateIso,
                enrollmentEndDate: endDateIso,
            });

            const previewData = previewResponse?.data as RolloverSummary | undefined;
            if (!previewData) {
                throw new Error('Unexpected response while generating rollover preview.');
            }

            setRolloverPreview(previewData);
            setRolloverPreviewSignature(buildPreviewSignature(previewData));
            setRolloverPreviewParams({
                academicYear: currentAcademicYear,
                semester: currentSemester,
                startDateIso,
                endDateIso,
            });
            silentRolloverDialogClose.current = false;
            setShowRolloverDialog(true);
            toast({
                title: 'Preview generated',
                description: 'Review the summary below, then confirm to finalize the rollover.',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to preview the academic rollover.';
            toast({ variant: 'destructive', title: 'Preview failed', description: message });
        } finally {
            setIsPreviewingRollover(false);
        }
    };

    const handleDownloadPreview = useCallback(() => {
        if (!rolloverPreview) {
            return;
        }

        const fileName = `academic-rollover-preview-${rolloverPreview.nextAcademicYear}-${rolloverPreview.nextSemester}.json`;
        const blob = new Blob([JSON.stringify(rolloverPreview, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [rolloverPreview]);

    const handleRemoveAnnouncement = useCallback(async (announcementId: number) => {
        try {
            await callAdminApi('delete_announcement.php', { announcementId });

            setAnnouncements(prev => prev.filter(announcement => announcement.id !== announcementId));
            setAdminData(prev => ({
                ...prev,
                announcements: prev.announcements.filter(announcement => announcement.id !== announcementId),
            }));

            toast({
                title: 'Announcement removed',
                description: 'The announcement is no longer visible to students.',
            });
            notifyDataChanged();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove the announcement.';
            toast({
                variant: 'destructive',
                title: 'Remove failed',
                description: message,
            });
        }
    }, [callAdminApi, setAdminData, toast]);

    useEffect(() => {
        if (currentUser) {
            setEditableData({
                name: currentUser.name,
                email: currentUser.email,
            });
        }
        setCurrentAcademicYear(academicYear);
        setCurrentSemester(semester);
        setStartDate(enrollmentStartDate);
        setEndDate(enrollmentEndDate);
        setActiveEnrollmentPhase(serverActiveEnrollmentPhase ?? 'all');
    }, [currentUser, academicYear, semester, enrollmentStartDate, enrollmentEndDate, serverActiveEnrollmentPhase]);

    useEffect(() => {
        setAnnouncements(adminData.announcements ?? []);
    }, [adminData.announcements]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setEditableData(prev => ({ ...prev, [id]: value }));
    }

    const validateProfileInputs = useCallback((name: string, email: string) => {
        if (name === '' || email === '') {
            toast({
                variant: 'destructive',
                title: 'Missing information',
                description: 'Please provide both name and email before saving.',
            });
            return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast({
                variant: 'destructive',
                title: 'Invalid Email',
                description: 'Please provide a valid email address.',
            });
            return false;
        }

        return true;
    }, [toast]);

    const persistProfileUpdates = useCallback(async (name: string, email: string) => {
        if (!currentUser) {
            throw new Error('Unable to update profile. Please re-authenticate.');
        }

        await callAdminApi('update_admin.php', {
            userId: currentUser.id,
            name,
            email,
            role: currentUser.role,
            avatar: currentUser.avatar ?? '',
        });

        const refreshed = await refreshAdminData();
        const updatedUser = refreshed.adminUsers.find((user) => user.id === currentUser.id) ?? {
            id: currentUser.id,
            name,
            email,
            role: currentUser.role,
            avatar: currentUser.avatar ?? '',
        };

        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

        setAdminData(() => ({
            ...refreshed,
            currentUser: updatedUser,
        }));

        setEditableData({ name: updatedUser.name, email: updatedUser.email });

        return { updatedUser, refreshedAdminData: refreshed };
    }, [callAdminApi, currentUser, refreshAdminData, setAdminData, setEditableData]);

    const handleSaveProfile = async () => {
        if (!currentUser || isSaving) {
            return;
        }

        const trimmedName = editableData.name.trim();
        const trimmedEmail = editableData.email.trim().toLowerCase();

        if (!validateProfileInputs(trimmedName, trimmedEmail)) {
            return;
        }

        setIsSaving(true);

        try {
            await persistProfileUpdates(trimmedName, trimmedEmail);
            notifyDataChanged();
            toast({
                title: 'Profile Updated',
                description: 'Your personal information has been saved.',
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update profile.';
            toast({
                variant: 'destructive',
                title: 'Save failed',
                description: message,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAll = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!currentUser || isSaving) {
            return;
        }

        const trimmedName = editableData.name.trim();
        const trimmedEmail = editableData.email.trim().toLowerCase();

        if (!validateProfileInputs(trimmedName, trimmedEmail)) {
            return;
        }

        const startDateIso = formatDateForApi(startDate ?? null);
        const endDateIso = formatDateForApi(endDate ?? null);
        const originalStartIso = formatDateForApi(enrollmentStartDate ?? null);
        const originalEndIso = formatDateForApi(enrollmentEndDate ?? null);
        const datesChanged = startDateIso !== originalStartIso || endDateIso !== originalEndIso;

        if (datesChanged && !validateEnrollmentDates()) {
            return;
        }

        setRolloverPreview(null);
        silentRolloverDialogClose.current = true;
        setShowRolloverDialog(false);
        setRolloverPreviewSignature(null);
        setRolloverPreviewParams(null);

        setIsSaving(true);

        try {
            const { updatedUser } = await persistProfileUpdates(trimmedName, trimmedEmail);

            const activePhaseChanged = activeEnrollmentPhase !== (serverActiveEnrollmentPhase ?? 'all');
            if (datesChanged || activePhaseChanged) {
                await callAdminApi('update_system_settings.php', {
                    academicYear: termChanged ? academicYear : currentAcademicYear,
                    semester: termChanged ? semester : currentSemester,
                    enrollmentStartDate: startDateIso,
                    enrollmentEndDate: endDateIso,
                    activeEnrollmentPhase,
                });

                const settingsRefresh = await refreshAdminData();
                setAdminData(() => ({
                    ...settingsRefresh,
                    currentUser: updatedUser,
                }));
                if (!termChanged) {
                    setCurrentAcademicYear(settingsRefresh.academicYear);
                    setCurrentSemester(settingsRefresh.semester);
                }
                setStartDate(settingsRefresh.enrollmentStartDate);
                setEndDate(settingsRefresh.enrollmentEndDate);
                setActiveEnrollmentPhase(settingsRefresh.activeEnrollmentPhase ?? 'all');
            }

            notifyDataChanged();

            if (termChanged) {
                toast({
                    title: 'Preview required',
                    description: 'Use the Academic Rollover card to preview and confirm the new term.',
                });
            } else {
                toast({
                    title: 'Settings Updated',
                    description: 'Changes saved successfully.',
                });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update administrator settings.';
            toast({
                variant: 'destructive',
                title: 'Save failed',
                description: message,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmRollover = async () => {
        if (!currentUser || !rolloverPreview || !rolloverPreviewParams) {
            silentRolloverDialogClose.current = true;
            setShowRolloverDialog(false);
            return;
        }

        setIsExecutingRollover(true);
        setRolloverProgressMessage('Validating preview data...');

        try {
            const validationResponse = await callAdminApi('academic_rollover.php', {
                dryRun: true,
                nextAcademicYear: rolloverPreviewParams.academicYear,
                nextSemester: rolloverPreviewParams.semester,
                triggeredByUserId: currentUser.id,
                enrollmentStartDate: rolloverPreviewParams.startDateIso,
                enrollmentEndDate: rolloverPreviewParams.endDateIso,
            });

            const latestPreview = validationResponse?.data as RolloverSummary | undefined;
            if (!latestPreview) {
                throw new Error('Unable to validate the latest rollover preview.');
            }

            const latestSignature = buildPreviewSignature(latestPreview);
            if (rolloverPreviewSignature && latestSignature && latestSignature !== rolloverPreviewSignature) {
                setRolloverPreview(latestPreview);
                setRolloverPreviewSignature(latestSignature);
                setIsExecutingRollover(false);
                setRolloverProgressMessage(null);
                toast({
                    variant: 'destructive',
                    title: 'Preview updated',
                    description: 'Student data changed while you were reviewing. Please review the refreshed preview before confirming.',
                });
                return;
            }

            setRolloverProgressMessage('Finalizing academic rollover...');

            const response = await callAdminApi('academic_rollover.php', {
                dryRun: false,
                nextAcademicYear: rolloverPreviewParams.academicYear,
                nextSemester: rolloverPreviewParams.semester,
                triggeredByUserId: currentUser.id,
                enrollmentStartDate: rolloverPreviewParams.startDateIso,
                enrollmentEndDate: rolloverPreviewParams.endDateIso,
                notes: `Triggered by ${currentUser.name}`,
            });

            const resultData = response?.data as RolloverSummary | undefined;

            const refreshed = await refreshAdminData();
            setAdminData(prev => ({
                ...refreshed,
                currentUser: prev.currentUser ?? refreshed.currentUser ?? null,
            }));

            setCurrentAcademicYear(refreshed.academicYear);
            setCurrentSemester(refreshed.semester);
            setStartDate(refreshed.enrollmentStartDate);
            setEndDate(refreshed.enrollmentEndDate);
            setRolloverPreview(null);
            setRolloverPreviewSignature(null);
            setRolloverPreviewParams(null);
            silentRolloverDialogClose.current = true;
            setShowRolloverDialog(false);

            const summary = resultData?.summary ?? rolloverPreview.summary;
            toast({
                title: 'Academic rollover completed',
                description: `Promoted ${summary?.promoted ?? 0}, held ${summary?.held ?? 0}, graduated ${summary?.graduated ?? 0}.`,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to execute academic rollover.';
            toast({
                variant: 'destructive',
                title: 'Rollover failed',
                description: message,
            });
        } finally {
            setIsExecutingRollover(false);
            setIsPreviewingRollover(false);
            setIsSaving(false);
            setRolloverProgressMessage(null);
        }
    };

    const handleCancelRollover = () => {
        setRolloverPreview(null);
        setRolloverPreviewSignature(null);
        setRolloverPreviewParams(null);
        setRolloverProgressMessage(null);
        setIsPreviewingRollover(false);
        setIsExecutingRollover(false);
        setIsSaving(false);
        toast({
            title: 'Rollover cancelled',
            description: 'No changes were applied.',
        });
    };
    
    const handlePasswordChange = async () => {
        if (!currentUser || isChangingPassword) {
            return;
        }

        if (currentPassword.trim() === '') {
            toast({
                variant: 'destructive',
                title: 'Current Password Required',
                description: 'Please enter your current password before changing it.',
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast({
                variant: 'destructive',
                title: "Passwords Don't Match",
                description: "Please ensure your new password and confirmation match.",
            });
            return;
        }
        if (newPassword.length < 8) {
            toast({
                variant: 'destructive',
                title: "Password Too Short",
                description: "Your new password must be at least 8 characters long.",
            });
            return;
        }

        setIsChangingPassword(true);

        const trimmedName = editableData.name.trim() || currentUser.name;
        const trimmedEmail = editableData.email.trim().toLowerCase() || currentUser.email;

        try {
            await callAdminApi('update_admin.php', {
                userId: currentUser.id,
                name: trimmedName,
                email: trimmedEmail,
                role: currentUser.role,
                password: newPassword,
                avatar: currentUser.avatar ?? '',
            });

            const refreshed = await refreshAdminData();
            const updatedUser = refreshed.adminUsers.find((user) => user.id === currentUser.id) ?? {
                id: currentUser.id,
                name: trimmedName,
                email: trimmedEmail,
                role: currentUser.role,
                avatar: currentUser.avatar ?? '',
            };

            sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

            setAdminData(prev => ({
                ...prev,
                currentUser: updatedUser,
                adminUsers: prev.adminUsers.map(user => (user.id === updatedUser.id ? updatedUser : user)),
            }));

            toast({
                title: 'Password Changed',
                description: 'Your password has been successfully updated.',
            });

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update password.';
            toast({
                variant: 'destructive',
                title: 'Password update failed',
                description: message,
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (!currentUser) {
        return <div>Loading...</div>;
    }


    return (
        <>
            <AlertDialog
                open={showRolloverDialog}
                onOpenChange={(open) => {
                    if (!open) {
                        if (silentRolloverDialogClose.current) {
                            silentRolloverDialogClose.current = false;
                        } else {
                            handleCancelRollover();
                        }
                        setShowRolloverDialog(false);
                    } else {
                        setShowRolloverDialog(true);
                    }
                }}
            >
                <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Confirm Academic Rollover</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            {rolloverPreview
                                ? `The system will promote eligible students, reset enrollment statuses, and update the active term to ${rolloverPreview.nextAcademicYear} (${rolloverPreview.nextSemester}).`
                                : 'Review the summary before confirming.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {rolloverPreview && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 text-slate-300">
                                <div><span className="font-medium text-slate-200">Closing Term:</span> {rolloverPreview.closingAcademicYear} / {rolloverPreview.closingSemester}</div>
                                <div><span className="font-medium text-slate-200">New Term:</span> {rolloverPreview.nextAcademicYear} / {rolloverPreview.nextSemester}</div>
                                <div><span className="font-medium text-slate-200">Students evaluated:</span> {rolloverPreview.summary.totalActiveStudents}</div>
                                <div><span className="font-medium text-slate-200">Graduating:</span> {rolloverPreview.summary.graduated}</div>
                            </div>
                            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                                <p className="mb-2 font-semibold text-slate-200">Promotion Summary</p>
                                <div className="grid grid-cols-2 gap-y-1">
                                    <span className="text-slate-400">Promoted</span>
                                    <span className="text-right font-medium text-emerald-400">{rolloverPreview.summary.promoted}</span>
                                    <span className="text-slate-400">Held for review</span>
                                    <span className="text-right font-medium text-amber-400">{rolloverPreview.summary.held}</span>
                                    <span className="text-slate-400">Graduated</span>
                                    <span className="text-right font-medium text-blue-400">{rolloverPreview.summary.graduated}</span>
                                </div>
                            </div>
                            <div className="rounded-lg border border-white/10 p-3 space-y-2">
                                <p className="text-sm font-semibold text-slate-200">Detailed Results</p>
                                <p className="text-sm text-slate-400">
                                    Student-level outcomes are available through the export and the Reports view. Use the summary above to verify counts, then drill down only when needed.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-blue-500/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-slate-300">
                                    {rolloverProgressMessage ?? 'Review the preview carefully before confirming. You can export the summary or open the reports center for full details.'}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" size="sm" className="gap-2 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white" onClick={handleDownloadPreview} disabled={!rolloverPreview}>
                                        <Download className="h-4 w-4" />
                                        Export Preview
                                    </Button>
                                    <Button type="button" variant="secondary" size="sm" className="gap-2 bg-white/10 text-white hover:bg-white/20" asChild>
                                        <Link href="/admin/dashboard/reports">
                                            View Reports
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={(event) => {
                                event.preventDefault();
                                setShowRolloverDialog(false);
                            }}
                            disabled={isExecutingRollover}
                            className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                handleConfirmRollover();
                            }}
                            disabled={isExecutingRollover}
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            {isExecutingRollover ? 'Processing...' : 'Confirm Rollover'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="flex-1 p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Settings</h1>
                        <p className="text-slate-400 mt-1">Manage system configuration and your account preferences.</p>
                    </div>
                </div>

                <form onSubmit={handleSaveAll}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Column - Identity & System Config */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Identity Card */}
                            <Card className="overflow-hidden rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-xl">
                                <div className="relative h-32 bg-transparent">
                                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-soft-light"></div>
                                </div>
                                <div className="relative px-6 pb-6">
                                    <div className="relative -mt-16 mb-4 flex justify-center">
                                        <div className="relative">
                                            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 opacity-50 blur-md"></div>
                                            <Avatar className="h-32 w-32 border-4 border-black/40 shadow-2xl">
                                                <AvatarImage src={currentUser.avatar || undefined} alt={currentUser.name} className="object-cover" />
                                                <AvatarFallback className="bg-slate-800 text-4xl font-bold text-slate-200">
                                                    {currentUser.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <Button
                                                type="button"
                                                size="icon"
                                                className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 border-4 border-black/40"
                                                onClick={handleAvatarUploadClick}
                                                disabled={isUploadingAvatar}
                                            >
                                                <Camera className="h-4 w-4" />
                                            </Button>
                                            <input
                                                ref={avatarInputRef}
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                className="hidden"
                                                onChange={handleAvatarFileChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="text-center space-y-1 mb-6">
                                        <h2 className="text-2xl font-bold text-white">{editableData.name}</h2>
                                        <p className="text-slate-400 font-medium">{editableData.email || currentUser.email}</p>
                                        <div className="flex items-center justify-center gap-2 mt-3">
                                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1">
                                                {currentUser.role}
                                            </Badge>
                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1">
                                                Active
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-6 border-t border-white/10">
                                        <div className="text-center">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Academic Year</p>
                                            <p className="text-lg font-bold text-slate-200 mt-1">{academicYear}</p>
                                        </div>
                                        <div className="text-center border-l border-white/10">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Semester</p>
                                            <p className="text-lg font-bold text-slate-200 mt-1">{semester}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-4">
                                        <Button type="submit" className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/20 h-12 font-medium" disabled={isSaving}>
                                            {isSaving ? (
                                                <>
                                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving Changes...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Save All Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {currentUser.role === 'Super Admin' && (
                                <>
                                    <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                                        <CardHeader className="border-b border-white/5 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                                    <School className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg font-semibold text-white">System Configuration</CardTitle>
                                                    <CardDescription className="text-slate-400">Global academic settings</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-6">
                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="academic-year" className="text-slate-300">Academic Year</Label>
                                                    <Select value={currentAcademicYear} onValueChange={setCurrentAcademicYear}>
                                                        <SelectTrigger id="academic-year" className="h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20">
                                                            <SelectValue placeholder="Select academic year" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                                            {academicYearOptions.map(year => (
                                                                <SelectItem key={year} value={year} className="focus:bg-white/10 focus:text-white">{year}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="semester" className="text-slate-300">Semester</Label>
                                                    <Select value={currentSemester} onValueChange={setCurrentSemester}>
                                                        <SelectTrigger id="semester" className="h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20">
                                                            <SelectValue placeholder="Select semester" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                                            {semesterOptions.map(sem => (
                                                                <SelectItem key={sem.value} value={sem.value} className="focus:bg-white/10 focus:text-white">{sem.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                                        <CardHeader className="border-b border-white/5 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                                                    <CalendarIcon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg font-semibold text-white">Enrollment Schedule</CardTitle>
                                                    <CardDescription className="text-slate-400">Set enrollment period</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Start Date</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 hover:bg-white/5 hover:text-white",
                                                                !startDate && "text-slate-500",
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 rounded-xl bg-slate-900 border-white/10 text-slate-200" align="start">
                                                        <Calendar 
                                                            mode="single" 
                                                            selected={startDate} 
                                                            onSelect={setStartDate} 
                                                            initialFocus 
                                                            className="bg-slate-900 text-slate-200 rounded-xl"
                                                            classNames={{
                                                                day_selected: "bg-blue-600 text-white hover:bg-blue-500 focus:bg-blue-500",
                                                                day_today: "bg-white/5 text-blue-400",
                                                                day: "hover:bg-white/10 rounded-md",
                                                                head_cell: "text-slate-400",
                                                                nav_button: "border-white/10 hover:bg-white/10 hover:text-white",
                                                            }}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">End Date</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 hover:bg-white/5 hover:text-white",
                                                                !endDate && "text-slate-500",
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 rounded-xl bg-slate-900 border-white/10 text-slate-200" align="start">
                                                        <Calendar 
                                                            mode="single" 
                                                            selected={endDate} 
                                                            onSelect={setEndDate} 
                                                            initialFocus 
                                                            className="bg-slate-900 text-slate-200 rounded-xl"
                                                            classNames={{
                                                                day_selected: "bg-blue-600 text-white hover:bg-blue-500 focus:bg-blue-500",
                                                                day_today: "bg-white/5 text-blue-400",
                                                                day: "hover:bg-white/10 rounded-md",
                                                                head_cell: "text-slate-400",
                                                                nav_button: "border-white/10 hover:bg-white/10 hover:text-white",
                                                            }}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                                        <CardHeader className="border-b border-white/5 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                                    <Filter className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg font-semibold text-white">Phase Filter</CardTitle>
                                                    <CardDescription className="text-slate-400">Control student access</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="enrollment-phase" className="text-slate-300">Allowed Year Level</Label>
                                                <Select value={activeEnrollmentPhase} onValueChange={setActiveEnrollmentPhase}>
                                                    <SelectTrigger id="enrollment-phase" className="h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20">
                                                        <SelectValue placeholder="Choose a phase" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                                        <SelectItem value="all" className="focus:bg-white/10 focus:text-white">All year levels</SelectItem>
                                                        {enrollmentPhaseOptions.map((phase) => (
                                                            <SelectItem key={phase} value={phase} className="focus:bg-white/10 focus:text-white">{formatPhaseLabel(phase)}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                                        <CardHeader className="border-b border-white/5 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                                                    <RefreshCw className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg font-semibold text-white">Academic Rollover</CardTitle>
                                                    <CardDescription className="text-slate-400">Promote students & reset term</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-4">
                                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm space-y-2">
                                                <div className="flex items-center justify-between text-slate-400">
                                                    <span>Current</span>
                                                    <span className="text-slate-200 font-medium">{academicYear} / {semester}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-slate-400">
                                                    <span>Target</span>
                                                    <span className="text-slate-200 font-medium">{currentAcademicYear} / {currentSemester}</span>
                                                </div>
                                                {termChanged ? (
                                                    <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Ready to preview
                                                    </p>
                                                ) : (
                                                    <p className="text-slate-500 text-xs mt-2">Change term to enable</p>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                                                onClick={handlePreviewRollover}
                                                disabled={!termChanged || isPreviewingRollover}
                                            >
                                                {isPreviewingRollover ? 'Generating preview...' : 'Preview Rollover'}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </div>

                        {/* Right Column - Forms & Content */}
                        <div className="lg:col-span-8 space-y-6">
                            {/* Personal Information */}
                            <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                                <CardHeader className="border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-semibold text-white">Personal Information</CardTitle>
                                            <CardDescription className="text-slate-400">Update your profile details</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-slate-300">Full Name</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                <Input 
                                                    id="name" 
                                                    value={editableData.name} 
                                                    onChange={handleInputChange} 
                                                    className="pl-9 h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20" 
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                <Input 
                                                    id="email" 
                                                    type="email" 
                                                    value={editableData.email} 
                                                    onChange={handleInputChange} 
                                                    className="pl-9 h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            type="button"
                                            onClick={handleSaveProfile}
                                            className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                    Saving Changes...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="mr-2 h-4 w-4" />
                                                    Save Profile
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Change Password */}
                            <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                                <CardHeader className="border-b border-white/5 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-semibold text-white">Security</CardTitle>
                                            <CardDescription className="text-slate-400">Manage your password</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="current-password" className="text-slate-300">Current Password</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                <Input 
                                                    id="current-password" 
                                                    type={showCurrentPassword ? 'text' : 'password'} 
                                                    value={currentPassword} 
                                                    onChange={(e) => setCurrentPassword(e.target.value)} 
                                                    className="pl-9 pr-10 h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20" 
                                                />
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setShowCurrentPassword(prev => !prev)}>
                                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid gap-6 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="new-password" className="text-slate-300">New Password</Label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                    <Input 
                                                        id="new-password" 
                                                        type={showNewPassword ? 'text' : 'password'} 
                                                        value={newPassword} 
                                                        onChange={(e) => setNewPassword(e.target.value)} 
                                                        className="pl-9 pr-10 h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20" 
                                                    />
                                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setShowNewPassword(prev => !prev)}>
                                                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirm-password" className="text-slate-300">Confirm Password</Label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                                    <Input 
                                                        id="confirm-password" 
                                                        type={showConfirmPassword ? 'text' : 'password'} 
                                                        value={confirmPassword} 
                                                        onChange={(e) => setConfirmPassword(e.target.value)} 
                                                        className="pl-9 pr-10 h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20" 
                                                    />
                                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setShowConfirmPassword(prev => !prev)}>
                                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button type="button" onClick={handlePasswordChange} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" disabled={isChangingPassword}>
                                            {isChangingPassword ? 'Updating...' : 'Update Password'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {currentUser.role === 'Super Admin' && (
                                <>
                                    {/* Announcements */}
                                    <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                                        <CardHeader className="border-b border-white/5 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                                                    <Megaphone className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg font-semibold text-white">Announcements</CardTitle>
                                                    <CardDescription className="text-slate-400">Broadcast updates to users</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-6">
                                            <div className="grid gap-6 lg:grid-cols-2">
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="announcement-title" className="text-slate-300">Title</Label>
                                                        <Input
                                                            id="announcement-title"
                                                            value={announcementTitle}
                                                            onChange={(event) => setAnnouncementTitle(event.target.value)}
                                                            placeholder="e.g., Enrollment Week Reminders"
                                                            className="h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="announcement-message" className="text-slate-300">Message</Label>
                                                        <Textarea
                                                            id="announcement-message"
                                                            value={announcementMessage}
                                                            onChange={(event) => setAnnouncementMessage(event.target.value)}
                                                            placeholder="Write your announcement here..."
                                                            rows={5}
                                                            className="rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20 resize-none"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="announcement-audience" className="text-slate-300">Audience</Label>
                                                        <Select
                                                            value={announcementAudience}
                                                            onValueChange={(value) => setAnnouncementAudience(value as 'All' | 'Students' | 'Instructors')}
                                                        >
                                                            <SelectTrigger id="announcement-audience" className="h-11 rounded-xl bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20">
                                                                <SelectValue placeholder="Choose audience" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                                                <SelectItem value="Students" className="focus:bg-white/10 focus:text-white">Students</SelectItem>
                                                                <SelectItem value="Instructors" className="focus:bg-white/10 focus:text-white">Instructors</SelectItem>
                                                                <SelectItem value="All" className="focus:bg-white/10 focus:text-white">All Users</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        onClick={handlePublishAnnouncement}
                                                        className="w-full rounded-xl bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20"
                                                        disabled={isPublishingAnnouncement}
                                                    >
                                                        {isPublishingAnnouncement ? 'Publishing...' : 'Publish Announcement'}
                                                    </Button>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-sm font-semibold text-slate-300">Recent Announcements</h3>
                                                        <Badge variant="outline" className="border-white/10 text-slate-400">{announcements.length}</Badge>
                                                    </div>
                                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {announcements.length === 0 && (
                                                            <div className="text-center py-8 text-slate-500 border border-dashed border-white/10 rounded-xl">
                                                                <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                                <p>No announcements yet</p>
                                                            </div>
                                                        )}
                                                        {announcements.map((announcement) => (
                                                            <div key={announcement.id} className="group relative rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10">
                                                                <div className="flex justify-between items-start gap-3">
                                                                    <div className="space-y-1">
                                                                        <p className="font-medium text-slate-200 line-clamp-1">{announcement.title}</p>
                                                                        <p className="text-xs text-slate-500">
                                                                            {format(new Date(announcement.createdAt), 'MMM d, yyyy • h:mm a')}
                                                                        </p>
                                                                    </div>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 -mr-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => handleRemoveAnnouncement(announcement.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                <p className="mt-2 text-sm text-slate-400 line-clamp-2">{announcement.message}</p>
                                                                <div className="mt-3 flex items-center gap-2">
                                                                    <Badge variant="secondary" className="bg-white/5 text-slate-400 text-[10px] hover:bg-white/10">
                                                                        {announcement.audience}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Program Calendar */}
                                    <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                                        <CardHeader className="border-b border-white/5 pb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                                                    <CalendarIcon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg font-semibold text-white">Program Calendar</CardTitle>
                                                    <CardDescription className="text-slate-400">Schedule institutional events</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            <div className="grid gap-8 lg:grid-cols-2">
                                                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                                                    <Calendar
                                                        mode="single"
                                                        selected={programCalendarDate}
                                                        onSelect={handleSelectProgramDate}
                                                        modifiers={{ programDay: calendarProgramDates }}
                                                        className="w-full"
                                                        classNames={{
                                                            root: 'w-full',
                                                            months: 'w-full',
                                                            month: 'w-full space-y-4',
                                                            caption: 'flex justify-center pt-1 relative items-center px-2',
                                                            caption_label: 'text-sm font-medium text-slate-200',
                                                            nav: 'space-x-1 flex items-center',
                                                            nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-slate-200 hover:bg-white/10 rounded-md',
                                                            table: 'w-full border-collapse space-y-1',
                                                            head_row: 'flex w-full justify-between',
                                                            head_cell: 'text-slate-500 rounded-md w-9 font-normal text-[0.8rem]',
                                                            row: 'flex w-full mt-2 justify-between',
                                                            cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-blue-500/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                                                            day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-white/10 rounded-md text-slate-200',
                                                            day_selected: 'bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white',
                                                            day_today: 'bg-white/5 text-blue-400',
                                                            day_outside: 'text-slate-600 opacity-50',
                                                            day_disabled: 'text-slate-600 opacity-50',
                                                            day_hidden: 'invisible',
                                                        }}
                                                        components={{ DayContent: ProgramCalendarDay }}
                                                    />
                                                </div>
                                                <div className="space-y-6">
                                                    <div className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="font-medium text-slate-200">{format(programCalendarDate, 'MMMM d, yyyy')}</h4>
                                                            <Badge variant="outline" className="border-white/10 text-slate-400">Selected</Badge>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <Input
                                                                value={programTitleInput}
                                                                onChange={(e) => setProgramTitleInput(e.target.value)}
                                                                placeholder="Event title"
                                                                className="h-10 rounded-lg bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20"
                                                            />
                                                            <Textarea
                                                                value={programDescriptionInput}
                                                                onChange={(e) => setProgramDescriptionInput(e.target.value)}
                                                                placeholder="Event details..."
                                                                rows={3}
                                                                className="rounded-lg bg-white/5 border-white/10 text-slate-200 focus:ring-blue-500/20 resize-none"
                                                            />
                                                            <Button 
                                                                type="button" 
                                                                onClick={handleAddProgramEvent}
                                                                disabled={isCreatingProgramEvent}
                                                                className="w-full rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                                                            >
                                                                {isCreatingProgramEvent ? 'Saving...' : 'Add Event'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-3">
                                                        <h4 className="text-sm font-medium text-slate-400">Events on this day</h4>
                                                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {isLoadingProgramEvents ? (
                                                                <p className="text-sm text-slate-500 italic">Loading events...</p>
                                                            ) : programsForSelectedDate.length === 0 ? (
                                                                <p className="text-sm text-slate-500 italic">No events scheduled.</p>
                                                            ) : (
                                                                programsForSelectedDate.map((event) => (
                                                                    <div key={event.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                                                                        <div>
                                                                            <p className="font-medium text-slate-200 text-sm">{event.title}</p>
                                                                            {event.description && (
                                                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{event.description}</p>
                                                                            )}
                                                                        </div>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                                                                            onClick={() => handleRemoveProgramEvent(event.id, event.title)}
                                                                            disabled={deletingProgramEventId === event.id}
                                                                        >
                                                                            {deletingProgramEventId === event.id ? (
                                                                                <RefreshCw className="h-3 w-3 animate-spin" />
                                                                            ) : (
                                                                                <Trash2 className="h-3 w-3" />
                                                                            )}
                                                                        </Button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}
