
'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const mockClassmates = [
    { id: '2022-0234', name: 'Bob Williams', avatar: 'https://picsum.photos/seed/bw-student/40/40' },
    { id: '2022-0456', name: 'Samantha Green', avatar: 'https://picsum.photos/seed/sg-student/40/40' },
    { id: '2022-0789', name: 'Michael Chen', avatar: 'https://picsum.photos/seed/mc-student/40/40' },
    { id: '2022-1111', name: 'Emily Davis', avatar: 'https://picsum.photos/seed/ed-student/40/40' },
     { id: '2022-0001', name: 'You', avatar: 'https://picsum.photos/seed/student-avatar/40/40' },
];


export default function StudentDashboardPage() {
  const [isEnrolled, setIsEnrolled] = useState(true);
  const [isClassmatesDialogOpen, setIsClassmatesDialogOpen] = useState(false);

  return (
    <main className="flex-1 p-4 sm:p-6">
        <div className="space-y-4">
            <h1 className="text-2xl font-bold tracking-tight">Welcome, Student!</h1>
            {isEnrolled && (
                 <p className="text-muted-foreground">
                    Here's a summary of your current academic status.
                </p>
            )}
            {!isEnrolled && (
                 <p className="text-muted-foreground">
                    It looks like you haven't enrolled yet. Please complete your enrollment to access all features.
                </p>
            )}
        </div>

        {!isEnrolled && (
            <Alert className="mt-6 border-accent rounded-xl">
                <Info className="h-4 w-4" />
                <AlertTitle>Important Notice</AlertTitle>
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    You are not yet officially enrolled for the current academic year. Please proceed to the enrollment page to complete the process.
                    <Button asChild variant="accent" className="mt-2 sm:mt-0 rounded-xl">
                        <Link href="/student/dashboard/enrollment">Go to Enrollment</Link>
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>Enrollment Status</CardTitle>
                    <CardDescription>Your current enrollment details.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isEnrolled ? (
                        <>
                            <p className="font-semibold text-green-500">Enrolled</p>
                            <p className="text-sm text-muted-foreground">A.Y. 2024-2025, 1st Semester</p>
                        </>
                    ) : (
                         <p className="font-semibold text-destructive">Not Enrolled</p>
                    )}
                </CardContent>
            </Card>
             <Card className="rounded-xl flex flex-col">
                <CardHeader>
                    <CardTitle>Current Block</CardTitle>
                    <CardDescription>Your assigned section.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                     {isEnrolled ? (
                        <p className="font-semibold">BSIT 2-A</p>
                    ) : (
                        <p className="text-sm text-muted-foreground">N/A</p>
                    )}
                </CardContent>
                {isEnrolled && (
                    <CardFooter>
                         <Dialog open={isClassmatesDialogOpen} onOpenChange={setIsClassmatesDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full">
                                    <Users className="mr-2 h-4 w-4" />
                                    View Classmates
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Classmates in BSIT 2-A</DialogTitle>
                                    <DialogDescription>
                                        List of all students enrolled in this block.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="max-h-[60vh] overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student Name</TableHead>
                                                <TableHead>Student ID</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {mockClassmates.sort((a, b) => a.name.localeCompare(b.name)).map(student => (
                                                <TableRow key={student.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person avatar"/>
                                                                <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium">{student.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{student.id}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsClassmatesDialogOpen(false)}>Close</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </CardFooter>
                )}
            </Card>
            <Card className="rounded-xl">
                <CardHeader>
                    <CardTitle>Announcements</CardTitle>
                    <CardDescription>Latest news and updates.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm">Midterm examinations are next week. Good luck!</p>
                </CardContent>
            </Card>
        </div>
    </main>
  );
}
