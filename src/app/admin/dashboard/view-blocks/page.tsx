'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
    const totalAvailable = Math.max(totalCapacity - totalEnrolled, 0);
    const totalBlocks = blocks.length;

    const courseBreakdown = useMemo(() => {
        return blocks.reduce<Record<string, number>>((acc, block) => {
            acc[block.course] = (acc[block.course] ?? 0) + block.enrolled;
            return acc;
        }, {});
    }, [blocks]);

    return (
        <main className="flex-1 space-y-6 p-4 sm:p-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Blocks &amp; Schedules (Read-Only)</h1>
                <p className="text-muted-foreground">Review current block assignments, capacities, and scheduled subjects.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="rounded-xl">
                    <CardHeader className="space-y-1">
                        <CardDescription>Total Blocks</CardDescription>
                        <CardTitle className="text-3xl">{totalBlocks}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="rounded-xl">
                    <CardHeader className="space-y-1">
                        <CardDescription>Overall Capacity</CardDescription>
                        <CardTitle className="text-3xl">{totalCapacity.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="rounded-xl">
                    <CardHeader className="space-y-1">
                        <CardDescription>Currently Enrolled</CardDescription>
                        <CardTitle className="text-3xl">{totalEnrolled.toLocaleString()}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs uppercase text-muted-foreground">Utilization</p>
                        <div className="flex items-center gap-3">
                            <Progress value={totalCapacity === 0 ? 0 : (totalEnrolled / totalCapacity) * 100} className="h-2 flex-1" />
                            <span className="text-sm font-semibold">
                                {totalCapacity === 0 ? '0%' : `${Math.round((totalEnrolled / totalCapacity) * 100)}%`}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="rounded-xl">
                    <CardHeader className="space-y-1">
                        <CardDescription>Open Seats</CardDescription>
                        <CardTitle className="text-3xl">{totalAvailable.toLocaleString()}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <div className="space-y-6">
                <div className="rounded-2xl border shadow-sm">
                    <div className="grid grid-cols-12 gap-4 bg-muted/40 p-4 text-xs font-semibold uppercase text-muted-foreground">
                        <span className="col-span-3">Block</span>
                        <span className="col-span-2">Course / Level</span>
                        <span className="col-span-2">Capacity</span>
                        <span className="col-span-2">Enrolled</span>
                        <span className="col-span-3">Utilization</span>
                    </div>
                    <div className="divide-y">
                        {sortedBlocks.map((block) => {
                            const utilization = block.capacity === 0 ? 0 : (block.enrolled / block.capacity) * 100;
                            return (
                                <div key={block.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/30">
                                    <div className="col-span-3 space-y-1">
                                        <p className="text-base font-semibold">{block.name}</p>
                                        <p className="text-xs text-muted-foreground">Moderator snapshot • Registrar maintains updates</p>
                                    </div>
                                    <div className="col-span-2 flex flex-col gap-1 text-sm">
                                        <span className="font-medium">{block.course}</span>
                                        <span className="text-muted-foreground">{block.year}{block.specialization ? ` · ${block.specialization}` : ''}</span>
                                    </div>
                                    <div className="col-span-2 text-sm">
                                        <p className="font-semibold">{block.capacity.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">Total seats</p>
                                    </div>
                                    <div className="col-span-2 text-sm">
                                        <p className="font-semibold">{block.enrolled.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">Currently enrolled</p>
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                        <Progress value={utilization} className="h-2" />
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{Math.round(utilization)}%</span>
                                            <span>{block.capacity - block.enrolled} seats open</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                {sortedBlocks.map((block) => {
                    const blockSchedules = [...(schedules[block.name] ?? [])].sort((a, b) => {
                        const dayDelta = (dayOrder[a.day] ?? 7) - (dayOrder[b.day] ?? 7);
                        if (dayDelta !== 0) return dayDelta;
                        return a.startTime.localeCompare(b.startTime);
                    });

                    return (
                        <Card key={`${block.id}-schedules`} className="rounded-xl h-full flex flex-col">
                            <CardHeader>
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <CardTitle className="text-xl">{block.name}</CardTitle>
                                            <Badge variant="secondary">{block.course}</Badge>
                                            <Badge variant="outline">{block.year}</Badge>
                                            {block.specialization && (
                                                <Badge variant="outline">{block.specialization}</Badge>
                                            )}
                                        </div>
                                        <CardDescription>
                                            Moderator snapshot • updates handled by Registrar Admin
                                        </CardDescription>
                                    </div>
                                    <div className="min-w-[240px] space-y-1">
                                        <div className="flex items-center justify-between text-sm font-medium">
                                            <span>Enrolled</span>
                                            <span>
                                                {block.enrolled}/{block.capacity}
                                            </span>
                                        </div>
                                        <Progress value={block.capacity === 0 ? 0 : (block.enrolled / block.capacity) * 100} className="h-2" />
                                        <p className="text-xs text-muted-foreground">
                                            {block.capacity === 0
                                                ? 'No capacity configured yet.'
                                                : `${Math.min(100, Math.round((block.enrolled / block.capacity) * 100))}% utilization`}
                                        </p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 flex-1">
                                {blockSchedules.length === 0 ? (
                                    <div className="rounded-xl border border-dashed bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                                        No schedule entries found for this block.
                                    </div>
                                ) : (
                                    <div className="rounded-xl border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Subject</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead>Instructor</TableHead>
                                                    <TableHead>Day</TableHead>
                                                    <TableHead>Time</TableHead>
                                                    <TableHead>Room</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {blockSchedules.map((entry) => (
                                                    <TableRow key={`${block.id}-${entry.id}`}>
                                                        <TableCell className="font-semibold">{entry.code}</TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {entry.description || 'N/A'}
                                                        </TableCell>
                                                        <TableCell>{entry.instructor ?? 'Instructor TBA'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                                                                {entry.day}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{entry.startTime} - {entry.endTime}</TableCell>
                                                        <TableCell>{entry.room ?? 'TBD'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
                </div>
            </div>
        </main>
    );
}
