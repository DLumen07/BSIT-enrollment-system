
'use client';
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Trash2, Pencil, Users } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const yearLevelMap: Record<string, string> = {
    '1st-year': '1st Year',
    '2nd-year': '2nd Year',
    '3rd-year': '3rd Year',
    '4th-year': '4th Year',
};

type Block = {
    id: number;
    name: string;
    capacity: number;
    enrolled: number;
};

const initialBlocks: Record<string, Block[]> = {
    '1st-year': [
        { id: 1, name: 'BSIT 1-A', capacity: 45, enrolled: 42 },
        { id: 2, name: 'BSIT 1-B', capacity: 45, enrolled: 44 },
    ],
    '2nd-year': [],
    '3rd-year': [
        { id: 3, name: 'BSIT 3-A (Reg)', capacity: 40, enrolled: 38 },
        { id: 4, name: 'BSIT 3-B (Irreg)', capacity: 50, enrolled: 15 },
    ],
    '4th-year': [],
};

export default function YearLevelBlocksPage() {
    const params = useParams();
    const year = params.year as string;
    const yearLabel = yearLevelMap[year] || 'Unknown Year';

    const [blocks, setBlocks] = useState<Block[]>(initialBlocks[year] || []);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

    const handleAddBlock = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const name = formData.get('blockName') as string;
        const capacity = parseInt(formData.get('capacity') as string, 10);

        if (name && capacity > 0) {
            setBlocks(prev => [...prev, { id: Date.now(), name, capacity, enrolled: 0 }]);
            setIsAddDialogOpen(false);
        }
    };

    const handleEditBlock = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedBlock) return;

        const formData = new FormData(event.currentTarget);
        const name = formData.get('blockName') as string;
        const capacity = parseInt(formData.get('capacity') as string, 10);

        if (name && capacity > 0) {
            setBlocks(prev => prev.map(b => b.id === selectedBlock.id ? { ...b, name, capacity } : b));
            setIsEditDialogOpen(false);
            setSelectedBlock(null);
        }
    };

    const handleDeleteBlock = () => {
        if (!selectedBlock) return;
        setBlocks(prev => prev.filter(b => b.id !== selectedBlock.id));
        setIsDeleteDialogOpen(false);
        setSelectedBlock(null);
    };

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
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add New Block
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Block</DialogTitle>
                                <DialogDescription>Enter the details for the new block.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddBlock} id="add-block-form">
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="blockName">Block Name</Label>
                                        <Input id="blockName" name="blockName" placeholder="e.g., BSIT 1-A" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="capacity">Capacity</Label>
                                        <Input id="capacity" name="capacity" type="number" min="1" placeholder="e.g., 45" required />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit">Add Block</Button>
                                </DialogFooter>
                            </form>
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
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {blocks.length > 0 ? (
                                    blocks.map(block => (
                                        <TableRow key={block.id}>
                                            <TableCell className="font-medium">{block.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <span>{block.enrolled} / {block.capacity}</span>
                                                </div>
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
                                                        <DropdownMenuItem onSelect={() => { setSelectedBlock(block); setIsEditDialogOpen(true); }}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit Block
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                            onSelect={() => { setSelectedBlock(block); setIsDeleteDialogOpen(true); }}>
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Block
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            No blocks created for this year level yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>

            {/* Edit Dialog */}
            {selectedBlock && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Block</DialogTitle>
                            <DialogDescription>Update the details for the block.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEditBlock} id="edit-block-form">
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-blockName">Block Name</Label>
                                    <Input id="edit-blockName" name="blockName" defaultValue={selectedBlock.name} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-capacity">Capacity</Label>
                                    <Input id="edit-capacity" name="capacity" type="number" min="1" defaultValue={selectedBlock.capacity} required />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">Save Changes</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Dialog */}
            {selectedBlock && (
                 <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the 
                                <span className="font-semibold"> {selectedBlock.name} </span> block.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setSelectedBlock(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteBlock} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}

    