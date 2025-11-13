
'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { useInstructor, type GradeTermKey } from '@/app/instructor/context/instructor-context';
import { useAdmin } from '@/app/admin/context/admin-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight, Users, Edit } from 'lucide-react';
import type { Student } from '@/app/admin/context/admin-context';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const TERM_ORDER: GradeTermKey[] = ['prelim', 'midterm', 'final'];
const TERM_LABELS: Record<GradeTermKey, string> = {
    prelim: 'Prelim',
    midterm: 'Midterm',
    final: 'Final',
};

const formatTermValue = (value: number | null | undefined): string => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return '—';
    }
    const fixed = value.toFixed(2);
    return fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};

type InstructorClass = {
    block: string;
    subjectCode: string;
    subjectDescription: string;
    studentCount: number;
};

export default function MyClassesPage() {
    const { instructorData, updateStudentGrade } = useInstructor();
    const { adminData } = useAdmin();
    const { toast } = useToast();

    const [selectedClass, setSelectedClass] = useState<InstructorClass | null>(null);
    const [isStudentsDialogOpen, setIsStudentsDialogOpen] = useState(false);

    const [gradeEdit, setGradeEdit] = useState<{ studentId: string; subjectCode: string; term: GradeTermKey; grade: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const studentsInClass = useMemo(() => {
        if (!selectedClass) return [];
        return adminData.students.filter(s => s.block === selectedClass.block);
    }, [selectedClass, adminData.students]);

    const openStudentsDialog = (c: InstructorClass) => {
        setSelectedClass(c);
        setIsStudentsDialogOpen(true);
    };

    const handleSaveGrade = useCallback(async () => {
        if (!gradeEdit || isSaving) return;

        const gradeValue = parseFloat(gradeEdit.grade);
        if (isNaN(gradeValue) || gradeValue < 1.0 || gradeValue > 5.0) {
            toast({
                variant: 'destructive',
                title: 'Invalid Grade',
                description: 'Please enter a valid grade between 1.0 and 5.0.',
            });
            return;
        }

        try {
            setIsSaving(true);
            await updateStudentGrade(gradeEdit.studentId, gradeEdit.subjectCode, gradeEdit.term, gradeValue);
            toast({
                title: 'Grade Updated',
                description: `${TERM_LABELS[gradeEdit.term]} grade has been saved for student ${gradeEdit.studentId}.`,
            });
            setGradeEdit(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to save grade right now.';
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: message,
            });
        } finally {
            setIsSaving(false);
        }
    }, [gradeEdit, isSaving, toast, updateStudentGrade]);

    const handleCancelEdit = useCallback(() => {
        if (isSaving) {
            return;
        }
        setGradeEdit(null);
    }, [isSaving]);

    if (!instructorData) return null;

    const { classes, grades } = instructorData;

    return (
        <>
            <main className="flex-1 p-4 sm:p-6 space-y-6">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">My Classes</h1>
                    <p className="text-muted-foreground">
                        View student lists and manage grades for your assigned classes.
                    </p>
                </div>
                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>Class List</CardTitle>
                        <CardDescription>A list of all classes you handle this semester.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Students</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {classes.map(c => (
                                        <TableRow key={`${c.block}-${c.subjectCode}`}>
                                            <TableCell className="font-medium">{c.block}</TableCell>
                                            <TableCell>
                                                <div>{c.subjectCode}</div>
                                                <div className="text-xs text-muted-foreground">{c.subjectDescription}</div>
                                            </TableCell>
                                            <TableCell>{c.studentCount}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => openStudentsDialog(c)}>
                                                    View Class
                                                    <ChevronRight className="h-4 w-4 ml-2" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>

            <Dialog open={isStudentsDialogOpen} onOpenChange={setIsStudentsDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Class Roster: {selectedClass?.block} - {selectedClass?.subjectCode}</DialogTitle>
                        <DialogDescription>
                            {selectedClass?.subjectDescription}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Student ID</TableHead>
                                    {TERM_ORDER.map((termKey) => (
                                        <TableHead key={`header-${termKey}`} className="text-right">
                                            {TERM_LABELS[termKey]}
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-right">Final Grade</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentsInClass.map(student => {
                                    const gradeRecord = grades[student.studentId]?.find(g => g.subjectCode === selectedClass?.subjectCode);
                                    const isEditing = gradeEdit?.studentId === student.studentId && gradeEdit?.subjectCode === selectedClass?.subjectCode;
                                    
                                    return (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person avatar" />
                                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium">{student.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{student.studentId}</TableCell>
                                            {TERM_ORDER.map((termKey) => {
                                                const termEntry = gradeRecord?.terms?.[termKey];
                                                const termValue = typeof termEntry?.grade === 'number' ? termEntry.grade : null;
                                                const isTermEditing = isEditing && gradeEdit?.term === termKey;
                                                return (
                                                    <TableCell key={`${student.id}-${termKey}`} className="text-right">
                                                        {isTermEditing ? (
                                                            <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end sm:items-center">
                                                                <Input
                                                                    type="number"
                                                                    step="0.25"
                                                                    min="1.0"
                                                                    max="5.0"
                                                                    value={gradeEdit?.grade ?? ''}
                                                                    onChange={(e) => setGradeEdit({ ...gradeEdit, grade: e.target.value })}
                                                                    className="h-8 w-24 rounded-md"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            void handleSaveGrade();
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => { void handleSaveGrade(); }}
                                                                        disabled={isSaving}
                                                                    >
                                                                        {isSaving ? 'Saving…' : 'Save'}
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={handleCancelEdit}
                                                                        disabled={isSaving}
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-end items-center gap-2 group">
                                                                <span className="font-semibold">{formatTermValue(termValue)}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                                    onClick={() => setGradeEdit({
                                                                        studentId: student.studentId,
                                                                        subjectCode: selectedClass!.subjectCode,
                                                                        term: termKey,
                                                                        grade: termValue !== null ? termValue.toString() : '',
                                                                    })}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-semibold">{typeof gradeRecord?.grade === 'number' ? formatTermValue(gradeRecord.grade) : '—'}</span>
                                                    {gradeRecord?.remark ? (
                                                        <span className="text-xs text-muted-foreground">{gradeRecord.remark}</span>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsStudentsDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
