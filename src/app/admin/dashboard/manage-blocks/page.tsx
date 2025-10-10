
'use client';
import React, { useState } from 'react';
import { PlusCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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

type YearLevel = '1st-year' | '2nd-year' | '3rd-year' | '4th-year';

type YearLevelBlocks = {
  [key in YearLevel]: Block[];
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

const yearLevelsConfig: {value: YearLevel, label: string}[] = [
    { value: '1st-year', label: '1st Year' },
    { value: '2nd-year', label: '2nd Year' },
    { value: '3rd-year', label: '3rd Year' },
    { value: '4th-year', label: '4th Year' },
];


export default function ManageBlocksPage() {
    const [blocks, setBlocks] = useState<YearLevelBlocks>(initialBlocks);
    const [dialogState, setDialogState] = useState<{
        isOpen: boolean;
        mode: 'add' | 'edit';
        year: YearLevel | null;
        block?: Block;
        newName: string;
    }>({ isOpen: false, mode: 'add', year: null, newName: '' });
    const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean; block: Block | null, year: YearLevel | null}>({isOpen: false, block: null, year: null});

    const handleAddBlock = () => {
        if (!dialogState.newName.trim() || !dialogState.year) return;

        const newBlock = {
            id: Date.now(),
            name: dialogState.newName,
        };
        setBlocks(prev => ({
            ...prev,
            [dialogState.year!]: [...(prev[dialogState.year!] || []), newBlock],
        }));

        handleCloseDialog();
    };

    const handleEditBlock = () => {
        if (!dialogState.block || !dialogState.newName.trim() || !dialogState.year) return;

        setBlocks(prev => {
            const updatedBlocks = prev[dialogState.year!].map(b => 
                b.id === dialogState.block?.id ? { ...b, name: dialogState.newName } : b
            );
            return { ...prev, [dialogState.year!]: updatedBlocks };
        });

        handleCloseDialog();
    };

    const handleDeleteBlock = () => {
        if (!deleteDialog.block || !deleteDialog.year) return;
        
        setBlocks(prev => {
            const updatedBlocks = prev[deleteDialog.year!].filter(b => b.id !== deleteDialog.block!.id);
            return { ...prev, [deleteDialog.year!]: updatedBlocks };
        });
        setDeleteDialog({isOpen: false, block: null, year: null});
    };

    const handleOpenDialog = (mode: 'add' | 'edit', year: YearLevel, block?: Block) => {
        setDialogState({ 
            isOpen: true, 
            mode, 
            year, 
            block, 
            newName: mode === 'edit' && block ? block.name : ''
        });
    };

    const handleCloseDialog = () => {
        setDialogState({ isOpen: false, mode: 'add', year: null, newName: '' });
    };

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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {yearLevelsConfig.map(yl => (
                        <Card key={yl.value}>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="space-y-0.5">
                                    <CardTitle>Blocks for {yl.label}</CardTitle>
                                    <CardDescription>
                                        A total of {blocks[yl.value]?.length || 0} block(s) found.
                                    </CardDescription>
                                </div>
                                <Button size="sm" onClick={() => handleOpenDialog('add', yl.value)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Block
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {blocks[yl.value]?.length > 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-sm text-muted-foreground">Blocks will be shown here.</p>
                                    </div>
                                ) : (
                                    <div className="text-center py-10">
                                        <p className="text-sm text-muted-foreground">No blocks created for this year level yet.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>

            <Dialog open={dialogState.isOpen} onOpenChange={handleCloseDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{dialogState.mode === 'add' ? 'Add New Block' : 'Edit Block'}</DialogTitle>
                        <DialogDescription>
                            {dialogState.mode === 'add' 
                                ? `Enter the name for the new block in ${yearLevelsConfig.find(yl => yl.value === dialogState.year)?.label}.`
                                : `Editing the block name.`}
                        </DialogDescription>
                    </DialogHeader>
                    <form id="block-form" onSubmit={(e) => {
                         e.preventDefault();
                         if (dialogState.mode === 'add') handleAddBlock(); else handleEditBlock();
                    }}>
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
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                        <Button type="submit" form="block-form">
                            {dialogState.mode === 'add' ? 'Add Block' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({isOpen: false, block: null, year: null})}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the block <span className="font-semibold">{deleteDialog.block?.name}</span> and may affect student data associated with it.
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
