'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdmin } from '../../context/admin-context';

const dayOrder: Record<string, number> = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
};

export default function ViewBlocksPage() {
    const { adminData } = useAdmin();
    const { blocks, schedules } = adminData;

    const sortedBlocks = useMemo(() => {
        return [...blocks].sort((a, b) => a.year.localeCompare(b.year) || a.name.localeCompare(b.name));
    }, [blocks]);

    const totalCapacity = blocks.reduce((total, block) => total + block.capacity, 0);
    const totalEnrolled = blocks.reduce((total, block) => total + block.enrolled, 0);

    return (
        <main className="flex-1 space-y-6 p-4 sm:p-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Blocks &amp; Schedules (Read-Only)</h1>
                <p className="text-muted-foreground">Review current block assignments, capacities, and scheduled subjects.</p>
            </div>

            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>Capacity Snapshot</CardTitle>
                    <CardDescription>Moderator view only. Editing seats or schedules requires an Admin.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-6 text-sm">
                    <div>
                        <p className="font-medium text-muted-foreground">Total Capacity</p>
                        <p className="text-2xl font-semibold">{totalCapacity}</p>
                    </div>
                    <div>
                        <p className="font-medium text-muted-foreground">Currently Enrolled</p>
                        <p className="text-2xl font-semibold">{totalEnrolled}</p>
                    </div>
                    <div>
                        <p className="font-medium text-muted-foreground">Utilization</p>
                        <p className="text-2xl font-semibold">{totalCapacity === 0 ? '0%' : `${Math.round((totalEnrolled / totalCapacity) * 100)}%`}</p>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {sortedBlocks.map((block) => {
                    const blockSchedules = [...(schedules[block.name] ?? [])].sort((a, b) => {
                        const dayDelta = (dayOrder[a.day] ?? 7) - (dayOrder[b.day] ?? 7);
                        if (dayDelta !== 0) return dayDelta;
                        return a.startTime.localeCompare(b.startTime);
                    });

                    return (
                        <Card key={block.id} className="rounded-xl">
                            <CardHeader>
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle>{block.name}</CardTitle>
                                        <CardDescription>
                                            {block.course} · {block.year}{block.specialization ? ` · ${block.specialization}` : ''}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-sm">
                                        <Badge variant="secondary">Capacity: {block.capacity}</Badge>
                                        <Badge variant="outline">Enrolled: {block.enrolled}</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-xl border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Subject</TableHead>
                                                <TableHead>Instructor</TableHead>
                                                <TableHead>Schedule</TableHead>
                                                <TableHead>Room</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {blockSchedules.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                                                        No schedule entries found for this block.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                blockSchedules.map((entry) => (
                                                    <TableRow key={`${block.id}-${entry.id}`}>
                                                        <TableCell className="font-medium">{entry.code}</TableCell>
                                                        <TableCell>{entry.instructor ?? 'Unassigned'}</TableCell>
                                                        <TableCell>
                                                            {entry.day} · {entry.startTime} - {entry.endTime}
                                                        </TableCell>
                                                        <TableCell>{entry.room ?? 'TBD'}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </main>
    );
}
