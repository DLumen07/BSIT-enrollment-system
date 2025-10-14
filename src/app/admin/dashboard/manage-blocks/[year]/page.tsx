
'use client';
import React, { useState, useEffect } from 'react';
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
import { useAdmin, Block, mockStudents } from '../../../context/admin-context';


const yearLevelMap: Record<string, string> = {
    '1st-year': '1st Year',
    '2nd-year': '2nd Year',
    '3rd-year': '3rd Year',
    '4th-year': '4th Year',
};

const specializations = [
    { value: 'none', label: 'None' },
    { value: 'AP', label: 'Application Programming (AP)' },
    { value: 'DD', label: 'Digital Design (DD)' },
];


export default function YearLevelBlocksPage() {
    const params = useParams();
    const { adminData, setAdminData } = useAdmin();
    const year = params.year as '1st-year' | '2nd-year' | '3rd-year' | '4th-year';
    const yearLabel = yearLevelMap[year] || 'Unknown Year';
    const isUpperYear = year === '3rd-year' || year === '4th-year';

    const blocksForYear = adminData.blocks.filter(b => b.year === year);
    
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isViewStudentsOpen, setIsViewStudentsOpen] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
    const [blockName, setBlockName] = useState('');
    const [blockCapacity, setBlockCapacity] = useState('');
    const [blockSpecialization, setBlockSpecialization] = useState('none');
    const [deleteInput, setDeleteInput] = useState('');

     useEffect(() => {
        setBlockName('');
        setBlockCapacity('');
        setBlockSpecialization('none');
    }, [isAddDialogOpen, isEditDialogOpen]);

    const handleAddBlock = () => {
        if (blockName && blockCapacity) {
            const newBlock: Block = {
                id: Date.now(),
                name: blockName,
                capacity: parseInt(blockCapacity, 10),
                enrolled: 0,
                year,
                specialization: isUpperYear && blockSpecialization !== 'none' ? blockSpecialization : undefined,
            };
            setAdminData(prev => ({...prev, blocks: [...prev.blocks, newBlock]}));
            setIsAddDialogOpen(false);
        }
    };

    const handleEditBlock = () => {
        if (selectedBlock && blockName && blockCapacity) {
            const updatedBlock = { 
                ...selectedBlock, 
                name: blockName, 
                capacity: parseInt(blockCapacity, 10), 
                specialization: isUpperYear && blockSpecialization !== 'none' ? blockSpecialization : undefined 
            };
            setAdminData(prev => ({
                ...prev,
                blocks: prev.blocks.map(b => b.id === selectedBlock.id ? updatedBlock : b)
            }));
            setIsEditDialogOpen(false);
            setSelectedBlock(null);
        }
    };
    
    const handleDeleteBlock = () => {
        if (selectedBlock) {
            setAdminData(prev => ({...prev, blocks: prev.blocks.filter(b => b.id !== selectedBlock.id)}));
            setIsDeleteDialogOpen(false);
            setSelectedBlock(null);
        }
    };

    const openEditDialog = (block: Block) => {
        setSelectedBlock(block);
        setBlockName(block.name);
        setBlockCapacity(block.capacity.toString());
        setBlockSpecialization(block.specialization || 'none');
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
                        <h1 className="text-2xl font-bold tracking-tight">Manage {yearLabel} Blocks</h1>
                        <p className="text-muted-foreground">
                            Add, edit, and view blocks for {yearLabel}.
                        </p>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                             <Button className="rounded-full bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add New Block
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Block</DialogTitle>
                                <DialogDescription>
                                    Enter the name and capacity for the new block.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label htmlFor="block-name">Block Name</Label>
                                    <Input id="block-name" value={blockName} onChange={e => setBlockName(e.target.value)} placeholder="e.g., BSIT 1-A" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="block-capacity">Capacity</Label>
                                    <Input id="block-capacity" type="number" value={blockCapacity} onChange={e => setBlockCapacity(e.target.value)} placeholder="e.g., 40" />
                                </div>
                                {isUpperYear && (
                                     <div className="space-y-2">
                                        <Label htmlFor="block-specialization">Specialization</Label>
                                        <Select value={blockSpecialization} onValueChange={setBlockSpecialization}>
                                            <SelectTrigger id="block-specialization">
                                                <SelectValue placeholder="Select a specialization" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {specializations.map(spec => (
                                                    <SelectItem key={spec.value} value={spec.value}>{spec.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddBlock}>Add Block</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
                <Card>
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
                                                    <DropdownMenuContent align="end">
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Block</DialogTitle>
                        <DialogDescription>
                            Update the name, capacity, and specialization for this block.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="edit-block-name">Block Name</Label>
                            <Input id="edit-block-name" value={blockName} onChange={e => setBlockName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-block-capacity">Capacity</Label>
                            <Input id="edit-block-capacity" type="number" value={blockCapacity} onChange={e => setBlockCapacity(e.target.value)} />
                        </div>
                         {isUpperYear && (
                            <div className="space-y-2">
                                <Label htmlFor="edit-block-specialization">Specialization</Label>
                                <Select value={blockSpecialization} onValueChange={setBlockSpecialization}>
                                    <SelectTrigger id="edit-block-specialization">
                                        <SelectValue placeholder="Select a specialization" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {specializations.map(spec => (
                                            <SelectItem key={spec.value} value={spec.value}>{spec.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleEditBlock}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
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
                            className="mt-4"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteInput('')}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            disabled={deleteInput !== 'delete'}
                            onClick={handleDeleteBlock} 
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isViewStudentsOpen} onOpenChange={setIsViewStudentsOpen}>
                <DialogContent className="max-w-md">
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
                                {mockStudents.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={student.avatar} alt={student.name} />
                                                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{student.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{student.id}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewStudentsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
