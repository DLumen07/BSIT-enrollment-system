
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Eye, EyeOff, Calendar as CalendarIcon, Trash2, Download } from 'lucide-react';
import { useAdmin } from '../../context/admin-context';
import type { AdminAnnouncement } from '../../context/admin-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isSameDay } from 'date-fns';
import { cn, resolveMediaUrl } from '@/lib/utils';
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
    id: string;
    date: string;
    title: string;
    description: string;
    createdAt: string;
};

const PROGRAM_EVENTS_STORAGE_KEY = 'bsit_admin_program_events';

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

    const selectedDateLabel = useMemo(() => format(programCalendarDate, 'PPPP'), [programCalendarDate]);

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

    const programsForSelectedDate = useMemo(() => {
        return programEvents
            .filter((event) => {
                const eventDate = new Date(event.date);
                return isSameDay(eventDate, programCalendarDate);
            })
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [programCalendarDate, programEvents]);

    const calendarProgramDates = useMemo(() => programEvents.map((event) => new Date(event.date)), [programEvents]);

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
        if (typeof window === 'undefined') {
            return;
        }
        try {
            const stored = window.localStorage.getItem(PROGRAM_EVENTS_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setProgramEvents(parsed as ProgramEvent[]);
                }
            }
        } catch (_error) {
            // Ignore malformed storage payloads.
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            window.localStorage.setItem(PROGRAM_EVENTS_STORAGE_KEY, JSON.stringify(programEvents));
        } catch (_error) {
            // Ignore storage quota errors.
        }
    }, [programEvents]);

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

    const handleAddProgramEvent = useCallback(() => {
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

        const eventId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `program-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const newEvent: ProgramEvent = {
            id: eventId,
            date: programCalendarDate.toISOString(),
            title: trimmedTitle,
            description: trimmedDescription,
            createdAt: new Date().toISOString(),
        };

        setProgramEvents(prev => [...prev, newEvent]);
        setProgramTitleInput('');
        setProgramDescriptionInput('');

        toast({
            title: 'Program scheduled',
            description: `${trimmedTitle} was added for ${format(programCalendarDate, 'PPPP')}.`,
        });
    }, [programCalendarDate, programDescriptionInput, programTitleInput, toast]);

    const handleRemoveProgramEvent = useCallback((eventId: string) => {
        setProgramEvents(prev => prev.filter(event => event.id !== eventId));
        toast({
            title: 'Program removed',
            description: 'The selected program entry was removed from the calendar.',
        });
    }, [toast]);

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

        if (!validateEnrollmentDates()) {
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

    const handleSaveAll = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!currentUser || isSaving) {
            return;
        }

        const trimmedName = editableData.name.trim();
        const trimmedEmail = editableData.email.trim().toLowerCase();

        if (trimmedName === '' || trimmedEmail === '') {
            toast({
                variant: 'destructive',
                title: 'Missing information',
                description: 'Please provide both name and email before saving.',
            });
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            toast({
                variant: 'destructive',
                title: 'Invalid Email',
                description: 'Please provide a valid email address.',
            });
            return;
        }

        if (!validateEnrollmentDates()) {
            return;
        }

        setRolloverPreview(null);
        silentRolloverDialogClose.current = true;
        setShowRolloverDialog(false);
        setRolloverPreviewSignature(null);
        setRolloverPreviewParams(null);

        setIsSaving(true);

        try {
            await callAdminApi('update_admin.php', {
                userId: currentUser.id,
                name: trimmedName,
                email: trimmedEmail,
                role: currentUser.role,
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

            setAdminData(() => ({
                ...refreshed,
                currentUser: updatedUser,
            }));

            setEditableData({ name: updatedUser.name, email: updatedUser.email });

            const startDateIso = formatDateForApi(startDate ?? null);
            const endDateIso = formatDateForApi(endDate ?? null);
            const originalStartIso = formatDateForApi(enrollmentStartDate ?? null);
            const originalEndIso = formatDateForApi(enrollmentEndDate ?? null);
            const datesChanged = startDateIso !== originalStartIso || endDateIso !== originalEndIso;
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
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Academic Rollover</AlertDialogTitle>
                        <AlertDialogDescription>
                            {rolloverPreview
                                ? `The system will promote eligible students, reset enrollment statuses, and update the active term to ${rolloverPreview.nextAcademicYear} (${rolloverPreview.nextSemester}).`
                                : 'Review the summary before confirming.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {rolloverPreview && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                                <div><span className="font-medium">Closing Term:</span> {rolloverPreview.closingAcademicYear} / {rolloverPreview.closingSemester}</div>
                                <div><span className="font-medium">New Term:</span> {rolloverPreview.nextAcademicYear} / {rolloverPreview.nextSemester}</div>
                                <div><span className="font-medium">Students evaluated:</span> {rolloverPreview.summary.totalActiveStudents}</div>
                                <div><span className="font-medium">Graduating:</span> {rolloverPreview.summary.graduated}</div>
                            </div>
                            <div className="rounded-lg border p-3 text-sm">
                                <p className="mb-2 font-semibold">Promotion Summary</p>
                                <div className="grid grid-cols-2 gap-y-1">
                                    <span className="text-muted-foreground">Promoted</span>
                                    <span className="text-right font-medium">{rolloverPreview.summary.promoted}</span>
                                    <span className="text-muted-foreground">Held for review</span>
                                    <span className="text-right font-medium">{rolloverPreview.summary.held}</span>
                                    <span className="text-muted-foreground">Graduated</span>
                                    <span className="text-right font-medium">{rolloverPreview.summary.graduated}</span>
                                </div>
                            </div>
                            <div className="rounded-lg border p-3 space-y-2">
                                <p className="text-sm font-semibold">Detailed Results</p>
                                <p className="text-sm text-muted-foreground">
                                    Student-level outcomes are available through the export and the Reports view. Use the summary above to verify counts, then drill down only when needed.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-muted-foreground">
                                    {rolloverProgressMessage ?? 'Review the preview carefully before confirming. You can export the summary or open the reports center for full details.'}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleDownloadPreview} disabled={!rolloverPreview}>
                                        <Download className="h-4 w-4" />
                                        Export Preview
                                    </Button>
                                    <Button type="button" variant="secondary" size="sm" className="gap-2" asChild>
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
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                handleConfirmRollover();
                            }}
                            disabled={isExecutingRollover}
                        >
                            {isExecutingRollover ? 'Processing...' : 'Confirm Rollover'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <main className="flex-1 p-4 sm:p-6 space-y-6">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your profile and account settings.
                </p>
            </div>
            <form onSubmit={handleSaveAll}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="rounded-xl">
                            <CardContent className="pt-6 flex flex-col items-center text-center">
                                <div className="relative mb-4">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage src={currentUser.avatar || undefined} alt={currentUser.name} data-ai-hint="person avatar"/>
                                        <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background hover:bg-muted"
                                        onClick={handleAvatarUploadClick}
                                        disabled={isUploadingAvatar}
                                        aria-busy={isUploadingAvatar}
                                    >
                                        <Camera className="h-4 w-4" />
                                        <span className="sr-only">{isUploadingAvatar ? 'Uploading photo' : 'Change photo'}</span>
                                    </Button>
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={handleAvatarFileChange}
                                    />
                                </div>
                                <h2 className="text-xl font-semibold">{editableData.name}</h2>
                                <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                                <p className="text-sm text-muted-foreground">{currentUser.role}</p>
                            </CardContent>
                        </Card>
                        {currentUser.role === 'Super Admin' && (
                            <>
                                <Card className="rounded-xl">
                                    <CardHeader>
                                        <CardTitle>System Settings</CardTitle>
                                        <CardDescription>Manage global settings for the application.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="academic-year">Academic Year</Label>
                                                <Select value={currentAcademicYear} onValueChange={setCurrentAcademicYear}>
                                                    <SelectTrigger id="academic-year" className="rounded-xl">
                                                        <SelectValue placeholder="Select academic year" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {academicYearOptions.map(year => (
                                                            <SelectItem key={year} value={year}>{year}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="semester">Semester</Label>
                                                <Select value={currentSemester} onValueChange={setCurrentSemester}>
                                                    <SelectTrigger id="semester" className="rounded-xl">
                                                        <SelectValue placeholder="Select semester" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {semesterOptions.map(sem => (
                                                            <SelectItem key={sem.value} value={sem.value}>{sem.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-xl">
                                    <CardHeader>
                                        <CardTitle>General Enrollment Schedule</CardTitle>
                                        <CardDescription>Set the main start and end dates for enrollment.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-4">
                                            <div className="space-y-2">
                                                <Label>Start Date</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal rounded-xl",
                                                                !startDate && "text-muted-foreground",
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                                                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>End Date</Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full justify-start text-left font-normal rounded-xl",
                                                                !endDate && "text-muted-foreground",
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                                                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-xl">
                                    <CardHeader>
                                        <CardTitle>Enrollment Phase Filter</CardTitle>
                                        <CardDescription>Limit enrollment access to specific year levels during phased rollouts.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="enrollment-phase">Currently allowed year level</Label>
                                            <Select value={activeEnrollmentPhase} onValueChange={setActiveEnrollmentPhase}>
                                                <SelectTrigger id="enrollment-phase" className="rounded-xl">
                                                    <SelectValue placeholder="Choose a phase" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All year levels</SelectItem>
                                                    {enrollmentPhaseOptions.map((phase) => (
                                                        <SelectItem key={phase} value={phase}>{formatPhaseLabel(phase)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Students outside the selected year level will see a notice that enrollment is not yet open for them.
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-xl">
                                    <CardHeader>
                                        <CardTitle>Academic Rollover</CardTitle>
                                        <CardDescription>Preview and confirm promotions before activating the next term.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-muted-foreground">
                                            The rollover promotes eligible students, locks in grades, resets blocks, and updates the global academic term. Generate a fresh preview whenever the target term or enrollment schedule changes.
                                        </p>
                                        <div className="rounded-xl border bg-muted/40 p-4 text-sm space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">Current term</span>
                                                <span>{academicYear} / {semester}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">Target term</span>
                                                <span>{currentAcademicYear} / {currentSemester}</span>
                                            </div>
                                            {termChanged ? (
                                                <p className="text-emerald-700 dark:text-emerald-400">Ready to preview the rollover for the selected target term.</p>
                                            ) : (
                                                <p className="text-muted-foreground">Adjust the academic year and semester above to choose the next term.</p>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-xs text-muted-foreground">
                                                Preview includes concurrency checks and must match the final confirmation.
                                            </p>
                                            <Button
                                                type="button"
                                                className="rounded-xl"
                                                onClick={handlePreviewRollover}
                                                disabled={!termChanged || isPreviewingRollover}
                                            >
                                                {isPreviewingRollover ? 'Generating preview...' : 'Preview academic rollover'}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                        <div>
                            <Button type="submit" className="rounded-xl w-full" disabled={isSaving}>
                                {isSaving
                                    ? 'Saving...'
                                    : currentUser.role === 'Super Admin'
                                        ? 'Save All Changes'
                                        : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        <Tabs defaultValue="profile" className="w-full space-y-4">
                            <TabsList className="grid w-full grid-cols-2 rounded-xl">
                                <TabsTrigger value="profile">Profile</TabsTrigger>
                                <TabsTrigger value="password">Password</TabsTrigger>
                            </TabsList>

                            <TabsContent value="profile">
                                <Card className="rounded-xl h-full">
                                    <CardHeader>
                                        <CardTitle>Personal Information</CardTitle>
                                        <CardDescription>
                                            Update your personal details here.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input id="name" value={editableData.name} onChange={handleInputChange} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input id="email" type="email" value={editableData.email} onChange={handleInputChange} className="rounded-xl" />
                                        </div>
                                        <InfoField label="Role" value={currentUser.role} />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <TabsContent value="password">
                                <Card className="rounded-xl h-full">
                                    <CardHeader>
                                        <CardTitle>Change Password</CardTitle>
                                        <CardDescription>
                                            For security, please choose a strong password.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="current-password">Current Password</Label>
                                            <div className="relative group">
                                                <Input id="current-password" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="rounded-xl pr-10" />
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowCurrentPassword(prev => !prev)}>
                                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new-password">New Password</Label>
                                            <div className="relative group">
                                                <Input id="new-password" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="rounded-xl pr-10" />
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowNewPassword(prev => !prev)}>
                                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                                            <div className="relative group">
                                                <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="rounded-xl pr-10" />
                                                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={() => setShowConfirmPassword(prev => !prev)}>
                                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button type="button" onClick={handlePasswordChange} className="rounded-xl" disabled={isChangingPassword}>
                                            {isChangingPassword ? 'Changing...' : 'Change Password'}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </TabsContent>
                        </Tabs>
                        {currentUser.role === 'Super Admin' && (
                            <>
                                <Card className="rounded-xl">
                                    <CardHeader>
                                        <CardTitle>Announcements</CardTitle>
                                        <CardDescription>Publish updates that appear on the student dashboard.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid gap-6 lg:grid-cols-2 lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="announcement-title">Title</Label>
                                                    <Input
                                                        id="announcement-title"
                                                        value={announcementTitle}
                                                        onChange={(event) => setAnnouncementTitle(event.target.value)}
                                                        placeholder="Enrollment Week Reminders"
                                                        className="rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="announcement-message">Message</Label>
                                                    <Textarea
                                                        id="announcement-message"
                                                        value={announcementMessage}
                                                        onChange={(event) => setAnnouncementMessage(event.target.value)}
                                                        placeholder="Provide the details students need to know."
                                                        rows={7}
                                                        className="rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="announcement-audience">Audience</Label>
                                                    <Select
                                                        value={announcementAudience}
                                                        onValueChange={(value) => setAnnouncementAudience(value as 'All' | 'Students' | 'Instructors')}
                                                    >
                                                        <SelectTrigger id="announcement-audience" className="rounded-xl">
                                                            <SelectValue placeholder="Choose who sees this" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Students">Students</SelectItem>
                                                            <SelectItem value="Instructors">Instructors</SelectItem>
                                                            <SelectItem value="All">All Users</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex justify-end">
                                                    <Button
                                                        type="button"
                                                        onClick={handlePublishAnnouncement}
                                                        className="rounded-xl w-full sm:w-auto"
                                                        disabled={isPublishingAnnouncement}
                                                    >
                                                        {isPublishingAnnouncement ? 'Publishing...' : 'Publish Announcement'}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-4">
                                                <div className="space-y-1">
                                                    <h3 className="text-sm font-semibold text-muted-foreground">Published Announcements</h3>
                                                    <p className="text-xs text-muted-foreground">Newest messages appear first.</p>
                                                </div>
                                                <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                                                    {announcements.length === 0 && (
                                                        <p className="text-sm text-muted-foreground">No announcements have been published yet.</p>
                                                    )}
                                                    {announcements.map((announcement) => {
                                                        const createdAtDate = new Date(announcement.createdAt);
                                                        const timestampLabel = Number.isNaN(createdAtDate.getTime())
                                                            ? 'Date unavailable'
                                                            : format(createdAtDate, 'PPpp');
                                                        const authorName = announcement.createdBy?.name?.trim() || 'System';
                                                        const authorEmail = announcement.createdBy?.email?.trim();
                                                        const authorLabel = authorEmail ? `${authorName} • ${authorEmail}` : authorName;

                                                        return (
                                                            <div key={announcement.id} className="rounded-xl border bg-muted/20 p-4 shadow-sm transition-colors hover:bg-muted/30">
                                                                <div className="flex items-start justify-between gap-4">
                                                                    <div className="space-y-1">
                                                                        <p className="text-sm font-semibold leading-tight">{announcement.title}</p>
                                                                        <p className="text-xs text-muted-foreground">{timestampLabel}</p>
                                                                        <p className="text-xs text-muted-foreground">Posted by {authorLabel}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="outline" className="rounded-full px-3 py-0.5 text-xs font-medium">
                                                                            {announcement.audience}
                                                                        </Badge>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                                                                            onClick={() => handleRemoveAnnouncement(announcement.id)}
                                                                            aria-label="Remove announcement"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                                <Separator className="my-3" />
                                                                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{announcement.message}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="rounded-xl lg:max-h-[640px] lg:overflow-hidden">
                                    <CardHeader>
                                        <CardTitle>Program Calendar</CardTitle>
                                        <CardDescription>Plan institutional programs and keep important dates at a glance.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="grid gap-6 lg:grid-cols-2 lg:items-start">
                                        <div className="rounded-xl border bg-muted/10 p-2 lg:sticky lg:top-0 lg:self-start">
                                            <Calendar
                                                mode="single"
                                                selected={programCalendarDate}
                                                onSelect={handleSelectProgramDate}
                                                modifiers={{ programDay: calendarProgramDates }}
                                                modifiersClassNames={{ programDay: 'border border-primary text-primary font-semibold' }}
                                                    className="w-full"
                                                initialFocus
                                            />
                                        </div>
                                        <div className="space-y-5 lg:max-h-[520px] lg:overflow-y-auto lg:pr-2">
                                            <div className="rounded-xl border p-4 space-y-4">
                                                <div>
                                                    <p className="text-sm font-semibold">Selected date</p>
                                                    <p className="text-sm text-muted-foreground">{selectedDateLabel}</p>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="program-title">Program name</Label>
                                                    <Input
                                                        id="program-title"
                                                        value={programTitleInput}
                                                        onChange={(event) => setProgramTitleInput(event.target.value)}
                                                        placeholder="e.g., Faculty Development Day"
                                                        className="rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="program-description">Details</Label>
                                                    <Textarea
                                                        id="program-description"
                                                        value={programDescriptionInput}
                                                        onChange={(event) => setProgramDescriptionInput(event.target.value)}
                                                        placeholder="Add venue, teams involved, or reminders."
                                                        rows={4}
                                                        className="rounded-xl"
                                                    />
                                                </div>
                                                <Button type="button" className="rounded-xl w-full" onClick={handleAddProgramEvent}>
                                                    Add to calendar
                                                </Button>
                                            </div>
                                            <div className="rounded-xl border p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold">Programs on this date</p>
                                                        <p className="text-xs text-muted-foreground">{programsForSelectedDate.length > 0 ? 'Keep track of commitments for the selected date.' : 'No programs scheduled yet.'}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                                    {programsForSelectedDate.length === 0 && (
                                                        <p className="text-sm text-muted-foreground">Nothing planned for this day. Add a program using the form above.</p>
                                                    )}
                                                    {programsForSelectedDate.map((event) => (
                                                        <div key={event.id} className="rounded-lg border bg-muted/30 p-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="text-sm font-semibold leading-tight">{event.title}</p>
                                                                    {event.description && (
                                                                        <p className="text-xs text-muted-foreground whitespace-pre-line mt-1">{event.description}</p>
                                                                    )}
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                    onClick={() => handleRemoveProgramEvent(event.id)}
                                                                    aria-label="Remove program"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
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
            </main>
        </>
    );
}
