
'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, BookOpen, Code, Laptop, GraduationCap, Layers, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '../../context/admin-context';

type YearLevel = '1st-year' | '2nd-year' | '3rd-year' | '4th-year';

const yearOrder: YearLevel[] = ['1st-year', '2nd-year', '3rd-year', '4th-year'];

const baseYearConfig: Record<YearLevel, { label: string; fallbackDescription: string; courseHint: string; icon: any; color: string }> = {
    '1st-year': {
        label: '1st Year',
        fallbackDescription: 'Manage ACT blocks.',
        courseHint: 'ACT',
        icon: BookOpen,
        color: 'text-blue-400',
    },
    '2nd-year': {
        label: '2nd Year',
        fallbackDescription: 'Manage ACT blocks.',
        courseHint: 'ACT',
        icon: Code,
        color: 'text-indigo-400',
    },
    '3rd-year': {
        label: '3rd Year',
        fallbackDescription: 'Manage BSIT blocks.',
        courseHint: 'BSIT',
        icon: Laptop,
        color: 'text-purple-400',
    },
    '4th-year': {
        label: '4th Year',
        fallbackDescription: 'Manage BSIT blocks.',
        courseHint: 'BSIT',
        icon: GraduationCap,
        color: 'text-emerald-400',
    },
};

const formatYearLabel = (year: string) => {
    switch (year) {
        case '1st-year':
            return '1st Year';
        case '2nd-year':
            return '2nd Year';
        case '3rd-year':
            return '3rd Year';
        case '4th-year':
            return '4th Year';
        default:
            return year;
    }
};

const formatCourseDescription = (courses: Set<string>, blockCount: number, fallback: string) => {
    if (courses.size === 0) {
        return fallback;
    }

    const courseList = Array.from(courses).join(' • ');
    return `Manage ${courseList} blocks (${blockCount})`;
};


export default function ManageBlocksPage() {
    const { adminData } = useAdmin();
    const { blocks } = adminData;

    const yearLevelsConfig = useMemo(() => {
        const grouped = new Map<YearLevel, { courses: Set<string>; blockCount: number }>();

        blocks.forEach(block => {
            const year = block.year as YearLevel;
            if (!grouped.has(year)) {
                grouped.set(year, { courses: new Set([block.course]), blockCount: 1 });
                return;
            }

            const entry = grouped.get(year);
            if (!entry) return;
            entry.courses.add(block.course);
            entry.blockCount += 1;
        });

        return yearOrder.map(year => {
            const entry = grouped.get(year);
            const base = baseYearConfig[year];
            const courses = entry?.courses ?? new Set<string>();
            if (courses.size === 0 && base?.courseHint) {
                courses.add(base.courseHint);
            }

            return {
                value: year,
                label: base?.label ?? formatYearLabel(year),
                description: formatCourseDescription(entry?.courses ?? new Set<string>(), entry?.blockCount ?? 0, base?.fallbackDescription ?? 'No blocks have been created for this year level yet.'),
                courseSummary: Array.from(courses).join(' • '),
                hasBlocks: Boolean(entry?.blockCount),
                icon: base?.icon,
                color: base?.color,
            };
        });
    }, [blocks]);

    const recentBlocks = useMemo(() => {
        if (blocks.length === 0) {
            return [];
        }

        return blocks
            .slice()
            .sort((a, b) => b.id - a.id)
            .slice(0, 8)
            .map(block => ({
                ...block,
                yearLabel: formatYearLabel(block.year),
            }));
    }, [blocks]);

    return (
        <>
            <main className="flex-1 p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="space-y-0.5">
                     <h1 className="text-2xl font-bold tracking-tight text-slate-200">Manage Blocks</h1>
                    <p className="text-slate-400">
                        Select a year level to manage student blocks, schedules, and class lists.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {yearLevelsConfig.map(yearLevel => {
                        const Icon = yearLevel.icon;
                        return (
                            <Link href={`/admin/dashboard/manage-blocks/${yearLevel.value}`} key={yearLevel.value} className="flex group">
                                <Card className="w-full flex flex-col rounded-xl bg-transparent border-white/10 hover:bg-white/5 hover:border-white/20 transition-all relative overflow-hidden">
                                    <div className={`absolute -right-6 -top-6 opacity-5 group-hover:opacity-10 transition-opacity ${yearLevel.color}`}>
                                        {Icon && <Icon className="h-32 w-32" />}
                                    </div>
                                    <CardHeader className="flex flex-row items-start justify-between relative z-10">
                                        <div className="flex gap-4">
                                            <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${yearLevel.color}`}>
                                                {Icon && <Icon className="h-6 w-6" />}
                                            </div>
                                            <div className="space-y-1.5">
                                                <CardTitle className="text-white flex items-center gap-2">
                                                    {yearLevel.label}
                                                    {yearLevel.courseSummary ? (
                                                        <Badge variant="secondary" className="bg-white/10 text-slate-300 hover:bg-white/20 border-0">
                                                            {yearLevel.courseSummary}
                                                        </Badge>
                                                    ) : null}
                                                </CardTitle>
                                                <CardDescription className="text-slate-400">
                                                    {yearLevel.description}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-white transition-colors" />
                                    </CardHeader>
                                </Card>
                            </Link>
                        );
                    })}
                </div>

                <Card className="rounded-xl bg-transparent border-white/10">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-white">Recently Created Blocks</CardTitle>
                            <CardDescription className="text-slate-400">
                                A list of the most recently added blocks.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-slate-400">Block Name</TableHead>
                                    <TableHead className="text-slate-400">Course</TableHead>
                                    <TableHead className="text-slate-400">Year Level</TableHead>
                                    <TableHead className="text-right text-slate-400">Enrollment</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentBlocks.length > 0 ? (
                                    recentBlocks.map(block => (
                                        <TableRow key={block.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                            <TableCell className="font-medium text-slate-200">
                                                {block.specialization ? `${block.name} (${block.specialization})` : block.name}
                                            </TableCell>
                                            <TableCell className="text-slate-300">{block.course}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">{block.yearLabel}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-slate-300">{block.enrolled}/{block.capacity}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableCell colSpan={4} className="text-center h-24 text-slate-500">
                                            No blocks found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </>
    );
}
