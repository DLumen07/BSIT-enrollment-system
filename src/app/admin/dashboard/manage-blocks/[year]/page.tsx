
'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Trash2, Pencil, Calendar, Users, Layers, UserCheck, Percent } from 'lucide-react';
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

    const stats = useMemo(() => {
        const totalBlocks = blocksForYear.length;
        const totalCapacity = blocksForYear.reduce((acc, b) => acc + b.capacity, 0);
        const totalEnrolled = blocksForYear.reduce((acc, b) => acc + b.enrolled, 0);
        const utilization = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;
        return { totalBlocks, totalCapacity, totalEnrolled, utilization };
    }, [blocksForYear]);


    return (
        <>
            <main className="flex-1 p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-200">Manage {course} {yearLabel} Blocks</h1>
                        <p className="text-slate-400">
                            Add, edit, and view blocks for {yearLabel}.
                        </p>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                             <Button className="rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 border-0">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add New Block
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                            <DialogHeader>
                                <DialogTitle className="text-white">Add New Block</DialogTitle>
                                <DialogDescription className="text-slate-400">
                                    Enter the name and capacity for the new block. The course prefix "{course}" will be added automatically.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label htmlFor="block-name" className="text-slate-300">Block Section</Label>
                                    <Input 
                                        id="block-name" 
                                        value={blockName} 
                                        onChange={e => setBlockName(e.target.value)} 
                                        placeholder="e.g., 1-A" 
                                        className="rounded-xl bg-transparent border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="block-capacity" className="text-slate-300">Capacity</Label>
                                    <Input 
                                        id="block-capacity" 
                                        type="number" 
                                        value={blockCapacity} 
                                        onChange={e => setBlockCapacity(e.target.value)} 
                                        placeholder="e.g., 40" 
                                        className="rounded-xl bg-transparent border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20" 
                                    />
                                </div>
                                {isUpperYear && (
                                     <div className="space-y-2">
                                        <Label htmlFor="block-specialization" className="text-slate-300">Specialization</Label>
                                        <Select value={blockSpecialization} onValueChange={setBlockSpecialization} required>
                                            <SelectTrigger id="block-specialization" className="rounded-xl bg-transparent border-white/10 text-white focus:ring-blue-500/20">
                                                <SelectValue placeholder="Select a specialization" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                                {specializations.map(spec => (
                                                    <SelectItem key={spec.value} value={spec.value} className="focus:bg-white/10 focus:text-white">{spec.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">Cancel</Button>
                                <Button onClick={handleAddBlock} className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-0" disabled={isBusy('create-block')}>
                                    {isBusy('create-block') ? 'Adding...' : 'Add Block'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="rounded-xl bg-transparent border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400">Total Blocks</CardTitle>
                            <Layers className="h-4 w-4 text-blue-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{stats.totalBlocks}</div>
                            <p className="text-xs text-slate-500">Active sections</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl bg-transparent border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400">Total Capacity</CardTitle>
                            <Users className="h-4 w-4 text-green-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{stats.totalCapacity}</div>
                            <p className="text-xs text-slate-500">Available seats</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl bg-transparent border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400">Total Enrolled</CardTitle>
                            <UserCheck className="h-4 w-4 text-purple-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{stats.totalEnrolled}</div>
                            <p className="text-xs text-slate-500">Students assigned</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-xl bg-transparent border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-400">Utilization</CardTitle>
                            <Percent className="h-4 w-4 text-orange-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{stats.utilization}%</div>
                            <p className="text-xs text-slate-500">Overall occupancy</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="rounded-xl bg-transparent border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Blocks for {yearLabel}</CardTitle>
                        <CardDescription className="text-slate-400">
                            Here you can manage blocks, view enrolled students, and set schedules.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-transparent">
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-slate-400">Block Name</TableHead>
                                    <TableHead className="text-slate-400">Capacity</TableHead>
                                    <TableHead className="text-slate-400">Enrolled</TableHead>
                                    <TableHead className="text-right text-slate-400">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {blocksForYear.length > 0 ? (
                                    blocksForYear.map(block => (
                                        <TableRow key={block.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                            <TableCell className="font-medium text-slate-200">
                                                {getBlockDisplayName(block)}
                                            </TableCell>
                                            <TableCell className="text-slate-300">{block.capacity}</TableCell>
                                            <TableCell className="text-slate-300">{block.enrolled}</TableCell>
                                            <TableCell className="text-right">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10 data-[state=open]:bg-white/10 data-[state=open]:text-white focus-visible:ring-0 focus-visible:ring-offset-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                                        <DropdownMenuItem onSelect={() => openViewStudentsDialog(block)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                                            <Users className="mr-2 h-4 w-4" /> View Students
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
                                                            <Link href={`/admin/dashboard/schedule/${encodeURIComponent(block.name)}`}>
                                                                <Calendar className="mr-2 h-4 w-4" /> Manage Schedule
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-white/10" />
                                                        <DropdownMenuItem onSelect={() => openEditDialog(block)} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="text-red-400 focus:bg-red-500/20 focus:text-red-300 cursor-pointer" 
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
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableCell colSpan={4} className="text-center h-24 text-slate-500">
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
                <DialogContent className="rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Block</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update the name, capacity, and specialization for this block.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit-block-name" className="text-slate-300">Block Section</Label>
                            <Input 
                                id="edit-block-name" 
                                value={blockName} 
                                onChange={e => setBlockName(e.target.value)} 
                                className="rounded-xl bg-transparent border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-block-capacity" className="text-slate-300">Capacity</Label>
                            <Input 
                                id="edit-block-capacity" 
                                type="number" 
                                value={blockCapacity} 
                                onChange={e => setBlockCapacity(e.target.value)} 
                                className="rounded-xl bg-transparent border-white/10 text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20" 
                            />
                        </div>
                         {isUpperYear && (
                            <div className="space-y-2">
                                <Label htmlFor="edit-block-specialization" className="text-slate-300">Specialization</Label>
                                <Select value={blockSpecialization} onValueChange={setBlockSpecialization} required>
                                    <SelectTrigger id="edit-block-specialization" className="rounded-xl bg-transparent border-white/10 text-white focus:ring-blue-500/20">
                                        <SelectValue placeholder="Select a specialization" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl bg-slate-900 border-white/10 text-slate-200">
                                        {specializations.map(spec => (
                                            <SelectItem key={spec.value} value={spec.value} className="focus:bg-white/10 focus:text-white">{spec.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">Cancel</Button>
                        <Button
                            onClick={handleEditBlock}
                            className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-0"
                            disabled={selectedBlock ? isBusy(`edit-block-${selectedBlock.id}`) : false}
                        >
                            {selectedBlock && isBusy(`edit-block-${selectedBlock.id}`) ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            This action cannot be undone. This will permanently delete the <span className="font-semibold text-white">{selectedBlock ? getBlockDisplayName(selectedBlock) : ''}</span> block.
                             <br/><br/>
                            To confirm, please type "delete" below.
                        </AlertDialogDescription>
                        <Input 
                            id="delete-confirm" 
                            name="delete-confirm"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="mt-4 rounded-xl bg-transparent border-white/10 text-white placeholder:text-slate-500 focus:border-red-500/50 focus:ring-red-500/20"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteInput('')} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            disabled={deleteInput !== 'delete' || (selectedBlock ? isBusy(`delete-block-${selectedBlock.id}`) : false)}
                            onClick={handleDeleteBlock} 
                            className="bg-red-600 hover:bg-red-500 text-white rounded-xl border-0"
                        >
                            {selectedBlock && isBusy(`delete-block-${selectedBlock.id}`) ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isViewStudentsOpen} onOpenChange={setIsViewStudentsOpen}>
                <DialogContent className="max-w-md rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-white">Students in {selectedBlock ? getBlockDisplayName(selectedBlock) : ''}</DialogTitle>
                         <DialogDescription className="text-slate-400">
                            List of all students enrolled in this block.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader className="bg-transparent">
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-slate-400">Student</TableHead>
                                    <TableHead className="text-slate-400">Student ID</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentsInSelectedBlock.length > 0 ? (
                                    studentsInSelectedBlock.map(student => (
                                        <TableRow key={student.id} className="border-white/5 hover:bg-white/5">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 border border-white/10">
                                                        <AvatarImage src={student.avatar || undefined} alt={student.name} />
                                                        <AvatarFallback className="bg-blue-600 text-white">{student.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium text-slate-200">{student.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-300">{student.studentId}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableCell colSpan={2} className="text-center h-24 text-slate-500">
                                            No students are currently assigned to this block.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewStudentsOpen(false)} className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
