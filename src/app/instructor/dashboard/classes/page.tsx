
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
import { ChevronRight, Users, Edit, ChevronUp, ChevronDown, BookOpen, GraduationCap, Hash, School, Calendar, Search, IdCard } from 'lucide-react';
import type { Student } from '@/app/admin/context/admin-context';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
            <main className="flex-1 p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-500/10 rounded-xl">
                                <School className="h-6 w-6 text-blue-400" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-200">My Classes</h1>
                        </div>
                        <p className="text-slate-400 pl-12">
                            View student lists and manage grades for your assigned classes.
                        </p>
                    </div>
                </div>

                <Card className="rounded-xl border-white/10 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-white/10 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-slate-200 flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-blue-400" />
                                    Class List
                                </CardTitle>
                                <CardDescription className="text-slate-400">A list of all classes you handle this semester.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10">
                                <Search className="h-4 w-4 text-slate-500 ml-2" />
                                <Input 
                                    placeholder="Search classes..." 
                                    className="h-8 w-48 border-0 bg-transparent focus-visible:ring-0 text-slate-200 placeholder:text-slate-600"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-hidden">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                        <TableHead className="text-slate-400 pl-6 h-12">
                                            <div className="flex items-center gap-2">
                                                <Hash className="h-4 w-4 text-slate-600" />
                                                Class Block
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-slate-400 h-12">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-slate-600" />
                                                Subject
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-slate-400 h-12">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-slate-600" />
                                                Students
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-right text-slate-400 pr-6 h-12">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {classes.map(c => (
                                        <TableRow key={`${c.block}-${c.subjectCode}`} className="border-white/10 hover:bg-white/5 transition-colors group">
                                            <TableCell className="font-medium text-slate-200 pl-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs border border-blue-500/20">
                                                        {c.block.split(' ')[0]}
                                                    </div>
                                                    <span className="font-semibold">{c.block}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md text-xs border border-blue-500/20">
                                                            {c.subjectCode}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-400 line-clamp-1">{c.subjectDescription}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-300 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex -space-x-2">
                                                        {[...Array(Math.min(3, c.studentCount))].map((_, i) => (
                                                            <div key={i} className="h-8 w-8 rounded-full bg-slate-800 border-2 border-[#0f172a] flex items-center justify-center text-[10px] text-slate-500">
                                                                <Users className="h-3 w-3" />
                                                            </div>
                                                        ))}
                                                        {c.studentCount > 3 && (
                                                            <div className="h-8 w-8 rounded-full bg-slate-800 border-2 border-[#0f172a] flex items-center justify-center text-[10px] text-slate-400 font-medium">
                                                                +{c.studentCount - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-slate-500 ml-2">{c.studentCount} Students</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-4">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => openStudentsDialog(c)}
                                                    className="rounded-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 pr-4 pl-3"
                                                >
                                                    View Class
                                                    <ChevronRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
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
                <DialogContent className="max-w-5xl bg-[#0f172a] border-white/10 text-slate-200 rounded-3xl p-0 overflow-hidden gap-0">
                    <DialogHeader className="p-6 bg-[#020617] border-b border-white/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                                    <GraduationCap className="h-6 w-6 text-blue-400" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl text-slate-200 flex items-center gap-2">
                                        {selectedClass?.block}
                                        <span className="text-slate-600">/</span>
                                        <span className="text-blue-400 font-mono">{selectedClass?.subjectCode}</span>
                                    </DialogTitle>
                                    <DialogDescription className="text-slate-400 mt-1">
                                        {selectedClass?.subjectDescription}
                                    </DialogDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                <Users className="h-4 w-4" />
                                <span>{studentsInClass.length} Students Enrolled</span>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="max-h-[65vh] overflow-y-auto p-6 bg-[#0f172a]">
                        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#020617]/30">
                            <Table>
                                <TableHeader className="bg-[#020617]/80 backdrop-blur-sm sticky top-0 z-10">
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                        <TableHead className="text-slate-400 pl-6 h-12">Student Details</TableHead>
                                        <TableHead className="text-slate-400 h-12">ID Number</TableHead>
                                        {TERM_ORDER.map((termKey) => (
                                            <TableHead key={`header-${termKey}`} className="text-right text-slate-400 h-12">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Calendar className="h-3 w-3 text-slate-600" />
                                                    {TERM_LABELS[termKey]}
                                                </div>
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-right text-slate-400 pr-6 h-12">
                                            <div className="flex items-center justify-end gap-2">
                                                <GraduationCap className="h-3 w-3 text-slate-600" />
                                                Final Grade
                                            </div>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentsInClass.map(student => {
                                        const gradeRecord = getGradeRecordForSubject(student.studentId, selectedClass?.subjectCode);
                                        const isEditing = gradeEdit?.studentId === student.studentId && gradeEdit?.subjectCode === selectedClass?.subjectCode;
                                        
                                        return (
                                            <TableRow key={student.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                                <TableCell className="pl-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10 border-2 border-white/10 rounded-full">
                                                            <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person avatar" />
                                                            <AvatarFallback className="bg-slate-800 text-slate-400">{student.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="font-medium text-slate-200">{student.name}</div>
                                                            <div className="text-xs text-slate-500">{student.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div className="flex items-center gap-2 text-slate-400 font-mono text-xs bg-white/5 w-fit px-2 py-1 rounded-md border border-white/5">
                                                        <IdCard className="h-3 w-3" />
                                                        {student.studentId}
                                                    </div>
                                                </TableCell>
                                                {TERM_ORDER.map((termKey) => {
                                                    const termEntry = gradeRecord?.terms?.[termKey];
                                                    const termValue = termEntry?.grade ?? null;
                                                    const isTermEditing = isEditing && gradeEdit?.term === termKey;
                                                    return (
                                                        <TableCell key={`${student.id}-${termKey}`} className="text-right py-3">
                                                            {isTermEditing ? (
                                                                <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end sm:items-center bg-[#020617] p-1.5 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-900/20">
                                                                    <div className="flex items-center gap-1">
                                                                        <Input
                                                                            type="text"
                                                                            inputMode="decimal"
                                                                            placeholder="1.0-5.0"
                                                                            value={gradeEdit?.grade ?? ''}
                                                                            onChange={(event) =>
                                                                                setGradeEdit((current) =>
                                                                                    current ? { ...current, grade: event.target.value } : current,
                                                                                )
                                                                            }
                                                                            className="h-8 w-20 rounded-lg bg-slate-900 border-white/10 text-slate-200 focus:ring-blue-500/20 text-center font-mono"
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
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-3.5 w-5 rounded-sm text-slate-400 hover:text-slate-200 hover:bg-white/10"
                                                                                onClick={() => handleStepGrade(1)}
                                                                                disabled={isSaving}
                                                                            >
                                                                                <ChevronUp className="h-2.5 w-2.5" />
                                                                            </Button>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-3.5 w-5 rounded-sm text-slate-400 hover:text-slate-200 hover:bg-white/10"
                                                                                onClick={() => handleStepGrade(-1)}
                                                                                disabled={isSaving}
                                                                            >
                                                                                <ChevronDown className="h-2.5 w-2.5" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => { void handleSaveGrade(); }}
                                                                            disabled={isSaving}
                                                                            className="h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white border-0 px-3 text-xs"
                                                                        >
                                                                            Save
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={handleCancelEdit}
                                                                            disabled={isSaving}
                                                                            className="h-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 px-2"
                                                                        >
                                                                            <span className="sr-only">Cancel</span>
                                                                            <div className="h-4 w-4 flex items-center justify-center">×</div>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-end items-center gap-2 group">
                                                                    <span className={cn("font-mono font-semibold px-2.5 py-1 rounded-md border border-transparent transition-all", 
                                                                        termValue === 'INC' ? "text-red-400 bg-red-500/10 border-red-500/20" : 
                                                                        termValue && termValue <= 3.0 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : 
                                                                        termValue ? "text-slate-200 bg-white/5 border-white/10" : "text-slate-600"
                                                                    )}>{formatTermValue(termValue)}</span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                                                        onClick={() => setGradeEdit({
                                                                            studentId: student.studentId,
                                                                            subjectCode: selectedClass!.subjectCode,
                                                                            term: termKey,
                                                                            grade: termValue !== null ? termValue.toString() : '',
                                                                        })}
                                                                    >
                                                                        <Edit className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell className="text-right pr-6 py-3">
                                                    <div className="flex flex-col items-end">
                                                        <span className={cn("font-mono font-bold text-lg", 
                                                            gradeRecord?.grade === 'INC' ? "text-red-400" : 
                                                            gradeRecord?.grade && gradeRecord.grade <= 3.0 ? "text-emerald-400" : "text-slate-500"
                                                        )}>{formatTermValue(gradeRecord?.grade ?? null)}</span>
                                                        {gradeRecord?.remark ? (
                                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{gradeRecord.remark}</span>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <DialogFooter className="p-4 bg-[#020617] border-t border-white/10">
                        <Button variant="outline" onClick={() => setIsStudentsDialogOpen(false)} className="rounded-full border-white/10 text-slate-300 hover:bg-white/5 hover:text-white px-6">Close Roster</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
