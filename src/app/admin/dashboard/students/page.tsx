
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MoreHorizontal, Search, Filter, FilterX, Trash2, PlusCircle, Loader2, FileText, GraduationCap, User, Mail, Phone, Layers, BookOpen } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAdmin, Student, Subject, SemesterValue, ApplicationDocument } from '../../context/admin-context';
import { useToast } from '@/hooks/use-toast';
import { notifyDataChanged } from '@/lib/live-sync';
import { cn } from '@/lib/utils';

const normalizeSubjectCode = (code?: string | null): string => {
    if (typeof code !== 'string') {
        return '';
    }
    return code.trim().toUpperCase();
};

type YearKey = '1st-year' | '2nd-year' | '3rd-year' | '4th-year';
const yearLevelFromNumber = (year?: number | null): YearKey | null => {
    if (typeof year !== 'number') {
        return null;
    }
    const mapping: Record<number, YearKey> = {
        1: '1st-year',
        2: '2nd-year',
        3: '3rd-year',
        4: '4th-year',
    };
    return mapping[year] ?? null;
};

const VALID_SEMESTERS: SemesterValue[] = ['1st-sem', '2nd-sem', 'summer'];
type CatalogSubject = Subject & { yearKey?: YearKey };

const formatDocumentSize = (bytes?: number | null): string | null => {
    if (!bytes || bytes <= 0) {
        return null;
    }
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024;
    if (mb < 1024) {
        return `${mb.toFixed(1)} MB`;
    }
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
};

const formatDocumentDate = (value?: string | null): string | null => {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const getDocumentStatusVariant = (status?: ApplicationDocument['status']) => {
    const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';
    switch (normalized) {
        case 'submitted':
            return 'secondary';
        case 'pending':
            return 'outline';
        case 'approved':
            return 'default';
        case 'rejected':
            return 'destructive';
        default:
            return 'outline';
    }
};

const InfoRow = ({ icon: Icon, label, value }: { icon?: React.ElementType, label: string, value?: string | number | null }) => {
    if (!value) return null;
    return (
        <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-3 text-slate-400">
                {Icon && <div className="p-1.5 rounded-md bg-white/5"><Icon className="h-3.5 w-3.5" /></div>}
                <span className="text-sm font-medium">{label}</span>
            </div>
            <span className="text-sm font-semibold text-slate-200">{value}</span>
        </div>
    );
};

type ModifySubjectResponse = {
    status: 'success' | 'error';
    message?: string;
    data?: {
        subjects?: Array<Partial<Subject>>;
    };
};

const ORF_RELEASE_STORAGE_KEY = 'admin_orf_release_history_v1';

type OrfReleaseMap = Record<string, string>;

const readStoredOrfReleases = (): OrfReleaseMap => {
    if (typeof window === 'undefined') {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(ORF_RELEASE_STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return Object.entries(parsed).reduce<OrfReleaseMap>((acc, [key, value]) => {
                if (typeof key === 'string' && typeof value === 'string') {
                    acc[key] = value;
                }
                return acc;
            }, {});
        }
    } catch (error) {
        console.warn('[AdminStudents] Failed to read ORF release history.', error);
    }
    return {};
};

const persistOrfReleases = (map: OrfReleaseMap) => {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(ORF_RELEASE_STORAGE_KEY, JSON.stringify(map));
    } catch (error) {
        console.warn('[AdminStudents] Failed to persist ORF release history.', error);
    }
};

