
'use client';
import React, { useState, useMemo } from 'react';
import { MoreHorizontal, CheckCircle2, XCircle, Pencil, X, RotateCw, Trash2, Search, FilterX, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAdmin, Application, credentialLabels, rejectionReasons } from '../../context/admin-context';


export default function ManageApplicationsPage() {
  const { adminData, setAdminData } = useAdmin();
  const { pendingApplications, approvedApplications, rejectedApplications } = adminData;

  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [rejectionDialog, setRejectionDialog] = useState<{ isOpen: boolean; application: Application | null }>({
    isOpen: false,
    application: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; application: Application | null }>({
      isOpen: false,
      application: null,
  });
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(true);

  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
      course: 'all',
      year: 'all',
      status: 'all',
  });

  const handleOpenRejectionDialog = (application: Application) => {
    setRejectionDialog({ isOpen: true, application });
  };

  const handleCloseRejectionDialog = () => {
    setRejectionDialog({ isOpen: false, application: null });
  };

  const handleApprove = (application: Application) => {
    setAdminData(prev => ({
        ...prev,
        pendingApplications: prev.pendingApplications.filter(app => app.id !== application.id),
        approvedApplications: [...prev.approvedApplications, application]
    }));
    setSelectedApplication(null);
  };

  const handleReject = (application: Application, reason: string) => {
    const isApproved = approvedApplications.find(app => app.id === application.id);
    const updatedRejected = [...rejectedApplications, { ...application, rejectionReason: reason }];
    
    if (isApproved) {
        setAdminData(prev => ({
            ...prev,
            approvedApplications: prev.approvedApplications.filter(app => app.id !== application.id),
            rejectedApplications: updatedRejected
        }));
    } else {
        setAdminData(prev => ({
            ...prev,
            pendingApplications: prev.pendingApplications.filter(app => app.id !== application.id),
            rejectedApplications: updatedRejected
        }));
    }
    handleCloseRejectionDialog();
    setSelectedApplication(null);
  };
  
  const handleRetrieve = (application: Application) => {
    const { rejectionReason, ...rest } = application;
    setAdminData(prev => ({
        ...prev,
        rejectedApplications: prev.rejectedApplications.filter(app => app.id !== application.id),
        pendingApplications: [...prev.pendingApplications, rest]
    }));
  };

  const handleDelete = (application: Application) => {
    setAdminData(prev => ({
        ...prev,
        rejectedApplications: prev.rejectedApplications.filter(app => app.id !== application.id)
    }));
    setDeleteDialog({ isOpen: false, application: null });
  };
  
  const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const clearFilters = () => {
      setSearchTerm('');
      setFilters({ course: 'all', year: 'all', status: 'all' });
  };

  const filteredApplications = useMemo(() => {
        let applications: Application[] = [];
        if (activeTab === 'pending') applications = pendingApplications;
        else if (activeTab === 'approved') applications = approvedApplications;
        else if (activeTab === 'rejected') applications = rejectedApplications;

        return applications.filter(app => {
            const searchTermLower = searchTerm.toLowerCase();
            const matchesSearch = searchTerm ? 
                app.name.toLowerCase().includes(searchTermLower) || 
                app.studentId.toLowerCase().includes(searchTermLower) : true;
            
            const matchesCourse = filters.course !== 'all' ? app.course === filters.course : true;
            const matchesYear = filters.year !== 'all' ? app.year.toString() === filters.year : true;
            const matchesStatus = filters.status !== 'all' ? app.status === filters.status : true;

            return matchesSearch && matchesCourse && matchesYear && matchesStatus;
        });
    }, [activeTab, pendingApplications, approvedApplications, rejectedApplications, searchTerm, filters]);

  const allAppsForFilters = [...pendingApplications, ...approvedApplications, ...rejectedApplications];
  const courses = ['all', ...Array.from(new Set(allAppsForFilters.map(app => app.course)))];
  const years = ['all', ...Array.from(new Set(allAppsForFilters.map(app => app.year.toString())))].sort();
  const statuses = ['all', ...Array.from(new Set(allAppsForFilters.map(app => app.status)))];
  const isFiltered = searchTerm || filters.course !== 'all' || filters.year !== 'all' || filters.status !== 'all';

  return (
    <>
        <main className="flex-1 p-4 sm:p-6 space-y-6">
             <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">Manage Applications</h1>
                    <p className="text-muted-foreground">
                        Review, approve, and reject applications for enrollment.
                    </p>
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch 
                        id="enrollment-status" 
                        checked={isEnrollmentOpen} 
                        onCheckedChange={setIsEnrollmentOpen}
                        className="data-[state=checked]:bg-accent"
                    />
                    <Label htmlFor="enrollment-status" className="text-sm font-medium">
                        {isEnrollmentOpen ? 'Enrollment Open' : 'Enrollment Closed'}
                    </Label>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                         <div className="relative flex-1 md:grow-0">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name or ID..."
                                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[240px]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="gap-2 text-muted-foreground border-dashed hover:border-accent hover:text-accent focus:text-accent focus:border-accent focus:ring-accent">
                                        <Filter className="h-4 w-4" />
                                        Filter
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4" align="end">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label>Course</Label>
                                            <Select value={filters.course} onValueChange={(value) => handleFilterChange('course', value)}>
                                                <SelectTrigger className="focus:border-accent focus:ring-accent">
                                                    <SelectValue placeholder="All Courses" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {courses.map(course => <SelectItem key={course} value={course}>{course === 'all' ? 'All Courses' : course}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Year</Label>
                                            <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
                                                <SelectTrigger className="focus:border-accent focus:ring-accent">
                                                    <SelectValue placeholder="All Years" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {years.map(year => <SelectItem key={year} value={year}>{year === 'all' ? 'All Years' : `Year ${year}`}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Status</Label>
                                            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                                                <SelectTrigger className="focus:border-accent focus:ring-accent">
                                                    <SelectValue placeholder="All Statuses" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {statuses.map(status => <SelectItem key={status} value={status}>{status === 'all' ? 'All Statuses' : status}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {isFiltered && (
                                            <Button variant="ghost" onClick={clearFilters} className="h-10 justify-center">
                                                <FilterX className="mr-2 h-4 w-4" />
                                                Clear Filters
                                            </Button>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="pending">Pending</TabsTrigger>
                            <TabsTrigger value="approved">Approved</TabsTrigger>
                            <TabsTrigger value="rejected">Rejected</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending">
                            <div className="border rounded-lg mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student ID</TableHead>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Course</TableHead>
                                            <TableHead>Year</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredApplications.map((application) => (
                                            <TableRow key={application.id}>
                                                <TableCell>{application.studentId}</TableCell>
                                                <TableCell className="font-medium">{application.name}</TableCell>
                                                <TableCell>{application.course}</TableCell>
                                                <TableCell>{application.year}</TableCell>
                                                <TableCell>{application.status}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-accent focus-visible:ring-0 focus-visible:ring-offset-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => setSelectedApplication(application)}>
                                                                View Credentials
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onSelect={() => handleApprove(application)}>Approve</DropdownMenuItem>
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
                                 {filteredApplications.length === 0 && (
                                    <div className="text-center p-4 text-muted-foreground">
                                        No pending applications match the current filters.
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="approved">
                             <div className="border rounded-lg mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student ID</TableHead>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Course</TableHead>
                                            <TableHead>Year</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredApplications.map((application) => (
                                            <TableRow key={application.id}>
                                                <TableCell>{application.studentId}</TableCell>
                                                <TableCell className="font-medium">{application.name}</TableCell>
                                                <TableCell>{application.course}</TableCell>
                                                <TableCell>{application.year}</TableCell>
                                                <TableCell>{application.status}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-accent focus-visible:ring-0 focus-visible:ring-offset-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>
                                                                <Pencil className="mr-2 h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onSelect={() => handleOpenRejectionDialog(application)}>
                                                                <X className="mr-2 h-4 w-4" />
                                                                Reject
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredApplications.length === 0 && (
                                    <div className="text-center p-4 text-muted-foreground">
                                        No approved applications match the current filters.
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="rejected">
                             <div className="border rounded-lg mt-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student ID</TableHead>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Course</TableHead>
                                            <TableHead>Year</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredApplications.map((application) => (
                                            <TableRow key={application.id}>
                                                <TableCell>{application.studentId}</TableCell>
                                                <TableCell className="font-medium">{application.name}</TableCell>
                                                <TableCell>{application.course}</TableCell>
                                                <TableCell>{application.year}</TableCell>
                                                 <TableCell>{application.status}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-accent focus-visible:ring-0 focus-visible:ring-offset-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => setSelectedApplication(application)}>
                                                                View Credentials
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handleRetrieve(application)}>
                                                                <RotateCw className="mr-2 h-4 w-4" />
                                                                Retrieve
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                                onSelect={() => setDeleteDialog({ isOpen: true, application })}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Permanently Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredApplications.length === 0 && (
                                    <div className="text-center p-4 text-muted-foreground">
                                        No rejected applications match the current filters.
                                    </div>
                                )}
                            </div>
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
                        <div className="grid grid-cols-4 items-center gap-4">
                                <p className="text-sm font-medium text-right col-span-1">Status</p>
                            <p className="col-span-3 text-sm">
                                {selectedApplication.status}
                            </p>
                        </div>
                         {selectedApplication.rejectionReason && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <p className="text-sm font-medium text-right col-span-1">Reason</p>
                                <p className="col-span-3 text-sm text-destructive">{selectedApplication.rejectionReason}</p>
                            </div>
                        )}
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
                        <Button variant="destructive" onClick={() => {
                            if (selectedApplication) {
                                handleOpenRejectionDialog(selectedApplication);
                            }
                        }}>Reject</Button>
                        <Button className="bg-green-500 hover:bg-green-600 text-white" onClick={() => {
                             if (selectedApplication) {
                                handleApprove(selectedApplication);
                            }
                        }}>Approve</Button>
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
                    <form id="rejection-form" onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const reasonId = formData.get('rejection-reason') as string;
                        const customReason = formData.get('custom-reason') as string;
                        const reason = customReason || rejectionReasons.find(r => r.id === reasonId)?.label || 'No reason provided.';
                        if(rejectionDialog.application) {
                            handleReject(rejectionDialog.application, reason);
                        }
                    }}>
                        <div className="grid gap-4 py-4">
                            <Label>Select a reason:</Label>
                            <RadioGroup name="rejection-reason" defaultValue={rejectionReasons[0].id}>
                                {rejectionReasons.map((reason) => (
                                    <div key={reason.id} className="flex items-center space-x-2">
                                        <RadioGroupItem value={reason.id} id={reason.id} />
                                        <Label htmlFor={reason.id}>{reason.label}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                            <div className="grid w-full gap-1.5">
                                <Label htmlFor="custom-reason">Or provide a custom reason:</Label>
                                <Textarea placeholder="Type your message here." id="custom-reason" name="custom-reason" />
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseRejectionDialog}>Cancel</Button>
                        <Button variant="destructive" type="submit" form="rejection-form">Confirm Rejection</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
        
        {deleteDialog.isOpen && deleteDialog.application && (
            <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, application: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the application for <span className="font-semibold">{deleteDialog.application.name}</span>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 text-white hover:bg-red-700"
                            onClick={() => handleDelete(deleteDialog.application!)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}

    </>
  );
}
