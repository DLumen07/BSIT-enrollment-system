
'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAdmin } from '../../context/admin-context';

type YearLevel = '1st-year' | '2nd-year' | '3rd-year' | '4th-year';

const yearOrder: YearLevel[] = ['1st-year', '2nd-year', '3rd-year', '4th-year'];

const baseYearConfig: Record<YearLevel, { label: string; fallbackDescription: string; courseHint: string }> = {
    '1st-year': {
        label: '1st Year',
        fallbackDescription: 'Manage ACT blocks.',
        courseHint: 'ACT',
    },
    '2nd-year': {
        label: '2nd Year',
        fallbackDescription: 'Manage ACT blocks.',
        courseHint: 'ACT',
    },
    '3rd-year': {
        label: '3rd Year',
        fallbackDescription: 'Manage BSIT blocks.',
        courseHint: 'BSIT',
    },
    '4th-year': {
        label: '4th Year',
        fallbackDescription: 'Manage BSIT blocks.',
        courseHint: 'BSIT',
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
            <main className="flex-1 p-4 sm:p-6 space-y-6">
                <div className="space-y-0.5">
                     <h1 className="text-2xl font-bold tracking-tight">Manage Blocks</h1>
                    <p className="text-muted-foreground">
                        Select a year level to manage student blocks, schedules, and class lists.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {yearLevelsConfig.map(yearLevel => (
                        <Link href={`/admin/dashboard/manage-blocks/${yearLevel.value}`} key={yearLevel.value} className="flex">
                            <Card className="w-full flex flex-col hover:border-primary transition-colors hover:bg-primary/5 rounded-xl">
                                <CardHeader className="flex flex-row items-start justify-between">
                                    <div className="space-y-1.5">
                                        <CardTitle>
                                            {yearLevel.label}
                                            {yearLevel.courseSummary ? (
                                                <span className="ml-2 text-sm font-medium text-muted-foreground">• {yearLevel.courseSummary}</span>
                                            ) : null}
                                        </CardTitle>
                                        <CardDescription>
                                            {yearLevel.description}
                                        </CardDescription>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>

                <Card className="rounded-xl">
                    <CardHeader>
                        <CardTitle>Recently Created Blocks</CardTitle>
                        <CardDescription>
                            A list of the most recently added blocks.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Block Name</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Year Level</TableHead>
                                    <TableHead className="text-right">Enrollment</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentBlocks.length > 0 ? (
                                    recentBlocks.map(block => (
                                        <TableRow key={block.id}>
                                            <TableCell className="font-medium">
                                                {block.specialization ? `${block.name} (${block.specialization})` : block.name}
                                            </TableCell>
                                            <TableCell>{block.course}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{block.yearLabel}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{block.enrolled}/{block.capacity}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
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
