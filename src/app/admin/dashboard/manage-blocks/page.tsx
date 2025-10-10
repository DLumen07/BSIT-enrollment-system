
'use client';
import React, { useState } from 'react';
import { PlusCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Block = {
  id: number;
  name: string;
};

type YearLevelBlocks = {
  [key: string]: Block[];
};

const initialBlocks: YearLevelBlocks = {
  '1st-year': [
    { id: 1, name: 'BSIT 1-A' },
    { id: 2, name: 'BSIT 1-B' },
    { id: 3, name: 'BSIT 1-C' },
  ],
  '2nd-year': [
    { id: 4, name: 'BSIT 2-A' },
    { id: 5, name: 'BSIT 2-B' },
  ],
  '3rd-year': [
    { id: 6, name: 'BSIT 3-A (Regular)' },
    { id: 7, name: 'BSIT 3-B (Irregular)' },
  ],
  '4th-year': [
      { id: 8, name: 'BSIT 4-A' }
  ],
};

export default function ManageBlocksPage() {
    const [blocks, setBlocks] = useState<YearLevelBlocks>(initialBlocks);
    const [activeTab, setActiveTab] = useState('1st-year');
    const [dialogState, setDialogState] = useState<{
        isOpen: boolean;
        mode: 'add' | 'edit';
        year: string;
        block?: Block;
        newName: string;
    }>({ isOpen: false, mode: 'add', year: '1st-year', newName: '' });
    const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, blockId: number | null}>({isOpen: false, blockId: null});

    const handleAddBlock = () => {
        if (!dialogState.newName.trim()) return;

        const newBlock = {
            id: Date.now(),
            name: dialogState.newName,
        };
        setBlocks(prev => ({
            ...prev,
            [activeTab]: [...(prev[activeTab] || []), newBlock],
        }));

        handleCloseDialog();
    };

    const handleEditBlock = () => {
        if (!dialogState.block || !dialogState.newName.trim()) return;

        setBlocks(prev => {
            const updatedBlocks = prev[activeTab].map(b => 
                b.id === dialogState.block?.id ? { ...b, name: dialogState.newName } : b
            );
            return { ...prev, [activeTab]: updatedBlocks };
        });

        handleCloseDialog();
    };

    const handleDeleteBlock = () => {
        if (deleteDialog.blockId === null) return;
        setBlocks(prev => {
            const updatedBlocks = prev[activeTab].filter(b => b.id !== deleteDialog.blockId);
            return { ...prev, [activeTab]: updatedBlocks };
        });
        setDeleteDialog({isOpen: false, blockId: null});
    };

    const handleOpenDialog = (mode: 'add' | 'edit', block?: Block) => {
        setDialogState({ 
            isOpen: true, 
            mode, 
            year: activeTab, 
            block, 
            newName: mode === 'edit' && block ? block.name : ''
        });
    };

    const handleCloseDialog = () => {
        setDialogState({ isOpen: false, mode: 'add', year: '', newName: '' });
    };

    const yearLevels = [
        { value: '1st-year', label: '1st Year' },
        { value: '2nd-year', label: '2nd Year' },
        { value: '3rd-year', label: '3rd Year' },
        { value: '4th-year', label: '4th Year' },
    ];

    return (
        <>
            <main className="flex-1 p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                         <h1 className="text-2xl font-bold tracking-tight">Manage Blocks</h1>
                        <p className="text-muted-foreground">
                            Organize students into blocks or sections for each year level.
                        </p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <TabsList>
                            {yearLevels.map(yl => (
                                <TabsTrigger key={yl.value} value={yl.value}>{yl.label}</TabsTrigger>
                            ))}
                        </TabsList>
                        <Button onClick={() => handleOpenDialog('add')} className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add New Block
                        </Button>
                    </div>
                    {yearLevels.map(yl => (
                         <TabsContent key={yl.value} value={yl.value} className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Blocks for {yl.label}</CardTitle>
                                    <CardDescription>
                                        A total of {blocks[yl.value]?.length || 0} block(s) found.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {blocks[yl.value]?.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {blocks[yl.value].map(block => (
                                                <Card key={block.id} className="group">
                                                    <CardContent className="flex items-center justify-between p-4">
                                                        <span className="font-medium">{block.name}</span>
                                                         <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onSelect={() => handleOpenDialog('edit', block)}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                                    onSelect={() => setDeleteDialog({ isOpen: true, blockId: block.id })}
                                                                >
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <p className="text-muted-foreground">No blocks created for this year level yet.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                         </TabsContent>
                    ))}
                </Tabs>
            </main>

            <Dialog open={dialogState.isOpen} onOpenChange={handleCloseDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{dialogState.mode === 'add' ? 'Add New Block' : 'Edit Block'}</DialogTitle>
                        <DialogDescription>
                            {dialogState.mode === 'add' 
                                ? `Enter the name for the new block in ${yearLevels.find(yl => yl.value === activeTab)?.label}.`
                                : `Editing the block name.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="block-name" className="text-right">
                                Name
                            </Label>
                            <Input
                                id="block-name"
                                value={dialogState.newName}
                                onChange={(e) => setDialogState(prev => ({ ...prev, newName: e.target.value }))}
                                className="col-span-3"
                                placeholder="e.g., BSIT 1-D"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                        <Button onClick={dialogState.mode === 'add' ? handleAddBlock : handleEditBlock}>
                            {dialogState.mode === 'add' ? 'Add Block' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({isOpen: false, blockId: null})}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the block and may affect student data associated with it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={handleDeleteBlock}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
