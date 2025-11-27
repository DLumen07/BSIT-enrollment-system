'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ChevronDown } from 'lucide-react';
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
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdmin, Subject, SemesterValue } from '../../context/admin-context';
import { useToast } from '@/hooks/use-toast';

type ApiSuccessResponse<T = unknown> = {
    status: 'success';
    data?: T;
    message?: string;
};

type SubjectFormState = {
    code: string;
    description: string;
    units: string;
    prerequisites: string[];
    semester: SemesterValue;
};

const yearLevels = [
    { value: '1st-year', label: '1st Year' },
    { value: '2nd-year', label: '2nd Year' },
    { value: '3rd-year', label: '3rd Year' },
    { value: '4th-year', label: '4th Year' },
];

const yearLevelKeyToNumber: Record<string, number> = {
    '1st-year': 1,
    '2nd-year': 2,
    '3rd-year': 3,
    '4th-year': 4,
};

const defaultFormState: SubjectFormState = {
    code: '',
    description: '',
    units: '',
    prerequisites: [],
    semester: '1st-sem',
};

const fallbackSemesterOptions: Array<{ value: SemesterValue; label: string }> = [
    { value: '1st-sem', label: '1st Semester' },
    { value: '2nd-sem', label: '2nd Semester' },
    { value: 'summer', label: 'Summer' },
];

const coerceSemesterValue = (value?: string | null): SemesterValue => {
    return value === '1st-sem' || value === '2nd-sem' || value === 'summer' ? value : '1st-sem';
};

const semesterOrder: Record<SemesterValue, number> = {
    '1st-sem': 1,
    '2nd-sem': 2,
    summer: 3,
};

const normalizeSelectedPrerequisites = (values: string[]): string[] => {
    if (!Array.isArray(values) || values.length === 0) {
        return [];
    }

    return Array.from(
        new Set(
            values
                .map((code) => (typeof code === 'string' ? code.trim().toUpperCase() : ''))
                .filter((code) => code !== ''),
        ),
    );
};

type PrerequisiteMultiSelectProps = {
    fieldId: string;
    options: Subject[];
    selectedCodes: string[];
    onToggle: (code: string, shouldSelect: boolean) => void;
    onClear: () => void;
    emptyMessage?: string;
};

