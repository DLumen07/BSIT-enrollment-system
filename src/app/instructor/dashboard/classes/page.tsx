
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
import { ChevronRight, Users, Edit, ChevronUp, ChevronDown } from 'lucide-react';
import type { Student } from '@/app/admin/context/admin-context';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const TERM_ORDER: GradeTermKey[] = ['prelim', 'midterm', 'final'];
const TERM_LABELS: Record<GradeTermKey, string> = {
    prelim: 'Prelim',
    midterm: 'Midterm',
    final: 'Final',
};

const GRADE_SEQUENCE = [
    '1.00',
    '1.25',
    '1.50',
    '1.75',
    '2.00',
    '2.25',
    '2.50',
    '2.75',
    '3.00',
    '3.25',
    '3.50',
    '3.75',
    '4.00',
    '4.25',
    '4.50',
    '4.75',
    '5.00',
    'INC',
] as const;
type GradeSequenceValue = (typeof GRADE_SEQUENCE)[number];
const clampToSequence = (value?: string): GradeSequenceValue => {
    if (!value) {
        return GRADE_SEQUENCE[0];
    }
    const trimmed = value.trim();
    if (trimmed.toUpperCase() === 'INC') {
        return 'INC';
    }
    const numeric = parseFloat(trimmed);
    if (Number.isNaN(numeric)) {
        return GRADE_SEQUENCE[0];
    }
    const offset = Math.round((numeric - 1) / 0.25);
    const index = Math.min(Math.max(offset, 0), GRADE_SEQUENCE.length - 2);
    return GRADE_SEQUENCE[index];
};

const formatTermValue = (value: number | 'INC' | null | undefined): string => {
    if (value === 'INC') {
        return 'INC';
    }
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

const normalizeSubjectCode = (code?: string | null) =>
    typeof code === 'string' ? code.trim().toUpperCase() : '';

export default function MyClassesPage() {
    const { instructorData, updateStudentGrade } = useInstructor();
    const { adminData } = useAdmin();
    const { toast } = useToast();

    const [selectedClass, setSelectedClass] = useState<InstructorClass | null>(null);
    const [isStudentsDialogOpen, setIsStudentsDialogOpen] = useState(false);

    const [gradeEdit, setGradeEdit] = useState<{ studentId: string; subjectCode: string; term: GradeTermKey; grade: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const currentAcademicYear = adminData.academicYear ?? 'Unspecified AY';
    const currentSemester = adminData.semester ?? 'Unspecified Semester';

    const gradesByStudent = instructorData?.grades ?? {};

    const getGradeRecordForSubject = useCallback((studentId: string, subjectCode?: string | null) => {
        if (!subjectCode) {
            return null;
        }
        const normalizedTarget = normalizeSubjectCode(subjectCode);
        if (!normalizedTarget) {
            return null;
        }
        const studentGrades = gradesByStudent[studentId] ?? [];
        return studentGrades.find((grade) => {
            if (normalizeSubjectCode(grade.subjectCode) !== normalizedTarget) {
                return false;
            }
            const gradeYear = grade.academicYear ?? currentAcademicYear;
            const gradeSemester = grade.semester ?? currentSemester;
            return gradeYear === currentAcademicYear && gradeSemester === currentSemester;
        }) ?? null;
    }, [gradesByStudent, currentAcademicYear, currentSemester]);

    const isStudentInSubject = useCallback((student: Student, subjectCode: string) => {
        const normalizedTarget = normalizeSubjectCode(subjectCode);
        if (!normalizedTarget) {
            return false;
        }
        const enlistedMatch = (student.enlistedSubjects ?? []).some(
            (subject) => normalizeSubjectCode(subject.code) === normalizedTarget,
        );
        if (enlistedMatch) {
            return true;
        }
        return getGradeRecordForSubject(student.studentId, subjectCode) !== null;
    }, [getGradeRecordForSubject]);

    const studentsInClass = useMemo(() => {
        if (!selectedClass) return [];
        const roster = adminData.students.filter(s => s.block === selectedClass.block);
        return roster.filter((student) => isStudentInSubject(student, selectedClass.subjectCode));
    }, [selectedClass, adminData.students, isStudentInSubject]);

    const openStudentsDialog = (c: InstructorClass) => {
        setSelectedClass(c);
        setIsStudentsDialogOpen(true);
    };

    const handleSaveGrade = useCallback(async () => {
        if (!gradeEdit || isSaving) return;

        const rawValue = gradeEdit.grade.trim();
        const isIncomplete = rawValue.toUpperCase() === 'INC';
        let gradeValue: number | 'INC' = 'INC';

        if (!isIncomplete) {
            const numericValue = parseFloat(rawValue);
            if (isNaN(numericValue) || numericValue < 1.0 || numericValue > 5.0) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid Grade',
                    description: 'Please enter a valid grade between 1.0 and 5.0 or type INC.',
                });
                return;
            }
            gradeValue = numericValue;
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

    const handleStepGrade = useCallback((direction: 1 | -1) => {
        setGradeEdit((current) => {
            if (!current) {
                return current;
            }
            const normalized = clampToSequence(current.grade);
            const currentIndex = GRADE_SEQUENCE.indexOf(normalized);
            const nextIndex = Math.min(Math.max(currentIndex + direction, 0), GRADE_SEQUENCE.length - 1);
            return { ...current, grade: GRADE_SEQUENCE[nextIndex] };
        });
    }, []);

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
                                    const gradeRecord = getGradeRecordForSubject(student.studentId, selectedClass?.subjectCode);
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
                                                const termValue = termEntry?.grade ?? null;
                                                const isTermEditing = isEditing && gradeEdit?.term === termKey;
                                                return (
                                                    <TableCell key={`${student.id}-${termKey}`} className="text-right">
                                                        {isTermEditing ? (
                                                            <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end sm:items-center">
                                                                <div className="flex items-center gap-1">
                                                                    <Input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        placeholder="1.0-5.0 or INC"
                                                                        value={gradeEdit?.grade ?? ''}
                                                                        onChange={(event) =>
                                                                            setGradeEdit((current) =>
                                                                                current ? { ...current, grade: event.target.value } : current,
                                                                            )
                                                                        }
                                                                        className="h-8 w-28 rounded-md"
                                                                        autoFocus
                                                                        onKeyDown={(event) => {
                                                                            if (event.key === 'Enter') {
                                                                                event.preventDefault();
                                                                                void handleSaveGrade();
                                                                            }
                                                                            if (event.key === 'ArrowUp') {
                                                                                event.preventDefault();
                                                                                handleStepGrade(1);
                                                                            }
                                                                            if (event.key === 'ArrowDown') {
                                                                                event.preventDefault();
                                                                                handleStepGrade(-1);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <div className="flex flex-col gap-1">
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-4 w-6"
                                                                            onClick={() => handleStepGrade(1)}
                                                                            disabled={isSaving}
                                                                            aria-label="Increase grade"
                                                                        >
                                                                            <ChevronUp className="h-3 w-3" />
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-4 w-6"
                                                                            onClick={() => handleStepGrade(-1)}
                                                                            disabled={isSaving}
                                                                            aria-label="Decrease grade"
                                                                        >
                                                                            <ChevronDown className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
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
                                                    <span className="font-semibold">{formatTermValue(gradeRecord?.grade ?? null)}</span>
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
