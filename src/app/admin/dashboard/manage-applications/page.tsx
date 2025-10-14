
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { MoreHorizontal, CheckCircle2, XCircle, Pencil, X, RotateCw, Trash2, Search, FilterX, Filter, PlusCircle, UserPlus, AlertTriangle } from 'lucide-react';
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
    DialogTrigger,
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
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Student, Subject } from '../../context/admin-context';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const UNITS_FOR_2ND_YEAR = 36;
const UNITS_FOR_3RD_YEAR = 72;
const UNITS_FOR_4TH_YEAR = 108;


export default function ManageApplicationsPage() {
  const { adminData, setAdminData } = useAdmin();
  const { pendingApplications, approvedApplications, rejectedApplications, enrolledApplications, blocks, subjects: yearLevelSubjects, students } = adminData;
  const { toast } = useToast();

  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [rejectionDialog, setRejectionDialog] = useState<{ isOpen: boolean; application: Application | null }>({
    isOpen: false,
    application: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; application: Application | null }>({
      isOpen: false,
      application: null,
  });
    const [isDirectEnrollOpen, setIsDirectEnrollOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
      course: 'all',
      year: 'all',
      status: 'all',
  });

  // Enrollment Dialog State
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [applicationToEnroll, setApplicationToEnroll] = useState<Application | null>(null);
  const [enrollBlock, setEnrollBlock] = useState('');
  const [enlistedSubjects, setEnlistedSubjects] = useState<Subject[]>([]);

    // Direct Enroll State
    const [directEnrollStep, setDirectEnrollStep] = useState(1);
    const [directEnrollSearchId, setDirectEnrollSearchId] = useState('');
    const [foundStudent, setFoundStudent] = useState<Student | null>(null);
    const [directEnrollBlock, setDirectEnrollBlock] = useState('');
    const [directEnlistedSubjects, setDirectEnlistedSubjects] = useState<Subject[]>([]);

    const completedSubjectsForFoundStudent = useMemo(() => {
        if (!foundStudent) return [];
        return adminData.getCompletedSubjects(foundStudent.studentId);
    }, [adminData, foundStudent]);

    const totalUnitsForFoundStudent = useMemo(() => {
        return completedSubjectsForFoundStudent.reduce((acc, subj) => acc + subj.units, 0);
    }, [completedSubjectsForFoundStudent]);
    
    const handleDirectEnrollSearch = () => {
        const student = students.find(s => s.studentId === directEnrollSearchId && s.status !== 'Enrolled');
        if (student) {
            setFoundStudent(student);
            setDirectEnrollStep(2);
        } else {
            toast({
                variant: 'destructive',
                title: 'Student Not Found',
                description: 'No unenrolled student found with that ID. Please check the ID or their enrollment status.',
            });
        }
    };

    const resetDirectEnroll = () => {
        setIsDirectEnrollOpen(false);
        setTimeout(() => {
            setDirectEnrollStep(1);
            setDirectEnrollSearchId('');
            setFoundStudent(null);
            setDirectEnrollBlock('');
            setDirectEnlistedSubjects([]);
        }, 300);
    };

    const handleDirectEnrollSubmit = () => {
        if (!foundStudent || !directEnrollBlock) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a block.' });
            return;
        }
        
        const updatedStudent: Student = {
            ...foundStudent,
            status: 'Enrolled',
            block: directEnrollBlock,
            enlistedSubjects: directEnlistedSubjects,
        };

        setAdminData(prev => {
            const updatedStudents = prev.students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
            const updatedBlocks = prev.blocks.map(b => 
                b.name === directEnrollBlock ? { ...b, enrolled: b.enrolled + 1 } : b
            );
            return {
                ...prev,
                students: updatedStudents,
                blocks: updatedBlocks,
            };
        });

        toast({
            title: 'Enrollment Successful',
            description: `${foundStudent.name} has been directly enrolled in block ${directEnrollBlock}.`,
        });
        
        resetDirectEnroll();
    };

     const availableBlocksForDirectEnroll = useMemo(() => {
        if (!foundStudent) return [];
        let yearKey: '1st-year' | '2nd-year' | '3rd-year' | '4th-year' = '1st-year';
        if (foundStudent.year === 1) yearKey = '1st-year';
        else if (foundStudent.year === 2) yearKey = '2nd-year';
        else if (foundStudent.year === 3) yearKey = '3rd-year';
        else if (foundStudent.year === 4) yearKey = '4th-year';
        return blocks.filter(b => b.year === yearKey);
    }, [blocks, foundStudent]);

    const availableSubjectsForDirectEnroll = useMemo(() => {
        if (!foundStudent) return [];
        let yearKey: '1st-year' | '2nd-year' | '3rd-year' | '4th-year' = '1st-year';
        if (foundStudent.year === 1) yearKey = '1st-year';
        else if (foundStudent.year === 2) yearKey = '2nd-year';
        else if (foundStudent.year === 3) yearKey = '3rd-year';
        else if (foundStudent.year === 4) yearKey = '4th-year';
        return yearLevelSubjects[yearKey] || [];
    }, [yearLevelSubjects, foundStudent]);


    const completedSubjectsForEnrollment = useMemo(() => {
        if (!applicationToEnroll) return [];
        return adminData.getCompletedSubjects(applicationToEnroll.studentId);
    }, [adminData, applicationToEnroll]);


  const availableBlocksForEnrollment = useMemo(() => {
    if (!applicationToEnroll) return [];
    let yearKey: '1st-year' | '2nd-year' | '3rd-year' | '4th-year' = '1st-year';
    if (applicationToEnroll.year === 1) yearKey = '1st-year';
    if (applicationToEnroll.year === 2) yearKey = '2nd-year';
    if (applicationToEnroll.year === 3) yearKey = '3rd-year';
    if (applicationToEnroll.year === 4) yearKey = '4th-year';
    return blocks.filter(b => b.year === yearKey);
  }, [blocks, applicationToEnroll]);

  const availableSubjectsForEnrollment = useMemo(() => {
    if (!applicationToEnroll) return [];
    
    let yearKey: '1st-year' | '2nd-year' | '3rd-year' | '4th-year' = '1st-year';
    if (applicationToEnroll.year === 1) yearKey = '1st-year';
    if (applicationToEnroll.year === 2) yearKey = '2nd-year';
    if (applicationToEnroll.year === 3) yearKey = '3rd-year';
    if (applicationToEnroll.year === 4) yearKey = '4th-year';

    return yearLevelSubjects[yearKey] || [];
  }, [yearLevelSubjects, applicationToEnroll]);

  const openEnrollDialog = (application: Application) => {
    setApplicationToEnroll(application);
    setIsEnrollDialogOpen(true);
  };

  useEffect(() => {
    setEnrollBlock('');
  }, [applicationToEnroll]);

  useEffect(() => {
    setEnlistedSubjects([]);
  }, [enrollBlock]);


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
    setDeleteInput('');
  };
  
  const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const clearFilters = () => {
      setSearchTerm('');
      setFilters({ course: 'all', year: 'all', status: 'all' });
  };

  const handleEnroll = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!applicationToEnroll || !enrollBlock) {
        toast({
            variant: 'destructive',
            title: 'Enrollment Failed',
            description: 'Please select a valid block.',
        });
        return;
    }

    const newStudent: Student = {
        id: applicationToEnroll.id, // Re-use ID for simplicity, or generate new
        studentId: applicationToEnroll.studentId,
        name: applicationToEnroll.name,
        avatar: `https://picsum.photos/seed/${applicationToEnroll.id}/40/40`,
        email: `${applicationToEnroll.name.toLowerCase().replace(' ', '.')}@example.com`,
        course: applicationToEnroll.course as 'BSIT' | 'ACT',
        year: applicationToEnroll.year,
        status: 'Enrolled',
        block: enrollBlock,
        enlistedSubjects: enlistedSubjects,
        sex: 'Male', // Default, should be from application data if available
        phoneNumber: '09' + Math.floor(100000000 + Math.random() * 900000000), // Placeholder
    };

    setAdminData(prev => {
        const updatedStudents = [...prev.students, newStudent];
        const updatedBlocks = prev.blocks.map(b => 
            b.name === enrollBlock ? { ...b, enrolled: b.enrolled + 1 } : b
        );
        return {
            ...prev,
            approvedApplications: prev.approvedApplications.filter(app => app.id !== applicationToEnroll.id),
            enrolledApplications: [...prev.enrolledApplications, applicationToEnroll],
            students: updatedStudents,
            blocks: updatedBlocks,
        };
    });

    toast({
        title: 'Enrollment Successful',
        description: `${applicationToEnroll.name} has been enrolled in block ${enrollBlock}.`,
    });

    setIsEnrollDialogOpen(false);
    setApplicationToEnroll(null);
  };


  const filteredApplications = useMemo(() => {
        let applications: Application[] = [];
        if (activeTab === 'pending') applications = pendingApplications;
        else if (activeTab === 'approved') applications = approvedApplications;
        else if (activeTab === 'rejected') applications = rejectedApplications;
        else if (activeTab === 'enrolled') applications = enrolledApplications;

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
    }, [activeTab, pendingApplications, approvedApplications, rejectedApplications, enrolledApplications, searchTerm, filters]);

  const allAppsForFilters = [...pendingApplications, ...approvedApplications, ...rejectedApplications, ...enrolledApplications];
  const courses = ['all', ...Array.from(new Set(allAppsForFilters.map(app => app.course)))];
  const years = ['all', ...Array.from(new Set(allAppsForFilters.map(app => app.year.toString())))].sort();
  const statuses = ['all', ...Array.from(new Set(allAppsForFilters.map(app => app.status)))];
  const isFiltered = searchTerm || filters.course !== 'all' || filters.year !== 'all' || filters.status !== 'all';

  const SubjectCheckbox = ({ subject, checked, onCheckedChange, completedSubjects }: { subject: Subject; checked: boolean; onCheckedChange: (checked: boolean) => void; completedSubjects: { code: string, units: number }[] }) => {
    const prerequisite = subject.prerequisite;
    const hasPassedPrerequisite = !prerequisite || completedSubjects.some(cs => cs.code === prerequisite);

    const checkbox = (
        <Checkbox
            id={`dir-sub-${subject.id}`}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={!hasPassedPrerequisite}
        />
    );

    if (hasPassedPrerequisite) {
        return checkbox;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span>{checkbox}</span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Prerequisite not met: {prerequisite}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

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
                 <Dialog open={isDirectEnrollOpen} onOpenChange={setIsDirectEnrollOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Direct Enroll Student
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-xl sm:max-w-lg">
                        {directEnrollStep === 1 && (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Direct Enrollment: Find Student</DialogTitle>
                                    <DialogDescription>
                                        Enter the Student ID of the student you want to enroll. Only unenrolled students can be found.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="studentId-search">Student ID</Label>
                                        <Input
                                            id="studentId-search"
                                            value={directEnrollSearchId}
                                            onChange={(e) => setDirectEnrollSearchId(e.target.value)}
                                            className="rounded-xl"
                                            placeholder="e.g., 23-00-0456"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={resetDirectEnroll} className="rounded-xl">Cancel</Button>
                                    <Button onClick={handleDirectEnrollSearch} className="rounded-xl">Find Student</Button>
                                </DialogFooter>
                            </>
                        )}
                        {directEnrollStep === 2 && foundStudent && (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Direct Enrollment: Assign Block & Subjects</DialogTitle>
                                    <DialogDescription>
                                        Assign a block and subjects for {foundStudent.name}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-4">
                                    <Card className="p-4 rounded-xl bg-secondary/50 border-none">
                                        <div className="flex items-start gap-4">
                                            <Avatar className="h-16 w-16">
                                                <AvatarImage src={foundStudent.avatar} alt={foundStudent.name} />
                                                <AvatarFallback>{foundStudent.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="grid gap-0.5 text-sm">
                                                <p className="font-semibold text-base">{foundStudent.name}</p>
                                                <p><span className="text-muted-foreground">Email:</span> {foundStudent.email}</p>
                                                <p><span className="text-muted-foreground">Phone:</span> {foundStudent.phoneNumber}</p>
                                                <p><span className="text-muted-foreground">Sex:</span> {foundStudent.sex}</p>
                                                <p><span className="text-muted-foreground">Current Level:</span> {foundStudent.course} - {foundStudent.year} Year</p>
                                                 <p><span className="text-muted-foreground">Units Earned:</span> {totalUnitsForFoundStudent}</p>
                                            </div>
                                        </div>
                                    </Card>
                                    <div className="space-y-2">
                                        <Label htmlFor="block">Block</Label>
                                        <Select value={directEnrollBlock} onValueChange={setDirectEnrollBlock} required>
                                            <SelectTrigger id="block" className="rounded-xl"><SelectValue placeholder="Select a block" /></SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {availableBlocksForDirectEnroll.map(b => (
                                                    <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {directEnrollBlock && availableSubjectsForDirectEnroll.length > 0 && (
                                        <div className="space-y-3 mt-4 pt-4 border-t">
                                            <h4 className="font-medium">Enlist Subjects</h4>
                                            <div className="space-y-2">
                                                {availableSubjectsForDirectEnroll.map(subject => (
                                                    <div key={subject.id} className={cn("flex items-center space-x-2 p-2 border rounded-md", !subject.prerequisite || completedSubjectsForFoundStudent.some(cs => cs.code === subject.prerequisite) ? "" : "bg-muted/50")}>
                                                        <SubjectCheckbox
                                                            subject={subject}
                                                            checked={directEnlistedSubjects.some(s => s.id === subject.id)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setDirectEnlistedSubjects(prev => [...prev, subject]);
                                                                } else {
                                                                    setDirectEnlistedSubjects(prev => prev.filter(s => s.id !== subject.id));
                                                                }
                                                            }}
                                                            completedSubjects={completedSubjectsForFoundStudent}
                                                        />
                                                        <Label htmlFor={`dir-sub-${subject.id}`} className={cn("flex-1 font-normal", !(!subject.prerequisite || completedSubjectsForFoundStudent.some(cs => cs.code === subject.prerequisite)) && "text-muted-foreground")}>
                                                            {subject.code} - {subject.description}
                                                        </Label>
                                                        <span className="text-xs text-muted-foreground">{subject.units} units</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter className="sm:justify-start">
                                    <Button variant="outline" onClick={() => setDirectEnrollStep(1)} className="rounded-xl">Back</Button>
                                    <Button onClick={() => setDirectEnrollStep(3)} className="rounded-xl">Review</Button>
                                </DialogFooter>
                            </>
                        )}
                        {directEnrollStep === 3 && foundStudent && (
                             <>
                                <DialogHeader>
                                    <DialogTitle>Review Enrollment</DialogTitle>
                                    <DialogDescription>
                                        Please review the details below before finalizing the enrollment for {foundStudent.name}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6 py-2 max-h-[60vh] overflow-y-auto pr-4">
                                     <Card className="p-4 rounded-xl bg-secondary/50 border-none">
                                        <div className="grid gap-1 text-sm">
                                            <p className="font-semibold text-base">{foundStudent.name}</p>
                                            <p><span className="text-muted-foreground">ID:</span> {foundStudent.studentId}</p>
                                            <p><span className="text-muted-foreground">Course:</span> {foundStudent.course} - {foundStudent.year} Year</p>
                                        </div>
                                    </Card>
                                    <div>
                                        <h4 className="font-semibold mb-2">Enrollment Details</h4>
                                        <div className="grid gap-1 text-sm p-3 border rounded-lg">
                                            <p><span className="text-muted-foreground">Assigned Block:</span> <span className="font-medium">{directEnrollBlock}</span></p>
                                        </div>
                                    </div>
                                     <div>
                                        <h4 className="font-semibold mb-2">Enlisted Subjects ({directEnlistedSubjects.length})</h4>
                                        <div className="border rounded-lg max-h-40 overflow-y-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Code</TableHead>
                                                        <TableHead>Description</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                {directEnlistedSubjects.length > 0 ? directEnlistedSubjects.map(sub => (
                                                    <TableRow key={sub.id}>
                                                        <TableCell>{sub.code}</TableCell>
                                                        <TableCell>{sub.description}</TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow>
                                                        <TableCell colSpan={2} className="text-center">No subjects enlisted.</TableCell>
                                                    </TableRow>
                                                )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setDirectEnrollStep(2)} className="rounded-xl">Back</Button>
                                    <Button onClick={handleDirectEnrollSubmit} className="rounded-xl">Confirm Enrollment</Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
            <Card className="rounded-xl">
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                         <div className="relative flex-1 md:grow-0">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name or ID..."
                                className="w-full rounded-xl bg-background pl-8 md:w-[200px] lg:w-[240px]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-accent focus:text-accent rounded-xl">
                                        <Filter className="h-4 w-4" />
                                        Filter
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4 rounded-xl" align="end">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label>Course</Label>
                                            <Select value={filters.course} onValueChange={(value) => handleFilterChange('course', value)}>
                                                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 rounded-xl">
                                                    <SelectValue placeholder="All Courses" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {courses.map(course => <SelectItem key={course} value={course}>{course === 'all' ? 'All Courses' : course}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Year</Label>
                                            <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
                                                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 rounded-xl">
                                                    <SelectValue placeholder="All Years" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {years.map(year => <SelectItem key={year} value={year}>{year === 'all' ? 'All Years' : `Year ${year}`}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Status</Label>
                                            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                                                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 rounded-xl">
                                                    <SelectValue placeholder="All Statuses" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {statuses.map(status => <SelectItem key={status} value={status}>{status === 'all' ? 'All Statuses' : status}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {isFiltered && (
                                            <Button variant="ghost" onClick={clearFilters} className="h-10 justify-center rounded-xl">
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
                        <TabsList className="grid w-full grid-cols-3 rounded-xl">
                            <TabsTrigger value="pending" className="rounded-lg">Pending</TabsTrigger>
                            <TabsTrigger value="approved" className="rounded-lg">Approved</TabsTrigger>
                            <TabsTrigger value="rejected" className="rounded-lg">Rejected</TabsTrigger>
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
                                                            <DropdownMenuItem onSelect={() => openEnrollDialog(application)}>
                                                                <UserPlus className="mr-2 h-4 w-4" />
                                                                Enroll Student
                                                            </DropdownMenuItem>
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
                                                                onSelect={() => {
                                                                    setDeleteDialog({ isOpen: true, application });
                                                                    setDeleteInput('');
                                                                }}
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
                <DialogContent className="sm:max-w-[425px] rounded-xl">
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
                        <Button variant="destructive" className="rounded-xl" onClick={() => {
                            if (selectedApplication) {
                                handleOpenRejectionDialog(selectedApplication);
                            }
                        }}>Reject</Button>
                        <Button className="bg-green-500 hover:bg-green-600 text-white rounded-xl" onClick={() => {
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
                <DialogContent className="sm:max-w-md rounded-xl">
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
                                <Textarea placeholder="Type your message here." id="custom-reason" name="custom-reason" className="rounded-xl"/>
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseRejectionDialog} className="rounded-xl">Cancel</Button>
                        <Button variant="destructive" type="submit" form="rejection-form" className="rounded-xl">Confirm Rejection</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}

        {isEnrollDialogOpen && applicationToEnroll && (
            <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                <DialogContent className="sm:max-w-lg rounded-xl">
                    <DialogHeader>
                        <DialogTitle>Enroll Student</DialogTitle>
                        <DialogDescription>
                            Assign a block and subjects for {applicationToEnroll.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <form id="enroll-student-form" onSubmit={handleEnroll}>
                        <div className="space-y-4 py-2">
                             <div className="flex items-center gap-4 p-4 border rounded-xl">
                                <Avatar>
                                    <AvatarImage src={`https://picsum.photos/seed/${applicationToEnroll.id}/40/40`} alt={applicationToEnroll.name} />
                                    <AvatarFallback>{applicationToEnroll.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{applicationToEnroll.name}</p>
                                    <p className="text-sm text-muted-foreground">{applicationToEnroll.course} - {applicationToEnroll.year} Year</p>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="block">Block</Label>
                                <Select value={enrollBlock} onValueChange={setEnrollBlock} required>
                                    <SelectTrigger id="block" className="rounded-xl">
                                        <SelectValue placeholder="Select a block" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {availableBlocksForEnrollment.map(b => (
                                            <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {enrollBlock && availableSubjectsForEnrollment.length > 0 && (
                                <div className="space-y-3 mt-4 pt-4 border-t">
                                    <h4 className="font-medium">Enlist Subjects</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                        {availableSubjectsForEnrollment.map(subject => (
                                            <div key={subject.id} className={cn("flex items-center space-x-2 p-2 border rounded-md", !subject.prerequisite || completedSubjectsForEnrollment.some(cs => cs.code === subject.prerequisite) ? "" : "bg-muted/50")}>
                                                <SubjectCheckbox
                                                    subject={subject}
                                                    checked={enlistedSubjects.some(s => s.id === subject.id)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setEnlistedSubjects(prev => [...prev, subject]);
                                                        } else {
                                                            setEnlistedSubjects(prev => prev.filter(s => s.id !== subject.id));
                                                        }
                                                    }}
                                                    completedSubjects={completedSubjectsForEnrollment}
                                                />
                                                <Label htmlFor={`sub-${subject.id}`} className={cn("flex-1 font-normal", !(!subject.prerequisite || completedSubjectsForEnrollment.some(cs => cs.code === subject.prerequisite)) && "text-muted-foreground")}>
                                                    {subject.code} - {subject.description}
                                                </Label>
                                                <span className="text-xs text-muted-foreground">{subject.units} units</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEnrollDialogOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button type="submit" form="enroll-student-form" className="rounded-xl">Confirm Enrollment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
        
        {deleteDialog.isOpen && deleteDialog.application && (
            <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => {
                if (!open) {
                    setDeleteDialog({ isOpen: false, application: null });
                    setDeleteInput('');
                }
            }}>
                <AlertDialogContent className="rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                             This action cannot be undone. This will permanently delete the application for <span className="font-semibold">{deleteDialog.application.name}</span>.
                            <br/><br/>
                            To confirm, please type "delete" below.
                        </AlertDialogDescription>
                         <Input 
                            id="delete-confirm" 
                            name="delete-confirm"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                            className="mt-4 rounded-xl"
                        />
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteInput('')} className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteInput !== 'delete'}
                            className="bg-destructive hover:bg-destructive/90 rounded-xl"
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
