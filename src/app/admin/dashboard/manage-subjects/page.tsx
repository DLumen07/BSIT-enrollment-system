'use client';
import { useCallback, useMemo, useState } from 'react';
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
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdmin, Subject } from '../../context/admin-context';
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
    prerequisite: string;
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
    prerequisite: 'none',
};

export default function ManageSubjectsPage() {
    const { adminData, refreshAdminData } = useAdmin();
    const { subjects } = adminData;
    const subjectsByYear = subjects;

    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<string>(yearLevels[0].value);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
    const [deleteInput, setDeleteInput] = useState('');
    const [addForm, setAddForm] = useState<SubjectFormState>(defaultFormState);
    const [editForm, setEditForm] = useState<SubjectFormState>(defaultFormState);
    const [busyAction, setBusyAction] = useState<string | null>(null);

    const isBusy = useCallback((action: string) => busyAction === action, [busyAction]);

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

    const prerequisiteOptions = useMemo(() => {
        const activeYearIndex = yearLevels.findIndex((yl) => yl.value === activeTab);

        if (activeYearIndex <= 0) {
            return [] as Subject[];
        }

        const previousYearKey = yearLevels[activeYearIndex - 1]?.value;
        if (!previousYearKey) {
            return [] as Subject[];
        }

        const candidates = [...(subjectsByYear[previousYearKey] ?? [])];

        if (currentSubject) {
            return candidates.filter((subject) => subject.id !== currentSubject.id);
        }

        return candidates;
    }, [activeTab, currentSubject, subjectsByYear]);

    const openAddDialog = useCallback(() => {
        setCurrentSubject(null);
        setAddForm(defaultFormState);
        setIsAddDialogOpen(true);
    }, []);

    const openEditDialog = useCallback((subject: Subject) => {
        setCurrentSubject(subject);
        setEditForm({
            code: subject.code ?? '',
            description: subject.description ?? '',
            units: String(subject.units ?? ''),
            prerequisite: subject.prerequisite ?? 'none',
        });
        setIsEditDialogOpen(true);
    }, []);

    const openDeleteDialog = useCallback((subject: Subject) => {
        setCurrentSubject(subject);
        setDeleteInput('');
        setIsDeleteDialogOpen(true);
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

        const payload = {
            code: uppercaseCode,
            description: normalizedDescription,
            units: numericUnits,
            yearLevel: yearLevelNumber,
            yearKey: activeTab,
            prerequisite: addForm.prerequisite !== 'none' ? addForm.prerequisite : null,
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
                description: `${uppercaseCode} has been added to ${yearLevels.find((yl) => yl.value === activeTab)?.label}.`,
            });
            setIsAddDialogOpen(false);
            setAddForm(defaultFormState);
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

        const payload = {
            subjectId: currentSubject.id,
            code: uppercaseCode,
            description: normalizedDescription,
            units: numericUnits,
            yearLevel: yearLevelNumber,
            yearKey: activeTab,
            prerequisite: editForm.prerequisite !== 'none' ? editForm.prerequisite : null,
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
                description: `${uppercaseCode} has been updated successfully.`,
            });
            setIsEditDialogOpen(false);
            setCurrentSubject(null);
            setEditForm(defaultFormState);
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
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight">Manage Subjects</h1>
                        <p className="text-muted-foreground">Add, edit, or remove subjects for each year level.</p>
                    </div>
                    <Button onClick={openAddDialog} className="rounded-full" disabled={isBusy('create-subject')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Subject
                    </Button>
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
                                const subjectsForYear = subjectsByYear[yl.value] ?? [];
                                return (
                                    <TabsContent key={yl.value} value={yl.value}>
                                        <div className="mt-4 rounded-lg border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Subject Code</TableHead>
                                                        <TableHead>Description</TableHead>
                                                        <TableHead>Units</TableHead>
                                                        <TableHead>Prerequisite</TableHead>
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
                                                                <TableCell>{subject.prerequisite ?? 'None'}</TableCell>
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
                                                            <TableCell colSpan={5} className="h-24 text-center">
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
                        setAddForm(defaultFormState);
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
                                <Label htmlFor="prerequisite">Prerequisite</Label>
                                <Select
                                    value={addForm.prerequisite}
                                    onValueChange={(value) => setAddForm((prev) => ({ ...prev, prerequisite: value }))}
                                >
                                    <SelectTrigger id="prerequisite" className="rounded-xl">
                                        <SelectValue placeholder="Select a prerequisite" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="none">None</SelectItem>
                                        {prerequisiteOptions.map((subjectOption) => (
                                            <SelectItem key={subjectOption.id} value={subjectOption.code}>
                                                {subjectOption.code} - {subjectOption.description}
                                            </SelectItem>
                                        ))}
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
                        setEditForm(defaultFormState);
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
                                <Label htmlFor="edit-prerequisite">Prerequisite</Label>
                                <Select
                                    value={editForm.prerequisite}
                                    onValueChange={(value) => setEditForm((prev) => ({ ...prev, prerequisite: value }))}
                                >
                                    <SelectTrigger id="edit-prerequisite" className="rounded-xl">
                                        <SelectValue placeholder="Select a prerequisite" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="none">None</SelectItem>
                                        {prerequisiteOptions.map((subjectOption) => (
                                            <SelectItem key={subjectOption.id} value={subjectOption.code}>
                                                {subjectOption.code} - {subjectOption.description}
                                            </SelectItem>
                                        ))}
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