export default function StudentsPage() {
    const { adminData, setAdminData } = useAdmin();
    const { students } = adminData;
    const isModerator = adminData.currentUser?.role === 'Moderator';
    const { toast } = useToast();
    const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api').replace(/\/$/, '');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        course: 'all',
        year: 'all',
        status: 'Enrolled', // Hardcoded to 'Enrolled'
    });

    const [enrolledStudents, setEnrolledStudents] = useState<Student[]>(() => students.filter(student => student.status === 'Enrolled'));
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [deleteInput, setDeleteInput] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    const [subjectActionBusy, setSubjectActionBusy] = useState(false);
    const [isAddSubjectPopoverOpen, setIsAddSubjectPopoverOpen] = useState(false);
    const [documentActionId, setDocumentActionId] = useState<number | null>(null);
    const [orfReleaseMap, setOrfReleaseMap] = useState<OrfReleaseMap>({});

    useEffect(() => {
        setOrfReleaseMap(readStoredOrfReleases());
    }, []);

    const buildOrfReleaseKey = useCallback((studentId?: number | null) => {
        if (!studentId || studentId <= 0) {
            return null;
        }
        const academicYear = typeof adminData.academicYear === 'string' && adminData.academicYear.trim() !== ''
            ? adminData.academicYear.trim()
            : 'AY-UNSPECIFIED';
        const semester = typeof adminData.semester === 'string' && adminData.semester.trim() !== ''
            ? adminData.semester.trim()
            : 'SEM-UNSPECIFIED';
        return `${academicYear}|${semester}|${studentId}`;
    }, [adminData.academicYear, adminData.semester]);

    const isOrfReleased = useCallback((student?: Student | null) => {
        if (!student) {
            return false;
        }
        const key = buildOrfReleaseKey(student.id);
        return key ? Boolean(orfReleaseMap[key]) : false;
    }, [buildOrfReleaseKey, orfReleaseMap]);

    const recordOrfRelease = useCallback((student: Student) => {
        const key = buildOrfReleaseKey(student?.id);
        if (!key) {
            return;
        }
        setOrfReleaseMap((prev) => {
            if (prev[key]) {
                return prev;
            }
            const next = { ...prev, [key]: new Date().toISOString() };
            persistOrfReleases(next);
            return next;
        });
    }, [buildOrfReleaseKey]);

    const handleClaimOrf = useCallback((student: Student) => {
        if (!student?.email) {
            toast({
                title: 'Email unavailable',
                description: 'Student email is required to generate the ORF.',
                variant: 'destructive',
            });
            return;
        }

        if (isOrfReleased(student)) {
            toast({
                title: 'ORF already released',
                description: 'This student already has an ORF for the current term.',
            });
            return;
        }

        const claimUrl = `${API_BASE_URL}/print_orf_form.php?email=${encodeURIComponent(student.email)}&ts=${Date.now()}`;
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';

        const cleanup = () => {
            setTimeout(() => iframe.remove(), 1500);
        };

        iframe.addEventListener('load', cleanup, { once: true });
        iframe.src = claimUrl;
        document.body.appendChild(iframe);
        recordOrfRelease(student);
        toast({
            title: 'ORF released',
            description: `A copy of ${student.name}'s ORF has been generated for ${adminData.semester} ${adminData.academicYear}.`,
        });
    }, [API_BASE_URL, adminData.academicYear, adminData.semester, isOrfReleased, recordOrfRelease, toast]);

    const mergeDocumentEntry = useCallback((documents: ApplicationDocument[] | undefined, updated: ApplicationDocument): ApplicationDocument[] => {
        if (!Array.isArray(documents) || documents.length === 0) {
            return [updated];
        }
        const index = documents.findIndex((doc) => doc.id === updated.id);
        if (index === -1) {
            return [updated, ...documents];
        }
        const clone = documents.slice();
        clone[index] = { ...clone[index], ...updated };
        return clone;
    }, []);

    const syncDocumentState = useCallback((studentUserId: number | null, updatedDoc: ApplicationDocument) => {
        if (!studentUserId) {
            return;
        }

        setAdminData(prev => ({
            ...prev,
            students: prev.students.map((student) =>
                student.id === studentUserId
                    ? { ...student, documents: mergeDocumentEntry(student.documents, updatedDoc) }
                    : student,
            ),
        }));

        setEnrolledStudents(prev => prev.map((student) =>
            student.id === studentUserId
                ? { ...student, documents: mergeDocumentEntry(student.documents, updatedDoc) }
                : student,
        ));

        setSelectedStudent(prev => {
            if (!prev || prev.id !== studentUserId) {
                return prev;
            }
            return { ...prev, documents: mergeDocumentEntry(prev.documents, updatedDoc) };
        });
    }, [mergeDocumentEntry, setAdminData, setEnrolledStudents, setSelectedStudent]);

    const buildDocumentUrl = useCallback((path?: string | null) => {
        if (!path || path.trim() === '') {
            return null;
        }
        if (/^https?:\/\//i.test(path)) {
            return path;
        }
        return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
    }, [API_BASE_URL]);

    const handleViewDocument = useCallback((url?: string | null) => {
        if (!url) {
            toast({
                variant: 'destructive',
                title: 'File unavailable',
                description: 'This document does not have a downloadable file yet.',
            });
            return;
        }
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Unable to open document',
                description: error instanceof Error ? error.message : 'Failed to open the document in a new tab.',
            });
        }
    }, [toast]);

    useEffect(() => {
        setEnrolledStudents(students.filter(student => student.status === 'Enrolled'));
    }, [students]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchEnrolledStudents = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/admin_data.php?student_enrollment_status=Enrolled`, {
                    cache: 'no-store',
                    credentials: 'include',
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(`Failed to load enrolled students (${response.status})`);
                }

                const payload = await response.json();
                if (payload?.status !== 'success' || !payload?.data) {
                    throw new Error(payload?.message ?? 'Backend returned an error status.');
                }

                const remoteStudents = Array.isArray(payload.data.students)
                    ? (payload.data.students as Student[])
                    : [];

                setEnrolledStudents(remoteStudents);
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }
                const message = error instanceof Error ? error.message : 'Failed to load enrolled students.';
                toast({
                    variant: 'destructive',
                    title: 'Unable to load enrolled students',
                    description: message,
                });
            }
        };

        fetchEnrolledStudents();

        return () => {
            controller.abort();
        };
    }, [API_BASE_URL, toast]);

    useEffect(() => {
        setSelectedSubjectId('');
    }, [selectedStudent]);

    const handleDocumentStatusUpdate = useCallback(async (documentId: number, nextStatus: 'Approved' | 'Rejected') => {
        setDocumentActionId(documentId);
        try {
            const response = await fetch(`${API_BASE_URL}/update_student_document_status.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ documentId, status: nextStatus }),
            });

            let payload: any = null;
            try {
                payload = await response.json();
            } catch (jsonError) {
                // Ignore parse issues; handled below via status.
            }

            if (!response.ok || !payload || payload.status !== 'success') {
                throw new Error(payload?.message ?? 'Unable to update the document status.');
            }

            const updatedDoc = payload?.data?.document;
            if (!updatedDoc) {
                throw new Error('Server response did not include the updated document.');
            }

            const targetStudentId = Number(updatedDoc.studentUserId ?? 0) || null;
            const normalizedDoc: ApplicationDocument = {
                id: Number(updatedDoc.id ?? documentId),
                name: typeof updatedDoc.name === 'string' && updatedDoc.name.trim() !== '' ? updatedDoc.name : 'Untitled Document',
                status: updatedDoc.status ?? nextStatus,
                fileName: updatedDoc.fileName ?? '',
                filePath: updatedDoc.filePath ?? '',
                fileType: updatedDoc.fileType ?? null,
                fileSize: typeof updatedDoc.fileSize === 'number' ? updatedDoc.fileSize : null,
                uploadedAt: updatedDoc.uploadedAt ?? null,
                updatedAt: updatedDoc.updatedAt ?? null,
            };

            syncDocumentState(targetStudentId, normalizedDoc);

            toast({
                title: nextStatus === 'Approved' ? 'Document approved' : 'Document rejected',
                description: `${normalizedDoc.name} marked as ${nextStatus.toLowerCase()}.`,
            });
            notifyDataChanged();
            notifyDataChanged('student-documents');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Update failed',
                description: error instanceof Error ? error.message : 'Unable to process the document right now.',
            });
        } finally {
            setDocumentActionId(null);
        }
    }, [API_BASE_URL, syncDocumentState, toast]);

    const openDeleteDialog = (student: Student) => {
        setSelectedStudent(student);
        setIsDeleteDialogOpen(true);
        setDeleteInput('');
    };
    
    const openProfileDialog = (student: Student) => {
        setSelectedStudent(student);
        setIsProfileDialogOpen(true);
    };

     const handleDeleteStudent = () => {
        if (!selectedStudent) return;
        setAdminData(prev => ({
            ...prev,
            students: prev.students.filter(s => s.id !== selectedStudent.id),
        }));
        setEnrolledStudents(prev => prev.filter(s => s.id !== selectedStudent.id));
        setIsDeleteDialogOpen(false);
        setSelectedStudent(null);
    };
    
    const handleFilterChange = (filterType: keyof Omit<typeof filters, 'status'>, value: string) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilters({ course: 'all', year: 'all', status: 'Enrolled' });
    };
    
    const isFiltered = Boolean(searchTerm || filters.course !== 'all' || filters.year !== 'all');

        const filteredStudents = useMemo(() => {
        const searchTermLower = searchTerm.toLowerCase();
        return enrolledStudents.filter(student => {
            const matchesSearch = searchTerm
                ? student.name.toLowerCase().includes(searchTermLower) ||
                  student.studentId.toLowerCase().includes(searchTermLower) ||
                  student.email.toLowerCase().includes(searchTermLower)
                : true;

            const matchesCourse = filters.course !== 'all' ? student.course === filters.course : true;
            const matchesYear = filters.year !== 'all' ? student.year.toString() === filters.year : true;
            const matchesStatus = student.status === 'Enrolled';

            return matchesSearch && matchesCourse && matchesYear && matchesStatus;
        });
    }, [enrolledStudents, searchTerm, filters]);

    const courses = ['all', ...Array.from(new Set(enrolledStudents.map(student => student.course)))];
    const years = ['all', ...Array.from(new Set(enrolledStudents.map(student => student.year.toString())))].sort();

    const subjectCatalog = useMemo(() => {
        const catalog = new Map<number, CatalogSubject>();
        Object.entries(adminData.subjects ?? {}).forEach(([yearKey, list]) => {
            list.forEach((subject) => {
                catalog.set(subject.id, { ...subject, yearKey: yearKey as YearKey });
            });
        });
        return catalog;
    }, [adminData.subjects]);

    const availableSubjects = useMemo(() => {
        if (!selectedStudent) {
            return [] as Subject[];
        }

        const yearKey = yearLevelFromNumber(selectedStudent.year);
        if (!yearKey) {
            return [] as Subject[];
        }

        const activeSemester: SemesterValue = VALID_SEMESTERS.includes(adminData.semester as SemesterValue)
            ? (adminData.semester as SemesterValue)
            : '1st-sem';

        const subjectsForYear = adminData.subjects?.[yearKey] ?? [];
        if (subjectsForYear.length === 0) {
            return [] as Subject[];
        }

        const semesterAligned = subjectsForYear.filter((subject) => subject.semester === activeSemester);
        const pool = (semesterAligned.length > 0 ? semesterAligned : subjectsForYear).slice();

        const assignedSubjectIds = new Set((selectedStudent.enlistedSubjects ?? []).map((subject) => subject.id));
        const assignedSubjectCodes = new Set((selectedStudent.enlistedSubjects ?? []).map((subject) => normalizeSubjectCode(subject.code)));

        const completedCodes = (() => {
            const codes = new Set<string>();
            try {
                if (typeof adminData.getCompletedSubjects === 'function') {
                    const completed = adminData.getCompletedSubjects(selectedStudent.studentId) ?? [];
                    completed.forEach((entry) => {
                        const normalized = normalizeSubjectCode(entry.code);
                        if (normalized) {
                            codes.add(normalized);
                        }
                    });
                }
            } catch (error) {
                console.warn('[AdminStudents] Failed to resolve completed subjects:', error);
            }
            return codes;
        })();

        return pool
            .filter((subject) => {
                const normalizedCode = normalizeSubjectCode(subject.code);
                if (!normalizedCode) {
                    return false;
                }
                if (assignedSubjectIds.has(subject.id) || assignedSubjectCodes.has(normalizedCode)) {
                    return false;
                }
                if (completedCodes.has(normalizedCode)) {
                    return false;
                }

                const prerequisites = Array.isArray(subject.prerequisites) && subject.prerequisites.length > 0
                    ? subject.prerequisites
                    : (subject.prerequisite ? [subject.prerequisite] : []);
                const normalizedPrereqs = prerequisites
                    .map((code) => normalizeSubjectCode(code))
                    .filter((code) => code !== '');

                return normalizedPrereqs.every((code) => completedCodes.has(code));
            })
            .sort((a, b) => a.code.localeCompare(b.code));
    }, [selectedStudent, adminData.subjects, adminData.semester, adminData.getCompletedSubjects]);

    const submittedDocuments = useMemo(() => {
        if (!selectedStudent) {
            return [] as ApplicationDocument[];
        }

        const allApplications = [
            ...(adminData.approvedApplications ?? []),
            ...(adminData.pendingApplications ?? []),
            ...(adminData.rejectedApplications ?? []),
        ];

        const matchedApplication = allApplications.find((application) => {
            if (!application) {
                return false;
            }
            const matchesStudentId = typeof application.studentId === 'string'
                && application.studentId.trim() !== ''
                && application.studentId === selectedStudent.studentId;

            const matchesUserId = Number.isFinite(Number(application.studentUserId))
                && Number(application.studentUserId) === selectedStudent.id;

            return matchesStudentId || matchesUserId;
        });

        const documents = matchedApplication?.documents ?? [];
        return documents.filter((doc): doc is ApplicationDocument => Boolean(doc));
    }, [selectedStudent, adminData.approvedApplications, adminData.pendingApplications, adminData.rejectedApplications]);

    const combinedDocuments = useMemo(() => {
        if (!selectedStudent) {
            return submittedDocuments;
        }

        const primary = Array.isArray(selectedStudent.documents) ? selectedStudent.documents : [];
        if (primary.length === 0 && submittedDocuments.length === 0) {
            return [] as ApplicationDocument[];
        }

        const seenKeys = new Set<string | number>();
        const merged: ApplicationDocument[] = [];

        primary.forEach((doc) => {
            const key = typeof doc.id === 'number' && doc.id > 0 ? doc.id : `${doc.name}-${doc.fileName}`;
            seenKeys.add(key);
            merged.push(doc);
        });

        submittedDocuments.forEach((doc) => {
            const key = typeof doc.id === 'number' && doc.id > 0 ? doc.id : `${doc.name}-${doc.fileName}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                merged.push(doc);
            }
        });

        return merged;
    }, [selectedStudent, submittedDocuments]);

    const applySubjectUpdate = useCallback((studentId: number, updatedSubjects: Subject[]) => {
        setAdminData(prev => ({
            ...prev,
            students: prev.students.map((student) =>
                student.id === studentId ? { ...student, enlistedSubjects: updatedSubjects } : student
            ),
        }));

        setEnrolledStudents(prev => prev.map((student) =>
            student.id === studentId ? { ...student, enlistedSubjects: updatedSubjects } : student
        ));

        setSelectedStudent(prev => (prev && prev.id === studentId ? { ...prev, enlistedSubjects: updatedSubjects } : prev));
    }, [setAdminData, setEnrolledStudents, setSelectedStudent]);

    const modifyStudentSubjects = useCallback(async (action: 'add' | 'remove', subjectId: number) => {
        if (!selectedStudent) {
            return;
        }

        setSubjectActionBusy(true);
        try {
            const response = await fetch(`${API_BASE_URL}/modify_student_subject.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    action,
                    studentUserId: selectedStudent.id,
                    subjectId,
                }),
            });

            const payload = (await response.json().catch(() => null)) as ModifySubjectResponse | null;

            if (!response.ok || !payload || payload.status !== 'success') {
                const message = payload?.message ?? `Request failed with status ${response.status}`;
                throw new Error(message);
            }

            const subjectsFromResponse = Array.isArray(payload.data?.subjects) ? payload.data.subjects : [];
            const normalizedSubjects: Subject[] = subjectsFromResponse.map((subject) => {
                const catalogEntry = subjectCatalog.get(subject.id as number);
                const subjectId = typeof subject.id === 'number' ? subject.id : (catalogEntry?.id ?? 0);
                return {
                    id: subjectId,
                    code: subject.code ?? catalogEntry?.code ?? '',
                    description: subject.description ?? catalogEntry?.description ?? '',
                    units: typeof subject.units === 'number' ? subject.units : (catalogEntry?.units ?? 0),
                    semester: catalogEntry?.semester ?? ((subject.semester as Subject['semester']) ?? '1st-sem'),
                    prerequisites: catalogEntry?.prerequisites ?? subject.prerequisites ?? [],
                    prerequisite: catalogEntry?.prerequisite ?? subject.prerequisite ?? null,
                };
            });

            applySubjectUpdate(selectedStudent.id, normalizedSubjects);

            toast({
                title: action === 'add' ? 'Subject added' : 'Subject removed',
                description: action === 'add'
                    ? 'The subject was added to the student.'
                    : 'The subject was removed from the student.',
            });
            notifyDataChanged();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update subjects.';
            toast({
                variant: 'destructive',
                title: 'Subject update failed',
                description: message,
            });
        } finally {
            setSubjectActionBusy(false);
        }
    }, [API_BASE_URL, selectedStudent, subjectCatalog, applySubjectUpdate, toast]);

    const handleAddSubject = async () => {
        if (!selectedSubjectId) {
            return;
        }
        await modifyStudentSubjects('add', Number(selectedSubjectId));
        setSelectedSubjectId('');
        setIsAddSubjectPopoverOpen(false);
    };

    const handleRemoveSubject = async (subjectId: number) => {
        await modifyStudentSubjects('remove', subjectId);
    };
    
    const getStatusBadgeVariant = (status: Student['status']) => {
        switch (status) {
            case 'Enrolled':
                return 'default';
            case 'Not Enrolled':
                return 'destructive';
            case 'Graduated':
                return 'secondary';
            default:
                return 'outline';
        }
    };


    return (
        <>
            <div className="flex-1 p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Student Directory</h1>
                        <p className="text-slate-400 mt-1">
                            Manage and view all enrolled students in the system.
                        </p>
                    </div>
                </div>

                <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-white/5 pb-4">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                                    <GraduationCap className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-semibold text-white">Enrolled Students</CardTitle>
                                    <CardDescription className="text-slate-400">
                                        {isFiltered ? `${filteredStudents.length} of ${enrolledStudents.length} students shown` : `Total Enrolled: ${filteredStudents.length}`}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                <div className="relative flex-1 sm:min-w-[250px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                    <Input
                                        type="search"
                                        placeholder="Search by name, ID, or email..."
                                        className="w-full rounded-xl bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 pl-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" className="gap-2 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl">
                                            <Filter className="h-4 w-4" />
                                            Filter
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-4 rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200" align="end">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-slate-300">Course</Label>
                                                <Select value={filters.course} onValueChange={(value) => handleFilterChange('course', value)}>
                                                    <SelectTrigger className="rounded-xl bg-white/5 border-white/10 text-white focus:ring-blue-500/20">
                                                        <SelectValue placeholder="All Courses" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                                        {courses.map(course => <SelectItem key={course} value={course} className="focus:bg-white/10 focus:text-white">{course === 'all' ? 'All Courses' : course}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                             <div className="space-y-2">
                                                <Label className="text-slate-300">Year</Label>
                                                <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
                                                    <SelectTrigger className="rounded-xl bg-white/5 border-white/10 text-white focus:ring-blue-500/20">
                                                        <SelectValue placeholder="All Years" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-white/10 text-slate-200">
                                                        {years.map(year => <SelectItem key={year} value={year} className="focus:bg-white/10 focus:text-white">{year === 'all' ? 'All Years' : `${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year`}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {isFiltered && (
                                                <Button variant="ghost" onClick={clearFilters} className="h-10 justify-center rounded-xl text-slate-300 hover:bg-white/5 hover:text-white">
                                                    <FilterX className="mr-2 h-4 w-4" />
                                                    Clear Filters
                                                </Button>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="border border-white/10 rounded-xl overflow-hidden">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="hover:bg-white/5 border-white/10">
                                        <TableHead className="text-slate-400 font-medium">Student</TableHead>
                                        <TableHead className="text-slate-400 font-medium">Student ID</TableHead>
                                        <TableHead className="text-slate-400 font-medium">Course & Year</TableHead>
                                        <TableHead className="text-slate-400 font-medium">Status</TableHead>
                                        <TableHead className="text-right text-slate-400 font-medium">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                                        <TableRow key={student.id} className="hover:bg-white/5 border-white/5">
                                            <TableCell className="text-slate-300">
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="border border-white/10">
                                                        <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person avatar"/>
                                                        <AvatarFallback className="bg-slate-800 text-slate-200">{student.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="grid gap-1">
                                                        <p className="font-medium text-slate-200">{student.name}</p>
                                                        <p className="text-sm text-slate-500">{student.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-300">{student.studentId}</TableCell>
                                            <TableCell className="text-slate-300">{student.course} - {student.year}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusBadgeVariant(student.status)} className={cn(
                                                    student.status === 'Enrolled' && "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border-emerald-500/50",
                                                    student.status === 'Not Enrolled' && "bg-red-500/20 text-red-200 hover:bg-red-500/30 border-red-500/50",
                                                    student.status === 'Graduated' && "bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 border-blue-500/50",
                                                )}>{student.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200">
                                                        <DropdownMenuItem onSelect={() => openProfileDialog(student)} className="focus:bg-white/10 focus:text-white">View Profile</DropdownMenuItem>
                                                        {!isModerator && (
                                                            <>
                                                                {isOrfReleased(student) ? (
                                                                    <DropdownMenuItem disabled className="uppercase tracking-wide font-semibold text-slate-500">
                                                                        ORF RELEASED
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem
                                                                        className="focus:bg-white/10 focus:text-white"
                                                                        onSelect={(event) => {
                                                                            event.preventDefault();
                                                                            handleClaimOrf(student);
                                                                        }}
                                                                    >
                                                                        Claim ORF
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuSeparator className="bg-white/10" />
                                                                <DropdownMenuItem
                                                                    className="text-red-400 focus:bg-red-500/10 focus:text-red-300"
                                                                    onSelect={() => openDeleteDialog(student)}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                                No students found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Profile Dialog */}
            <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                {selectedStudent && (
                    <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full p-0 gap-0 overflow-hidden rounded-3xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                        <DialogHeader className="p-6 border-b border-white/10 bg-white/5">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                                <Avatar className="h-20 w-20 border-2 border-white/10 shadow-lg">
                                    <AvatarImage src={selectedStudent.avatar} alt={selectedStudent.name} className="object-cover" />
                                    <AvatarFallback className="bg-blue-600 text-xl font-bold text-white">{selectedStudent.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <DialogTitle className="text-2xl font-bold text-white tracking-tight">{selectedStudent.name}</DialogTitle>
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                                        <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-300">
                                            {selectedStudent.studentId}
                                        </Badge>
                                        <span>•</span>
                                        <span className="font-medium text-blue-400">{selectedStudent.course}</span>
                                        <span>•</span>
                                        <span>{selectedStudent.year}{selectedStudent.year === 1 ? 'st' : selectedStudent.year === 2 ? 'nd' : selectedStudent.year === 3 ? 'rd' : 'th'} Year</span>
                                    </div>
                                </div>
                                <div className="sm:ml-auto">
                                     <Badge variant={getStatusBadgeVariant(selectedStudent.status)} className={cn(
                                        "px-3 py-1 text-sm font-medium",
                                        selectedStudent.status === 'Enrolled' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                        selectedStudent.status === 'Not Enrolled' && "bg-red-500/10 text-red-400 border-red-500/20",
                                    )}>
                                        {selectedStudent.status}
                                    </Badge>
                                </div>
                            </div>
                        </DialogHeader>
                        
                        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid gap-6 lg:grid-cols-12">
                                {/* Left Column: Personal Info & Docs */}
                                <div className="lg:col-span-4 space-y-6">
                                    <Card className="bg-white/5 border-white/10 shadow-none rounded-2xl">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-medium text-white flex items-center gap-2">
                                                <User className="h-4 w-4 text-blue-400" />
                                                Student Details
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-1">
                                            <InfoRow icon={Layers} label="Block Section" value={selectedStudent.block} />
                                            <InfoRow icon={Mail} label="Email" value={selectedStudent.email} />
                                            <InfoRow icon={Phone} label="Phone" value={selectedStudent.phoneNumber} />
                                            {selectedStudent.specialization && <InfoRow icon={GraduationCap} label="Specialization" value={selectedStudent.specialization} />}
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-white/5 border-white/10 shadow-none flex flex-col h-full max-h-[400px] rounded-2xl">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base font-medium text-white flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-orange-400" />
                                                    Documents
                                                </CardTitle>
                                                {combinedDocuments.length > 0 && (
                                                    <Badge variant="secondary" className="bg-white/10 text-slate-300 hover:bg-white/20">
                                                        {combinedDocuments.length}
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar p-3">
                                            <div className="space-y-2">
                                            {combinedDocuments.length > 0 ? (
                                                combinedDocuments.map((doc, index) => {
                                                    const sizeLabel = formatDocumentSize(doc.fileSize);
                                                    const uploadedLabel = formatDocumentDate(doc.uploadedAt);
                                                    const key = doc.id ?? `${doc.name ?? doc.fileName ?? 'document'}-${index}`;
                                                    const downloadUrl = buildDocumentUrl(doc.filePath ?? doc.fileName);
                                                    const normalizedStatus = (doc.status ?? '').toLowerCase();
                                                    const canModerate = typeof doc.id === 'number' && doc.id > 0;
                                                    const isPendingAction = documentActionId === doc.id;
                                                    const approveDisabled = !canModerate || normalizedStatus === 'approved' || isPendingAction;
                                                    const rejectDisabled = !canModerate || normalizedStatus === 'rejected' || isPendingAction;
                                                    return (
                                                        <div
                                                            key={key}
                                                            className="p-3 space-y-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
                                                                        <FileText className="h-4 w-4" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium text-slate-200 line-clamp-1">{doc.name || doc.fileName || 'Untitled'}</p>
                                                                        <p className="text-xs text-slate-500">
                                                                            {uploadedLabel ?? 'No date'}
                                                                            {sizeLabel ? ` • ${sizeLabel}` : ''}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                                                <Badge variant={getDocumentStatusVariant(doc.status)} className={cn("text-[10px] px-2 h-5 border-white/10",
                                                                    (doc.status?.toLowerCase() === 'approved') && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                                                    (doc.status?.toLowerCase() === 'rejected') && "bg-red-500/10 text-red-400 border-red-500/20",
                                                                    (doc.status?.toLowerCase() === 'pending') && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                                                                )}>
                                                                    {doc.status ?? 'Unknown'}
                                                                </Badge>
                                                                <div className="flex items-center gap-1">
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10"
                                                                                disabled={isPendingAction}
                                                                            >
                                                                                <MoreHorizontal className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200">
                                                                            <DropdownMenuItem
                                                                                disabled={!downloadUrl}
                                                                                className="focus:bg-white/10 focus:text-white"
                                                                                onSelect={(event) => {
                                                                                    event.preventDefault();
                                                                                    handleViewDocument(downloadUrl);
                                                                                }}
                                                                            >
                                                                                View
                                                                            </DropdownMenuItem>
                                                                            {!isModerator && (
                                                                                <>
                                                                                    <DropdownMenuItem
                                                                                        disabled={approveDisabled}
                                                                                        className="focus:bg-white/10 focus:text-white"
                                                                                        onSelect={(event) => {
                                                                                            event.preventDefault();
                                                                                            if (!canModerate || approveDisabled || typeof doc.id !== 'number') {
                                                                                                return;
                                                                                            }
                                                                                            handleDocumentStatusUpdate(doc.id, 'Approved');
                                                                                        }}
                                                                                    >
                                                                                        Accept
                                                                                    </DropdownMenuItem>
                                                                                    <DropdownMenuItem
                                                                                        disabled={rejectDisabled}
                                                                                        className="focus:bg-white/10 focus:text-white"
                                                                                        onSelect={(event) => {
                                                                                            event.preventDefault();
                                                                                            if (!canModerate || rejectDisabled || typeof doc.id !== 'number') {
                                                                                                return;
                                                                                            }
                                                                                            handleDocumentStatusUpdate(doc.id, 'Rejected');
                                                                                        }}
                                                                                    >
                                                                                        Reject
                                                                                    </DropdownMenuItem>
                                                                                </>
                                                                            )}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-white/10 rounded-xl">
                                                    <FileText className="h-8 w-8 text-slate-600 mb-2" />
                                                    <p className="text-sm text-slate-500">No documents submitted</p>
                                                </div>
                                            )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Right Column: Subjects */}
                                <div className="lg:col-span-8">
                                    <Card className="bg-white/5 border-white/10 shadow-none h-full flex flex-col rounded-2xl">
                                        <CardHeader className="pb-3 border-b border-white/5">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <CardTitle className="text-base font-medium text-white flex items-center gap-2">
                                                        <BookOpen className="h-4 w-4 text-emerald-400" />
                                                        Enlisted Subjects
                                                    </CardTitle>
                                                    <CardDescription className="text-xs text-slate-400">
                                                        {(selectedStudent.enlistedSubjects || []).length} subjects for this semester
                                                    </CardDescription>
                                                </div>
                                                {!isModerator && (
                                                    <Popover open={isAddSubjectPopoverOpen} onOpenChange={setIsAddSubjectPopoverOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-0 h-8 text-xs" size="sm" disabled={subjectActionBusy}>
                                                                <PlusCircle className="mr-2 h-3.5 w-3.5" />
                                                                Add Subject
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-72 rounded-xl space-y-3 bg-slate-900 border-white/10 text-slate-200" align="end">
                                                            {availableSubjects.length ? (
                                                                <>
                                                                    <div className="space-y-1">
                                                                        <p className="text-sm font-medium text-white">Assign from catalog</p>
                                                                        <p className="text-xs text-slate-400">Choose a subject to add to this student.</p>
                                                                    </div>
                                                                    <Select
                                                                        value={selectedSubjectId}
                                                                        onValueChange={setSelectedSubjectId}
                                                                        disabled={subjectActionBusy}
                                                                    >
                                                                        <SelectTrigger className="rounded-xl bg-white/5 border-white/10 text-white focus:ring-blue-500/20">
                                                                            <SelectValue placeholder="Select subject" />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="rounded-xl max-h-64 bg-slate-900 border-white/10 text-slate-200">
                                                                            {availableSubjects.map(subject => (
                                                                                <SelectItem key={subject.id} value={String(subject.id)} className="focus:bg-white/10 focus:text-white">
                                                                                    {subject.code} - {subject.description}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Button
                                                                        onClick={handleAddSubject}
                                                                        disabled={!selectedSubjectId || subjectActionBusy}
                                                                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-0"
                                                                    >
                                                                        {subjectActionBusy ? (
                                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                        ) : (
                                                                            <PlusCircle className="mr-2 h-4 w-4" />
                                                                        )}
                                                                        Confirm Add
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <p className="text-xs text-slate-500">No eligible subjects are available for this student right now.</p>
                                                            )}
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0 flex-1 overflow-hidden">
                                            <div className="h-full overflow-y-auto custom-scrollbar">
                                                <Table>
                                                    <TableHeader className="bg-white/5 sticky top-0 z-10 backdrop-blur-sm">
                                                        <TableRow className="border-white/10 hover:bg-white/5">
                                                            <TableHead className="w-32 text-slate-400 font-medium">Subject</TableHead>
                                                            <TableHead className="text-slate-400 font-medium">Description</TableHead>
                                                            <TableHead className="text-right w-24 text-slate-400 font-medium">Units</TableHead>
                                                            <TableHead className="text-right w-20 text-slate-400 font-medium">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(selectedStudent.enlistedSubjects || []).length > 0 ? (
                                                            (selectedStudent.enlistedSubjects || []).map(subject => (
                                                                <TableRow key={subject.code} className="border-white/5 hover:bg-white/5">
                                                                    <TableCell className="font-medium text-slate-200">{subject.code}</TableCell>
                                                                    <TableCell className="text-sm text-slate-400">
                                                                        {subject.description || '—'}
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-slate-300">{subject.units}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        {!isModerator && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                                                onClick={() => handleRemoveSubject(subject.id)}
                                                                                disabled={subjectActionBusy}
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                                <span className="sr-only">Remove subject</span>
                                                                            </Button>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))
                                                        ) : (
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="text-center h-32 text-slate-500">
                                                                    <div className="flex flex-col items-center justify-center">
                                                                        <BookOpen className="h-8 w-8 mb-2 opacity-20" />
                                                                        <p>No subjects enlisted for this semester.</p>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                )}
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                             This action cannot be undone. This will permanently delete the record for <span className="font-semibold text-white">{selectedStudent?.name}</span>.
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
                        <AlertDialogCancel className="rounded-xl bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white" onClick={() => setDeleteInput('')}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteInput !== 'delete'}
                            className="bg-red-600 hover:bg-red-500 text-white border-0 rounded-xl"
                            onClick={handleDeleteStudent}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
