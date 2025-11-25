
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MoreHorizontal, Search, Filter, FilterX, Trash2, PlusCircle, Loader2, FileText } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
        case 'rejected':
            return 'destructive';
        default:
            return 'outline';
    }
};

const InfoField = ({ label, value }: { label: string; value?: string | number | null }) => (
    value ? (
        <div className="flex justify-between text-sm py-1">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right">{value}</span>
        </div>
    ) : null
);

type ModifySubjectResponse = {
    status: 'success' | 'error';
    message?: string;
    data?: {
        subjects?: Array<Partial<Subject>>;
    };
};

export default function StudentsPage() {
    const { adminData, setAdminData } = useAdmin();
    const { students } = adminData;
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
            <main className="flex-1 p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight">Student Directory</h1>
                        <p className="text-muted-foreground">
                            Manage and view all enrolled students in the system.
                        </p>
                    </div>
                </div>

                <Card className="rounded-xl">
                    <CardHeader>
                       <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                         <div className="relative flex-1 md:grow-0">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name, ID, or email..."
                                className="w-full rounded-xl bg-background pl-8 md:w-[250px] lg:w-[300px]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                           <div className="text-sm text-muted-foreground">
                                {isFiltered ? `${filteredStudents.length} of ${enrolledStudents.length} students shown` : `Total Enrolled Students: ${filteredStudents.length}`}
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-accent rounded-xl">
                                        <Filter className="h-4 w-4" />
                                        Filter
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4 rounded-xl" align="end">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label>Course</Label>
                                            <Select value={filters.course} onValueChange={(value) => handleFilterChange('course', value)}>
                                                <SelectTrigger className="rounded-xl focus:ring-0 focus:ring-offset-0">
                                                    <SelectValue placeholder="All Courses" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {courses.map(course => <SelectItem key={course} value={course}>{course === 'all' ? 'All Courses' : course}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Year</Label>
                                            <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
                                                <SelectTrigger className="rounded-xl focus:ring-0 focus:ring-offset-0">
                                                    <SelectValue placeholder="All Years" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {years.map(year => <SelectItem key={year} value={year}>{year === 'all' ? 'All Years' : `${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year`}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {isFiltered && (
                                            <Button variant="ghost" onClick={clearFilters} className="h-10 justify-center rounded-xl">
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
                    <CardContent>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Student ID</TableHead>
                                        <TableHead>Course & Year</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-4">
                                                    <Avatar>
                                                        <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person avatar"/>
                                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="grid gap-1">
                                                        <p className="font-medium">{student.name}</p>
                                                        <p className="text-sm text-muted-foreground">{student.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{student.studentId}</TableCell>
                                            <TableCell>{student.course} - {student.year}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusBadgeVariant(student.status)}>{student.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onSelect={() => openProfileDialog(student)}>View Profile</DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => toast({ title: 'Feature in progress', description: 'Claiming ORF is not yet implemented.' })}>Claim ORF</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                            onSelect={() => openDeleteDialog(student)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No students found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>

            {/* Profile Dialog */}
            <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                {selectedStudent && (
                    <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full rounded-xl">
                        <DialogHeader>
                            <div className="flex items-start gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={selectedStudent.avatar} alt={selectedStudent.name} data-ai-hint="person avatar" />
                                    <AvatarFallback>{selectedStudent.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <DialogTitle className="text-xl">{selectedStudent.name}</DialogTitle>
                                    <DialogDescription>
                                        {selectedStudent.studentId}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <div className="max-h-[65vh] overflow-y-auto pr-6 pl-1 -ml-1 py-4">
                            <div className="grid gap-6 items-start lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm">Details</h4>
                                        <div className="border rounded-lg p-3 space-y-1">
                                            <InfoField label="Status" value={selectedStudent.status} />
                                            <InfoField label="Block" value={selectedStudent.block} />
                                            <InfoField label="Email" value={selectedStudent.email} />
                                            <InfoField label="Phone" value={selectedStudent.phoneNumber} />
                                            {selectedStudent.specialization && <InfoField label="Specialization" value={selectedStudent.specialization} />}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-sm">Submitted Documents</h4>
                                            {submittedDocuments.length > 0 && (
                                                <Badge variant="secondary" className="rounded-full text-xs">
                                                    {submittedDocuments.length} file{submittedDocuments.length === 1 ? '' : 's'}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="border rounded-lg divide-y">
                                            {submittedDocuments.length > 0 ? (
                                                submittedDocuments.map((doc, index) => {
                                                    const sizeLabel = formatDocumentSize(doc.fileSize);
                                                    const uploadedLabel = formatDocumentDate(doc.uploadedAt);
                                                    const key = doc.id ?? `${doc.name ?? doc.fileName ?? 'document'}-${index}`;
                                                    return (
                                                        <div key={key} className="flex items-start justify-between gap-3 p-3">
                                                            <div className="flex items-start gap-3">
                                                                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                                                <div>
                                                                    <p className="text-sm font-medium">{doc.name || doc.fileName || 'Untitled Document'}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {uploadedLabel ?? 'Upload date unavailable'}
                                                                        {sizeLabel ? ` • ${sizeLabel}` : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Badge variant={getDocumentStatusVariant(doc.status)} className="text-xs">
                                                                {doc.status ?? 'Unknown'}
                                                            </Badge>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="p-3 text-sm text-muted-foreground">No submitted documents on record.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <h4 className="font-semibold text-sm">Enlisted Subjects</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {(selectedStudent.enlistedSubjects || []).length} subject{(selectedStudent.enlistedSubjects || []).length === 1 ? '' : 's'} enlisted
                                            </p>
                                        </div>
                                        <Popover open={isAddSubjectPopoverOpen} onOpenChange={setIsAddSubjectPopoverOpen}>
                                            <PopoverTrigger asChild>
                                                <Button className="rounded-xl" size="sm" disabled={subjectActionBusy}>
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Add Subject
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-72 rounded-xl space-y-3" align="end">
                                                {availableSubjects.length ? (
                                                    <>
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium">Assign from catalog</p>
                                                            <p className="text-xs text-muted-foreground">Choose a subject to add to this student.</p>
                                                        </div>
                                                        <Select
                                                            value={selectedSubjectId}
                                                            onValueChange={setSelectedSubjectId}
                                                            disabled={subjectActionBusy}
                                                        >
                                                            <SelectTrigger className="rounded-xl">
                                                                <SelectValue placeholder="Select subject" />
                                                            </SelectTrigger>
                                                            <SelectContent className="rounded-xl max-h-64">
                                                                {availableSubjects.map(subject => (
                                                                    <SelectItem key={subject.id} value={String(subject.id)}>
                                                                        {subject.code} - {subject.description}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Button
                                                            onClick={handleAddSubject}
                                                            disabled={!selectedSubjectId || subjectActionBusy}
                                                            className="w-full rounded-xl"
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
                                                    <p className="text-xs text-muted-foreground">No eligible subjects are available for this student right now.</p>
                                                )}
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="border rounded-lg max-h-[320px] overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-32">Subject</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead className="text-right w-24">Units</TableHead>
                                                    <TableHead className="text-right w-20">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(selectedStudent.enlistedSubjects || []).length > 0 ? (
                                                    (selectedStudent.enlistedSubjects || []).map(subject => (
                                                        <TableRow key={subject.code}>
                                                            <TableCell className="font-medium">{subject.code}</TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {subject.description || '—'}
                                                            </TableCell>
                                                            <TableCell className="text-right">{subject.units}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => handleRemoveSubject(subject.id)}
                                                                    disabled={subjectActionBusy}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    <span className="sr-only">Remove subject</span>
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center h-24">No subjects enlisted for this semester.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                )}
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                             This action cannot be undone. This will permanently delete the record for <span className="font-semibold">{selectedStudent?.name}</span>.
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
                        <AlertDialogCancel className="rounded-xl" onClick={() => setDeleteInput('')}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteInput !== 'delete'}
                            className="bg-destructive hover:bg-destructive/90 rounded-xl"
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