const PrerequisiteMultiSelect = ({
    fieldId,
    options,
    selectedCodes,
    onToggle,
    onClear,
    emptyMessage = 'No eligible prerequisite subjects are available.',
}: PrerequisiteMultiSelectProps) => {
    const hasSelection = selectedCodes.length > 0;
    const triggerLabel = hasSelection ? `${selectedCodes.length} selected` : 'Select prerequisites';

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor={fieldId}>Prerequisites</Label>
                {hasSelection && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-muted-foreground"
                        onClick={onClear}
                    >
                        Clear
                    </Button>
                )}
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        id={fieldId}
                        type="button"
                        variant="outline"
                        className="w-full justify-between rounded-xl"
                        disabled={options.length === 0}
                    >
                        <span className="truncate text-left">{options.length === 0 ? emptyMessage : triggerLabel}</span>
                        <ChevronDown className="ml-2 h-4 w-4 flex-shrink-0" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[min(360px,90vw)] max-h-48 overflow-y-auto rounded-xl">
                    {options.length === 0 ? (
                        <DropdownMenuItem disabled className="text-sm text-muted-foreground">
                            {emptyMessage}
                        </DropdownMenuItem>
                    ) : (
                        <>
                            <DropdownMenuLabel>Select prerequisites</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {options.map((subjectOption) => {
                                const isChecked = selectedCodes.includes(subjectOption.code);
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={subjectOption.id}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => onToggle(subjectOption.code, checked === true)}
                                        onSelect={(event) => event.preventDefault()}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium leading-tight">{subjectOption.code}</span>
                                            <span className="text-xs text-muted-foreground">{subjectOption.description}</span>
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                );
                            })}
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default function ManageSubjectsPage() {
    const { adminData, refreshAdminData } = useAdmin();
    const { subjects, semester: systemSemester, semesterOptions: adminSemesterOptions } = adminData;
    const subjectsByYear = subjects;

    const normalizedSemesterOptions = useMemo(() => {
        const source = Array.isArray(adminSemesterOptions) && adminSemesterOptions.length > 0
            ? adminSemesterOptions.map((option) => ({
                value: coerceSemesterValue(option.value),
                label: option.label,
            }))
            : fallbackSemesterOptions;

        const deduped = new Map<SemesterValue, { value: SemesterValue; label: string }>();
        source.forEach((option) => {
            if (!deduped.has(option.value)) {
                deduped.set(option.value, option);
            }
        });

        return Array.from(deduped.values());
    }, [adminSemesterOptions]);

    const semesterLabelMap = useMemo(() => {
        const base: Record<SemesterValue, string> = {
            '1st-sem': '1st Semester',
            '2nd-sem': '2nd Semester',
            summer: 'Summer',
        };

        normalizedSemesterOptions.forEach((option) => {
            base[option.value] = option.label;
        });

        return base;
    }, [normalizedSemesterOptions]);

    const [activeSemester, setActiveSemester] = useState<SemesterValue>(() => {
        if (normalizedSemesterOptions.length === 0) {
            return '1st-sem';
        }
        const preferred = coerceSemesterValue(systemSemester);
        const hasPreferred = normalizedSemesterOptions.some((option) => option.value === preferred);
        return hasPreferred ? preferred : normalizedSemesterOptions[0].value;
    });
    const [hasUserSelectedSemester, setHasUserSelectedSemester] = useState(false);

    useEffect(() => {
        setHasUserSelectedSemester(false);
    }, [systemSemester]);

    useEffect(() => {
        if (normalizedSemesterOptions.length === 0) {
            return;
        }

        const preferred = coerceSemesterValue(systemSemester);
        const hasPreferred = normalizedSemesterOptions.some((option) => option.value === preferred);
        const activeIsValid = normalizedSemesterOptions.some((option) => option.value === activeSemester);

        if (!activeIsValid) {
            const fallback = hasPreferred ? preferred : normalizedSemesterOptions[0].value;
            if (activeSemester !== fallback) {
                setActiveSemester(fallback);
            }
            setHasUserSelectedSemester(false);
            return;
        }

        if (!hasUserSelectedSemester && hasPreferred && activeSemester !== preferred) {
            setActiveSemester(preferred);
        }
    }, [systemSemester, normalizedSemesterOptions, activeSemester, hasUserSelectedSemester]);

    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<string>(yearLevels[0].value);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
    const [currentSubjectYearKey, setCurrentSubjectYearKey] = useState<string>(yearLevels[0].value);
    const [deleteInput, setDeleteInput] = useState('');
    const [addForm, setAddForm] = useState<SubjectFormState>(() => ({
        ...defaultFormState,
        semester: coerceSemesterValue(systemSemester),
    }));
    const [editForm, setEditForm] = useState<SubjectFormState>(() => ({
        ...defaultFormState,
        semester: coerceSemesterValue(systemSemester),
    }));
    const [busyAction, setBusyAction] = useState<string | null>(null);

    const isBusy = useCallback((action: string) => busyAction === action, [busyAction]);

    const handleSemesterFilterChange = useCallback((value: string) => {
        setHasUserSelectedSemester(true);
        setActiveSemester(coerceSemesterValue(value));
    }, []);

    useEffect(() => {
        if (isAddDialogOpen) {
            return;
        }
        setAddForm((prev) => ({
            ...prev,
            semester: coerceSemesterValue(systemSemester),
        }));
    }, [systemSemester, isAddDialogOpen]);

    const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
        .replace(/\/$/, '')
        .trim();

    const buildApiUrl = useCallback(
        (endpoint: string) => `${API_BASE_URL}/${endpoint.replace(/^\//, '')}`,
        [API_BASE_URL],
    );

    const callSubjectApi = useCallback(
        async (endpoint: string, payload: Record<string, unknown>): Promise<ApiSuccessResponse> => {
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
                // No-op: JSON parsing errors handled by status checks below.
            }

            if (!response.ok) {
                const message = data?.message ?? `Request failed with status ${response.status}`;
                throw new Error(message);
            }

            if (!data || data.status !== 'success') {
                throw new Error(data?.message ?? 'Request failed due to an unknown server error.');
            }

            return data as ApiSuccessResponse;
        },
        [buildApiUrl],
    );

    const buildPrerequisiteOptions = useCallback((targetYearKey: string, targetSemester: SemesterValue, excludeSubjectId: number | null) => {
        const resolvedYearIndex = yearLevels.findIndex((yl) => yl.value === targetYearKey);
        const activeYearIndex = resolvedYearIndex === -1 ? yearLevels.length - 1 : resolvedYearIndex;

        const options: Subject[] = [];

        for (let index = 0; index <= activeYearIndex; index++) {
            const yearKey = yearLevels[index]?.value;
            if (!yearKey) {
                continue;
            }

            const subjectsForYear = subjectsByYear[yearKey] ?? [];

            subjectsForYear.forEach((subject) => {
                if (excludeSubjectId !== null && subject.id === excludeSubjectId) {
                    return;
                }

                if (index === activeYearIndex) {
                    const subjectOrder = semesterOrder[subject.semester] ?? 1;
                    const targetOrder = semesterOrder[targetSemester] ?? 1;

                    if (subjectOrder >= targetOrder) {
                        return;
                    }
                }

                options.push(subject);
            });
        }

        return options;
    }, [subjectsByYear]);

    const addPrerequisiteOptions = useMemo(
        () => buildPrerequisiteOptions(activeTab, addForm.semester, null),
        [buildPrerequisiteOptions, activeTab, addForm.semester],
    );

    const editSubjectId = currentSubject?.id ?? null;
    const editPrerequisiteYearKey = currentSubjectYearKey || activeTab;

    const editPrerequisiteOptions = useMemo(
        () => buildPrerequisiteOptions(editPrerequisiteYearKey, editForm.semester, editSubjectId),
        [buildPrerequisiteOptions, editPrerequisiteYearKey, editForm.semester, editSubjectId],
    );

    useEffect(() => {
        setAddForm((prev) => {
            const allowedCodes = new Set(addPrerequisiteOptions.map((subject) => subject.code));
            const filtered = prev.prerequisites.filter((code) => allowedCodes.has(code));
            if (filtered.length === prev.prerequisites.length) {
                return prev;
            }
            return { ...prev, prerequisites: filtered };
        });
    }, [addPrerequisiteOptions]);

    useEffect(() => {
        setEditForm((prev) => {
            const allowedCodes = new Set(editPrerequisiteOptions.map((subject) => subject.code));
            const filtered = prev.prerequisites.filter((code) => allowedCodes.has(code));
            if (filtered.length === prev.prerequisites.length) {
                return prev;
            }
            return { ...prev, prerequisites: filtered };
        });
    }, [editPrerequisiteOptions]);

    const openAddDialog = useCallback(() => {
        setCurrentSubject(null);
        setAddForm({
            ...defaultFormState,
            semester: activeSemester,
        });
        setIsAddDialogOpen(true);
    }, [activeSemester]);

    const findYearKeyForSubject = useCallback((subjectId: number | null) => {
        if (subjectId === null) {
            return null;
        }
        for (const { value } of yearLevels) {
            const subjectsForYear = subjectsByYear[value] ?? [];
            if (subjectsForYear.some((entry) => entry.id === subjectId)) {
                return value;
            }
        }
        return null;
    }, [subjectsByYear]);

    const openEditDialog = useCallback((subject: Subject) => {
        setCurrentSubject(subject);
        const normalizedPrereqs = Array.isArray(subject.prerequisites) && subject.prerequisites.length > 0
            ? subject.prerequisites
            : (subject.prerequisite ? [subject.prerequisite] : []);
        setEditForm({
            code: subject.code ?? '',
            description: subject.description ?? '',
            units: String(subject.units ?? ''),
            prerequisites: normalizedPrereqs,
            semester: subject.semester ?? '1st-sem',
        });
        const owningYearKey = findYearKeyForSubject(subject.id) ?? activeTab;
        setCurrentSubjectYearKey(owningYearKey);
        setIsEditDialogOpen(true);
    }, [findYearKeyForSubject, activeTab]);

    const openDeleteDialog = useCallback((subject: Subject) => {
        setCurrentSubject(subject);
        setDeleteInput('');
        setIsDeleteDialogOpen(true);
    }, []);

    const handleAddPrerequisiteToggle = useCallback((code: string, shouldSelect: boolean) => {
        setAddForm((prev) => {
            const exists = prev.prerequisites.includes(code);
            if (shouldSelect) {
                if (exists) {
                    return prev;
                }
                return { ...prev, prerequisites: [...prev.prerequisites, code] };
            }

            if (!exists) {
                return prev;
            }
            return { ...prev, prerequisites: prev.prerequisites.filter((entry) => entry !== code) };
        });
    }, []);

    const handleEditPrerequisiteToggle = useCallback((code: string, shouldSelect: boolean) => {
        setEditForm((prev) => {
            const exists = prev.prerequisites.includes(code);
            if (shouldSelect) {
                if (exists) {
                    return prev;
                }
                return { ...prev, prerequisites: [...prev.prerequisites, code] };
            }

            if (!exists) {
                return prev;
            }
            return { ...prev, prerequisites: prev.prerequisites.filter((entry) => entry !== code) };
        });
    }, []);

    const handleAddSubject = useCallback(async () => {
        const normalizedCode = addForm.code.trim();
        const normalizedDescription = addForm.description.trim();
        const numericUnits = Number(addForm.units);

        const yearLevelNumber = yearLevelKeyToNumber[activeTab] ?? null;

        if (normalizedCode === '' || normalizedDescription === '') {
            toast({
                variant: 'destructive',
                title: 'Missing details',
                description: 'Subject code and description are required.',
            });
            return;
        }

        if (!Number.isFinite(numericUnits) || numericUnits <= 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid units',
                description: 'Units must be a positive number.',
            });
            return;
        }

        if (yearLevelNumber === null) {
            toast({
                variant: 'destructive',
                title: 'Invalid year level',
                description: 'Please select a valid year level before creating a subject.',
            });
            return;
        }

        const uppercaseCode = normalizedCode.toUpperCase();
        const selectedSemester = coerceSemesterValue(addForm.semester);

        const normalizedPrerequisites = normalizeSelectedPrerequisites(addForm.prerequisites);

        const payload = {
            code: uppercaseCode,
            description: normalizedDescription,
            units: numericUnits,
            yearLevel: yearLevelNumber,
            yearKey: activeTab,
            prerequisite: normalizedPrerequisites[0] ?? null,
            prerequisites: normalizedPrerequisites,
            semester: selectedSemester,
        };

        const actionKey = 'create-subject';
        if (isBusy(actionKey)) {
            return;
        }

        setBusyAction(actionKey);

        try {
            await callSubjectApi('create_subject.php', payload);
            await refreshAdminData();
            toast({
                title: 'Subject created',
                description: `${uppercaseCode} has been added to ${yearLevels.find((yl) => yl.value === activeTab)?.label} (${semesterLabelMap[selectedSemester]}).`,
            });
            setIsAddDialogOpen(false);
            setAddForm({
                ...defaultFormState,
                semester: activeSemester,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create subject.';
            toast({
                variant: 'destructive',
                title: 'Create failed',
                description: message,
            });
        } finally {
            setBusyAction(null);
        }
    }, [activeTab, addForm, callSubjectApi, isBusy, refreshAdminData, toast]);

    const handleEditSubject = useCallback(async () => {
        if (!currentSubject) {
            return;
        }

        const normalizedCode = editForm.code.trim();
        const normalizedDescription = editForm.description.trim();
        const numericUnits = Number(editForm.units);

        if (normalizedCode === '' || normalizedDescription === '') {
            toast({
                variant: 'destructive',
                title: 'Missing details',
                description: 'Subject code and description are required.',
            });
            return;
        }

        if (!Number.isFinite(numericUnits) || numericUnits <= 0) {
            toast({
                variant: 'destructive',
                title: 'Invalid units',
                description: 'Units must be a positive number.',
            });
            return;
        }

        const yearLevelNumber = yearLevelKeyToNumber[activeTab] ?? null;

        if (yearLevelNumber === null) {
            toast({
                variant: 'destructive',
                title: 'Invalid year level',
                description: 'Please select a valid year level before saving changes.',
            });
            return;
        }

        const uppercaseCode = normalizedCode.toUpperCase();
        const selectedSemester = coerceSemesterValue(editForm.semester);

        const normalizedPrerequisites = normalizeSelectedPrerequisites(editForm.prerequisites);

        const payload = {
            subjectId: currentSubject.id,
            code: uppercaseCode,
            description: normalizedDescription,
            units: numericUnits,
            yearLevel: yearLevelNumber,
            yearKey: activeTab,
            prerequisite: normalizedPrerequisites[0] ?? null,
            prerequisites: normalizedPrerequisites,
            semester: selectedSemester,
        };

        const actionKey = `update-subject-${currentSubject.id}`;
        if (isBusy(actionKey)) {
            return;
        }

        setBusyAction(actionKey);

        try {
            await callSubjectApi('update_subject.php', payload);
            await refreshAdminData();
            toast({
                title: 'Subject updated',
                description: `${uppercaseCode} has been updated for ${semesterLabelMap[selectedSemester]}.`,
            });
            setIsEditDialogOpen(false);
            setCurrentSubject(null);
            setEditForm({
                ...defaultFormState,
                semester: activeSemester,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update subject.';
            toast({
                variant: 'destructive',
                title: 'Update failed',
                description: message,
            });
        } finally {
            setBusyAction(null);
        }
    }, [activeTab, callSubjectApi, currentSubject, editForm, isBusy, refreshAdminData, toast]);

    const handleDeleteSubject = useCallback(async () => {
        if (!currentSubject) {
            return;
        }

        if (deleteInput !== 'delete') {
            return;
        }

        const actionKey = `delete-subject-${currentSubject.id}`;
        if (isBusy(actionKey)) {
            return;
        }

        setBusyAction(actionKey);

        try {
            await callSubjectApi('delete_subject.php', { subjectId: currentSubject.id });
            await refreshAdminData();
            toast({
                title: 'Subject deleted',
                description: `${currentSubject.code.toUpperCase()} has been removed.`,
            });
            setIsDeleteDialogOpen(false);
            setDeleteInput('');
            setCurrentSubject(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete subject.';
            toast({
                variant: 'destructive',
                title: 'Delete failed',
                description: message,
            });
        } finally {
            setBusyAction(null);
        }
    }, [callSubjectApi, currentSubject, deleteInput, isBusy, refreshAdminData, toast]);

    return (
        <>
            <main className="flex-1 space-y-6 p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight">Manage Subjects</h1>
                        <p className="text-muted-foreground">Add, edit, or remove subjects for each year level.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="semester-filter" className="hidden text-sm font-medium text-muted-foreground sm:block">Semester</Label>
                            <Select value={activeSemester} onValueChange={handleSemesterFilterChange}>
                                <SelectTrigger id="semester-filter" className="w-[170px] rounded-full">
                                    <SelectValue placeholder="Select semester" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {normalizedSemesterOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={openAddDialog} className="rounded-full" disabled={isBusy('create-subject')}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Subject
                        </Button>
                    </div>
                </div>

                <Card className="rounded-xl">
                    <CardContent className="p-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-4 rounded-xl">
                                {yearLevels.map((yl) => (
                                    <TabsTrigger key={yl.value} value={yl.value} className="rounded-lg">
                                        {yl.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {yearLevels.map((yl) => {
                                const subjectsForYear = (subjectsByYear[yl.value] ?? []).filter((subject) => subject.semester === activeSemester);
                                return (
                                    <TabsContent key={yl.value} value={yl.value}>
                                        <div className="mt-4 rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Subject Code</TableHead>
                                                        <TableHead>Description</TableHead>
                                                        <TableHead>Units</TableHead>
                                                        <TableHead>Semester</TableHead>
                                                        <TableHead>Prerequisites</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {subjectsForYear.length > 0 ? (
                                                        subjectsForYear.map((subject) => (
                                                            <TableRow key={subject.id}>
                                                                <TableCell className="font-medium">{subject.code}</TableCell>
                                                                <TableCell>{subject.description}</TableCell>
                                                                <TableCell>{subject.units}</TableCell>
                                                                <TableCell>{semesterLabelMap[subject.semester]}</TableCell>
                                                                <TableCell>{subject.prerequisites?.length ? subject.prerequisites.join(', ') : 'None'}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                className="h-8 w-8 p-0 text-muted-foreground hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-accent focus-visible:ring-0 focus-visible:ring-offset-0"
                                                                            >
                                                                                <span className="sr-only">Open menu</span>
                                                                                <MoreHorizontal className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end" className="rounded-xl">
                                                                            <DropdownMenuItem onSelect={(event) => { event.preventDefault(); openEditDialog(subject); }}>
                                                                                <Pencil className="mr-2 h-4 w-4" /> Edit
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                                                onSelect={(event) => { event.preventDefault(); openDeleteDialog(subject); }}
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
                                                            <TableCell colSpan={6} className="h-24 text-center">
                                                                No subjects created for this year level.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </TabsContent>
                                );
                            })}
                        </Tabs>
                    </CardContent>
                </Card>
            </main>

            <Dialog
                open={isAddDialogOpen}
                onOpenChange={(open) => {
                    setIsAddDialogOpen(open);
                    if (!open) {
                        setAddForm({
                            ...defaultFormState,
                            semester: activeSemester,
                        });
                    }
                }}
            >
                <DialogContent className="rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Add New Subject</DialogTitle>
                        <DialogDescription>
                            Enter details for the new subject for {yearLevels.find((yl) => yl.value === activeTab)?.label}.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        id="add-subject-form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleAddSubject();
                        }}
                    >
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="code">Subject Code</Label>
                                <Input
                                    id="code"
                                    name="code"
                                    placeholder="e.g., IT 102"
                                    required
                                    className="rounded-xl"
                                    value={addForm.code}
                                    onChange={(event) => setAddForm((prev) => ({ ...prev, code: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    placeholder="e.g., Computer Programming 1"
                                    required
                                    className="rounded-xl"
                                    value={addForm.description}
                                    onChange={(event) => setAddForm((prev) => ({ ...prev, description: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="units">Units</Label>
                                <Input
                                    id="units"
                                    name="units"
                                    type="number"
                                    placeholder="e.g., 3"
                                    required
                                    className="rounded-xl"
                                    value={addForm.units}
                                    onChange={(event) => setAddForm((prev) => ({ ...prev, units: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="semester">Semester</Label>
                                <Select
                                    value={addForm.semester}
                                    onValueChange={(value) => setAddForm((prev) => ({
                                        ...prev,
                                        semester: coerceSemesterValue(value),
                                    }))}
                                >
                                    <SelectTrigger id="semester" className="rounded-xl">
                                        <SelectValue placeholder="Select semester" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {normalizedSemesterOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <PrerequisiteMultiSelect
                                fieldId="add-prerequisites"
                                options={addPrerequisiteOptions}
                                selectedCodes={addForm.prerequisites}
                                onToggle={handleAddPrerequisiteToggle}
                                onClear={() => setAddForm((prev) => ({ ...prev, prerequisites: [] }))}
                            />
                        </div>
                    </form>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddDialogOpen(false)}
                            className="rounded-xl"
                            disabled={isBusy('create-subject')}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="add-subject-form"
                            className="rounded-xl"
                            disabled={isBusy('create-subject')}
                        >
                            {isBusy('create-subject') ? 'Creating...' : 'Create Subject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isEditDialogOpen}
                onOpenChange={(open) => {
                    setIsEditDialogOpen(open);
                    if (!open) {
                        setCurrentSubject(null);
                        setCurrentSubjectYearKey(activeTab);
                        setEditForm({
                            ...defaultFormState,
                            semester: activeSemester,
                        });
                    }
                }}
            >
                <DialogContent className="rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Subject</DialogTitle>
                        <DialogDescription>Update the details for {currentSubject?.code}.</DialogDescription>
                    </DialogHeader>
                    <form
                        id="edit-subject-form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleEditSubject();
                        }}
                    >
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="edit-code">Subject Code</Label>
                                <Input
                                    id="edit-code"
                                    name="code"
                                    required
                                    className="rounded-xl"
                                    value={editForm.code}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, code: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Input
                                    id="edit-description"
                                    name="description"
                                    required
                                    className="rounded-xl"
                                    value={editForm.description}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-units">Units</Label>
                                <Input
                                    id="edit-units"
                                    name="units"
                                    type="number"
                                    required
                                    className="rounded-xl"
                                    value={editForm.units}
                                    onChange={(event) => setEditForm((prev) => ({ ...prev, units: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-semester">Semester</Label>
                                <Select
                                    value={editForm.semester}
                                    onValueChange={(value) => setEditForm((prev) => ({
                                        ...prev,
                                        semester: coerceSemesterValue(value),
                                    }))}
                                >
                                    <SelectTrigger id="edit-semester" className="rounded-xl">
                                        <SelectValue placeholder="Select semester" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {normalizedSemesterOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <PrerequisiteMultiSelect
                                fieldId="edit-prerequisites"
                                options={editPrerequisiteOptions}
                                selectedCodes={editForm.prerequisites}
                                onToggle={handleEditPrerequisiteToggle}
                                onClear={() => setEditForm((prev) => ({ ...prev, prerequisites: [] }))}
                            />
                        </div>
                    </form>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsEditDialogOpen(false)}
                            className="rounded-xl"
                            disabled={isBusy(currentSubject ? `update-subject-${currentSubject.id}` : '')}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="edit-subject-form"
                            className="rounded-xl"
                            disabled={isBusy(currentSubject ? `update-subject-${currentSubject.id}` : '')}
                        >
                            {isBusy(currentSubject ? `update-subject-${currentSubject.id}` : '') ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={(open) => {
                    setIsDeleteDialogOpen(open);
                    if (!open) {
                        setDeleteInput('');
                        setCurrentSubject(null);
                    }
                }}
            >
                <AlertDialogContent className="rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the subject{' '}
                            <span className="font-semibold">{currentSubject?.code}</span>.
                            <br />
                            <br />
                            To confirm, please type "delete" below.
                        </AlertDialogDescription>
                        <Input
                            id="delete-confirm"
                            name="delete-confirm"
                            value={deleteInput}
                            onChange={(event) => setDeleteInput(event.target.value)}
                            className="mt-4 rounded-xl"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="rounded-xl"
                            onClick={() => {
                                setDeleteInput('');
                                setIsDeleteDialogOpen(false);
                            }}
                            disabled={isBusy(currentSubject ? `delete-subject-${currentSubject.id}` : '')}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={
                                deleteInput !== 'delete' || isBusy(currentSubject ? `delete-subject-${currentSubject.id}` : '')
                            }
                            onClick={handleDeleteSubject}
                            className="rounded-xl bg-destructive hover:bg-destructive/90"
                        >
                            {isBusy(currentSubject ? `delete-subject-${currentSubject.id}` : '') ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

