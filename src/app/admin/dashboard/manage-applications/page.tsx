
'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, MoreHorizontal, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

const pendingApplications = [
    { 
        id: 1, 
        studentId: '2024-1001', 
        name: 'John Doe', 
        course: 'BSIT', 
        year: 2, 
        credentials: {
            birthCertificate: true,
            grades: true,
            goodMoral: false,
        }
    },
    { 
        id: 2, 
        studentId: '2024-1002', 
        name: 'Jane Smith', 
        course: 'ACT', 
        year: 1, 
        credentials: {
            birthCertificate: true,
            grades: false,
            goodMoral: true,
        }
    },
    { 
        id: 3, 
        studentId: '2024-1003', 
        name: 'Peter Jones', 
        course: 'BSIT', 
        year: 1, 
        credentials: {
            birthCertificate: true,
            grades: true,
            goodMoral: true,
        }
    },
];

const rejectionReasons = [
    { id: 'incomplete_docs', label: 'Incomplete or missing documents.' },
    { id: 'not_qualified', label: 'Does not meet the minimum qualifications.' },
    { id: 'slots_full', label: 'All available slots for the course are filled.' },
];

type Application = typeof pendingApplications[0];

export default function ManageApplicationsPage() {
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [rejectionDialog, setRejectionDialog] = useState<{ isOpen: boolean; application: Application | null }>({
    isOpen: false,
    application: null,
  });

  const credentialLabels: { key: keyof Application['credentials']; label: string }[] = [
    { key: 'birthCertificate', label: 'Birth Certificate' },
    { key: 'grades', label: 'Form 138 / Report Card' },
    { key: 'goodMoral', label: 'Good Moral Certificate' },
  ];

  const handleOpenRejectionDialog = (application: Application) => {
    setSelectedApplication(null); // Close the credentials dialog if it's open
    setRejectionDialog({ isOpen: true, application });
  };

  const handleCloseRejectionDialog = () => {
    setRejectionDialog({ isOpen: false, application: null });
  }

  return (
    <>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Link href="/admin/dashboard" className="hover:text-foreground">Admin</Link>
                  <ChevronRight className="h-4 w-4" />
                  <Link href="/admin/dashboard/manage-enrollment" className="hover:text-foreground">Manage Enrollment</Link>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-foreground">Manage Applications</span>
                </div>
            </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Applications</CardTitle>
                    <CardDescription>Review and process student applications. 'Pending' is the default view.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="pending" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="pending">Pending</TabsTrigger>
                            <TabsTrigger value="approved">Approved</TabsTrigger>
                            <TabsTrigger value="rejected">Rejected</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending">
                            <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle>Pending Applications</CardTitle>
                                    <CardDescription>Applications awaiting review.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student ID</TableHead>
                                                <TableHead>Student Name</TableHead>
                                                <TableHead>Course</TableHead>
                                                <TableHead>Year</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingApplications.map((application) => (
                                                <TableRow key={application.id}>
                                                    <TableCell>{application.studentId}</TableCell>
                                                    <TableCell className="font-medium">{application.name}</TableCell>
                                                    <TableCell>{application.course}</TableCell>
                                                    <TableCell>{application.year}</TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <span className="sr-only">Open menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem onSelect={() => setSelectedApplication(application)}>
                                                                    View Credentials
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem>Approve</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleOpenRejectionDialog(application)}>
                                                                    Reject
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="approved">
                             <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle>Approved Applications</CardTitle>
                                    <CardDescription>Applications that have been approved.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p>Approved application content will be displayed here.</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="rejected">
                             <Card className="mt-4">
                                <CardHeader>
                                    <CardTitle>Rejected Applications</CardTitle>
                                    <CardDescription>Applications that have been rejected.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p>Rejected application content will be displayed here.</p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </main>
        
        {selectedApplication && (
            <Dialog open={!!selectedApplication} onOpenChange={(open) => !open && setSelectedApplication(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Student Credentials</DialogTitle>
                        <DialogDescription>Review the submitted documents for this applicant.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <p className="text-sm font-medium text-right col-span-1">Name</p>
                            <p className="col-span-3 text-sm">{selectedApplication.name}</p>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                             <p className="text-sm font-medium text-right col-span-1">Course</p>
                            <p className="col-span-3 text-sm">{selectedApplication.course} {selectedApplication.year}</p>
                        </div>
                        <div className="space-y-3 mt-4">
                            {credentialLabels.map(({ key, label }) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-sm">{label}</span>
                                    {selectedApplication.credentials[key] ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-red-500" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="destructive" onClick={() => handleOpenRejectionDialog(selectedApplication)}>Reject</Button>
                        <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={() => setSelectedApplication(null)}>Approve</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}

        {rejectionDialog.isOpen && rejectionDialog.application && (
            <Dialog open={rejectionDialog.isOpen} onOpenChange={(open) => !open && handleCloseRejectionDialog()}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject Application</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejecting the application for <span className="font-semibold">{rejectionDialog.application.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label>Select a reason:</Label>
                        <RadioGroup defaultValue={rejectionReasons[0].id}>
                            {rejectionReasons.map((reason) => (
                                <div key={reason.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={reason.id} id={reason.id} />
                                    <Label htmlFor={reason.id}>{reason.label}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="custom-reason">Or provide a custom reason:</Label>
                            <Textarea placeholder="Type your message here." id="custom-reason" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseRejectionDialog}>Cancel</Button>
                        <Button variant="destructive" onClick={handleCloseRejectionDialog}>Confirm Rejection</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
    </>
  );
}
