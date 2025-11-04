
'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Trash2, Pencil, Calendar, Users } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAdmin, Block, Student } from '../../../context/admin-context';
import { useToast } from '@/hooks/use-toast';

const yearLevelMap: Record<string, string> = {
    '1st-year': '1st Year',
    '2nd-year': '2nd Year',
    '3rd-year': '3rd Year',
    '4th-year': '4th Year',
};

const yearLevelNumberMap: Record<string, number> = {
    '1st-year': 1,
    '2nd-year': 2,
    '3rd-year': 3,
    '4th-year': 4,
};

const specializations = [
    { value: 'AP', label: 'Application Programming (AP)' },
    { value: 'DD', label: 'Digital Design (DD)' },
];


export default function YearLevelBlocksPage() {
    const params = useParams();
    const { toast } = useToast();
    const { adminData, refreshAdminData } = useAdmin();
    const { blocks, students } = adminData;
    const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api').replace(/\/$/, '');
    const buildApiUrl = useCallback((endpoint: string) => `${API_BASE_URL}/${endpoint.replace(/^\//, '')}`, [API_BASE_URL]);
    const callBlockApi = useCallback(async <T = unknown>(endpoint: string, payload: unknown) => {
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
            // Ignore JSON parse errors and handle below.
        }

        if (!response.ok) {
            const message = data?.message ?? `Request failed with status ${response.status}`;
            throw new Error(message);
        }

        if (!data || data.status !== 'success') {
            throw new Error(data?.message ?? 'Request failed due to an unknown server error.');
        }

        return data as { status: 'success'; data?: T; message?: string };
    }, [buildApiUrl]);
    const [busyAction, setBusyAction] = useState<string | null>(null);
    const isBusy = useCallback((key: string) => busyAction === key, [busyAction]);
    const year = params.year as '1st-year' | '2nd-year' | '3rd-year' | '4th-year';
    const yearLabel = yearLevelMap[year] || 'Unknown Year';
    const yearNumber = yearLevelNumberMap[year] ?? 0;
    const isUpperYear = year === '3rd-year' || year === '4th-year';
    const course = isUpperYear ? 'BSIT' : 'ACT';
    const coursePrefixPattern = useMemo(() => new RegExp(`^${course}\\s+`, 'i'), [course]);
    const blocksForYear = useMemo(() => blocks.filter(b => b.year === year), [blocks, year]);
    const sanitizeSectionInput = useCallback((input: string) => {
        const lettersOnly = input.toUpperCase().replace(/[^A-Z]/g, '');
        const suffix = lettersOnly.charAt(0) || 'A';
        const prefix = yearNumber > 0 ? `${yearNumber}` : '1';
        return `${prefix}-${suffix}`;
    }, [yearNumber]);
    
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isViewStudentsOpen, setIsViewStudentsOpen] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
    const [blockName, setBlockName] = useState('');
    const [blockCapacity, setBlockCapacity] = useState('');
    const [blockSpecialization, setBlockSpecialization] = useState(isUpperYear ? 'AP' : undefined);
    const [deleteInput, setDeleteInput] = useState('');
    const studentsInSelectedBlock = useMemo<Student[]>(() => {
        if (!selectedBlock) {
            return [];
        }
        return students.filter(student => student.block === selectedBlock.name);
    }, [students, selectedBlock]);

     useEffect(() => {
        setBlockName('');
        setBlockCapacity('');
        setBlockSpecialization(isUpperYear ? 'AP' : undefined);
    }, [isAddDialogOpen, isEditDialogOpen, isUpperYear]);

    const handleAddBlock = async () => {
        const trimmedName = blockName.trim();
        if (!trimmedName || !blockCapacity) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Block name and capacity are required.' });
            return;
        }

        if (isUpperYear && !blockSpecialization) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Specialization is required for 3rd and 4th year blocks.' });
            return;
        }

        if (yearNumber <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Year Level', description: 'Unable to determine the year level for this block.' });
            return;
        }

        const capacityValue = parseInt(blockCapacity, 10);
        if (Number.isNaN(capacityValue) || capacityValue <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Capacity', description: 'Please enter a capacity greater than zero.' });
            return;
        }

        const sectionOnly = trimmedName.replace(coursePrefixPattern, '').trim();
        if (sectionOnly === '') {
            toast({ variant: 'destructive', title: 'Missing Section', description: 'Please include the section identifier (e.g., 1-A).' });
            return;
        }

        const sanitizedSection = sanitizeSectionInput(sectionOnly);
        const blockFullName = `${course} ${sanitizedSection}`.replace(/\s+/g, ' ').trim();

        const actionKey = 'create-block';
        if (isBusy(actionKey)) {
            return;
        }

        const payload = {
            name: blockFullName,
            course,
            yearLevel: year,
            capacity: capacityValue,
            specialization: isUpperYear ? blockSpecialization : null,
        };

        setBusyAction(actionKey);
        try {
            const result = await callBlockApi<{ block?: { name?: string } }>('create_block.php', payload);
            const canonicalName = result?.data?.block?.name ?? blockFullName;
            await refreshAdminData();
            toast({ title: 'Block Created', description: `${canonicalName} was added successfully.` });
            setIsAddDialogOpen(false);
            setBlockName('');
            setBlockCapacity('');
            setBlockSpecialization(isUpperYear ? 'AP' : undefined);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create block. Please try again.';
            toast({ variant: 'destructive', title: 'Create Failed', description: message });
        } finally {
            setBusyAction(null);
        }
    };

    const handleEditBlock = async () => {
        if (!selectedBlock) {
            return;
        }

        const trimmedName = blockName.trim();
        if (!trimmedName || !blockCapacity) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Block name and capacity are required.' });
            return;
        }

        if (isUpperYear && !blockSpecialization) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Specialization is required for 3rd and 4th year blocks.' });
            return;
        }

        if (yearNumber <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Year Level', description: 'Unable to determine the year level for this block.' });
            return;
        }

        const capacityValue = parseInt(blockCapacity, 10);
        if (Number.isNaN(capacityValue) || capacityValue <= 0) {
            toast({ variant: 'destructive', title: 'Invalid Capacity', description: 'Please enter a capacity greater than zero.' });
            return;
        }

        const sectionOnly = trimmedName.replace(coursePrefixPattern, '').trim();
        if (sectionOnly === '') {
            toast({ variant: 'destructive', title: 'Missing Section', description: 'Please include the section identifier (e.g., 3-A).' });
            return;
        }

        const sanitizedSection = sanitizeSectionInput(sectionOnly);
        const blockFullName = `${course} ${sanitizedSection}`.replace(/\s+/g, ' ').trim();

        const payload = {
            blockId: selectedBlock.id,
            name: blockFullName,
            capacity: capacityValue,
            specialization: isUpperYear ? blockSpecialization : null,
        };

        const actionKey = `edit-block-${selectedBlock.id}`;
        if (isBusy(actionKey)) {
            return;
        }

        setBusyAction(actionKey);
        try {
            await callBlockApi('update_block.php', payload);
            await refreshAdminData();
            toast({ title: 'Block Updated', description: `${blockFullName} was updated successfully.` });
            setIsEditDialogOpen(false);
            setSelectedBlock(null);
            setBlockName('');
            setBlockCapacity('');
            setBlockSpecialization(isUpperYear ? 'AP' : undefined);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update block. Please try again.';
            toast({ variant: 'destructive', title: 'Update Failed', description: message });
        } finally {
            setBusyAction(null);
        }
    };
    
    const handleDeleteBlock = async () => {
        if (!selectedBlock) {
            return;
        }

        const actionKey = `delete-block-${selectedBlock.id}`;
        if (isBusy(actionKey)) {
            return;
        }

        setBusyAction(actionKey);
        try {
            await callBlockApi('delete_block.php', { blockId: selectedBlock.id });
            await refreshAdminData();
            toast({ title: 'Block Deleted', description: `${getBlockDisplayName(selectedBlock)} was deleted.` });
            setIsDeleteDialogOpen(false);
            setSelectedBlock(null);
            setDeleteInput('');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete block. Please try again.';
            toast({ variant: 'destructive', title: 'Delete Failed', description: message });
        } finally {
            setBusyAction(null);
        }
    };

    const openEditDialog = (block: Block) => {
        setSelectedBlock(block);
        const sectionOnly = block.name.replace(new RegExp(`^${block.course}\\s+`, 'i'), '').trim();
        setBlockName(sectionOnly);
        setBlockCapacity(block.capacity.toString());
        setBlockSpecialization(block.specialization || (isUpperYear ? 'AP' : undefined));
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (block: Block) => {
        setSelectedBlock(block);
        setIsDeleteDialogOpen(true);
        setDeleteInput('');
    };

     const openViewStudentsDialog = (block: Block) => {
        setSelectedBlock(block);
        setIsViewStudentsOpen(true);
    };
    
    const getBlockDisplayName = (block: Block) => {
        return block.specialization ? `${block.name} (${block.specialization})` : block.name;
    }


    return (
        <>
            <main className="flex-1 p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight">Manage {course} {yearLabel} Blocks</h1>
                        <p className="text-muted-foreground">
                            Add, edit, and view blocks for {yearLabel}.
                        </p>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                             <Button className="rounded-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add New Block
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-xl">
                            <DialogHeader>
                                <DialogTitle>Add New Block</DialogTitle>
                                <DialogDescription>
                                    Enter the name and capacity for the new block. The course prefix "{course}" will be added automatically.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label htmlFor="block-name">Block Section</Label>
                                    <Input id="block-name" value={blockName} onChange={e => setBlockName(e.target.value)} placeholder="e.g., 1-A" className="rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="block-capacity">Capacity</Label>
                                    <Input id="block-capacity" type="number" value={blockCapacity} onChange={e => setBlockCapacity(e.target.value)} placeholder="e.g., 40" className="rounded-xl" />
                                </div>
                                {isUpperYear && (
                                     <div className="space-y-2">
                                        <Label htmlFor="block-specialization">Specialization</Label>
                                        <Select value={blockSpecialization} onValueChange={setBlockSpecialization} required>
                                            <SelectTrigger id="block-specialization" className="rounded-xl">
                                                <SelectValue placeholder="Select a specialization" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {specializations.map(spec => (
                                                    <SelectItem key={spec.value} value={spec.value}>{spec.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl">Cancel</Button>
                                <Button onClick={handleAddBlock} className="rounded-xl" disabled={isBusy('create-block')}>
                                    {isBusy('create-block') ? 'Adding...' : 'Add Block'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>Blocks for {yearLabel}</CardTitle>
                        <CardDescription>
                            Here you can manage blocks, view enrolled students, and set schedules.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Block Name</TableHead>
                                    <TableHead>Capacity</TableHead>
                                    <TableHead>Enrolled</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {blocksForYear.length > 0 ? (
                                    blocksForYear.map(block => (
                                        <TableRow key={block.id}>
                                            <TableCell className="font-medium">
                                                {getBlockDisplayName(block)}
                                            </TableCell>
                                            <TableCell>{block.capacity}</TableCell>
                                            <TableCell>{block.enrolled}</TableCell>
                                            <TableCell className="text-right">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-accent focus-visible:ring-0 focus-visible:ring-offset-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl">
                                                        <DropdownMenuItem onSelect={() => openViewStudentsDialog(block)}>
                                                            <Users className="mr-2 h-4 w-4" /> View Students
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/admin/dashboard/schedule/${encodeURIComponent(block.name)}`}>
                                                                <Calendar className="mr-2 h-4 w-4" /> Manage Schedule
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onSelect={() => openEditDialog(block)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="text-destructive focus:bg-destructive focus:text-destructive-foreground" 
                                                            onSelect={() => openDeleteDialog(block)}
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
                                            No blocks created yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Block</DialogTitle>
                        <DialogDescription>
                            Update the name, capacity, and specialization for this block.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit-block-name">Block Section</Label>
                            <Input id="edit-block-name" value={blockName} onChange={e => setBlockName(e.target.value)} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-block-capacity">Capacity</Label>
                            <Input id="edit-block-capacity" type="number" value={blockCapacity} onChange={e => setBlockCapacity(e.target.value)} className="rounded-xl" />
                        </div>
                         {isUpperYear && (
                            <div className="space-y-2">
                                <Label htmlFor="edit-block-specialization">Specialization</Label>
                                <Select value={blockSpecialization} onValueChange={setBlockSpecialization} required>
                                    <SelectTrigger id="edit-block-specialization" className="rounded-xl">
                                        <SelectValue placeholder="Select a specialization" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {specializations.map(spec => (
                                            <SelectItem key={spec.value} value={spec.value}>{spec.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button
                            onClick={handleEditBlock}
                            className="rounded-xl"
                            disabled={selectedBlock ? isBusy(`edit-block-${selectedBlock.id}`) : false}
                        >
                            {selectedBlock && isBusy(`edit-block-${selectedBlock.id}`) ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the <span className="font-semibold">{selectedBlock ? getBlockDisplayName(selectedBlock) : ''}</span> block.
                             <br/><br/>
                            To confirm, please type "delete" below.
                        </AlertDialogDescription>
                        <Input 
                            id="delete-confirm" 
                            name="delete-confirm"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="mt-4 rounded-xl"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteInput('')} className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            disabled={deleteInput !== 'delete' || (selectedBlock ? isBusy(`delete-block-${selectedBlock.id}`) : false)}
                            onClick={handleDeleteBlock} 
                            className="bg-destructive hover:bg-destructive/90 rounded-xl"
                        >
                            {selectedBlock && isBusy(`delete-block-${selectedBlock.id}`) ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isViewStudentsOpen} onOpenChange={setIsViewStudentsOpen}>
                <DialogContent className="max-w-md rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Students in {selectedBlock ? getBlockDisplayName(selectedBlock) : ''}</DialogTitle>
                         <DialogDescription>
                            List of all students enrolled in this block.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Student ID</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentsInSelectedBlock.length > 0 ? (
                                    studentsInSelectedBlock.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={student.avatar || undefined} alt={student.name} />
                                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{student.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{student.studentId}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center h-24">
                                            No students are currently assigned to this block.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewStudentsOpen(false)} className="rounded-xl">Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
