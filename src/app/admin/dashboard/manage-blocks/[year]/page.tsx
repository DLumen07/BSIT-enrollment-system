
'use client';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Trash2, Pencil, Calendar } from 'lucide-react';
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

type Block = {
    id: number;
    name: string;
    capacity: number;
    enrolled: number;
    specialization?: string;
};


export default function YearLevelBlocksPage() {
    const params = useParams();
    const year = params.year as string;
    const yearLabel = yearLevelMap[year] || 'Unknown Year';
    const isUpperYear = year === '3rd-year' || year === '4th-year';

    const [blocks, setBlocks] = useState<Block[]>([
        { id: 1, name: `BSIT ${year.charAt(0)}-A`, capacity: 40, enrolled: 38, specialization: isUpperYear ? 'AP' : undefined },
        { id: 2, name: `BSIT ${year.charAt(0)}-B`, capacity: 40, enrolled: 35, specialization: isUpperYear ? 'DD' : undefined },
    ]);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
    const [blockName, setBlockName] = useState('');
    const [blockCapacity, setBlockCapacity] = useState('');
    const [blockSpecialization, setBlockSpecialization] = useState('none');

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
                specialization: isUpperYear && blockSpecialization !== 'none' ? blockSpecialization : undefined,
            };
            setBlocks([...blocks, newBlock]);
            setIsAddDialogOpen(false);
        }
    };

    const handleEditBlock = () => {
        if (selectedBlock && blockName && blockCapacity) {
            setBlocks(blocks.map(b => b.id === selectedBlock.id ? { ...b, name: blockName, capacity: parseInt(blockCapacity, 10), specialization: isUpperYear && blockSpecialization !== 'none' ? blockSpecialization : undefined } : b));
            setIsEditDialogOpen(false);
            setSelectedBlock(null);
        }
    };
    
    const handleDeleteBlock = () => {
        if (selectedBlock) {
            setBlocks(blocks.filter(b => b.id !== selectedBlock.id));
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
                                {blocks.length > 0 ? (
                                    blocks.map(block => (
                                        <TableRow key={block.id}>
                                            <TableCell className="font-medium">
                                                {getBlockDisplayName(block)}
                                            </TableCell>
                                            <TableCell>{block.capacity}</TableCell>
                                            <TableCell>{block.enrolled}</TableCell>
                                            <TableCell className="text-right">
                                                 <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:bg-transparent hover:text-accent focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:bg-transparent data-[state=open]:text-accent">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
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
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the <span className="font-semibold">{getBlockDisplayName(selectedBlock!)}</span> block.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBlock} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
