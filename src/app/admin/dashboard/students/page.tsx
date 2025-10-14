
'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { MoreHorizontal, Search, Filter, FilterX, PlusCircle, Pencil, Trash2, Files, UserPlus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAdmin, Student, Subject } from '../../context/admin-context';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

export default function StudentsPage() {
    const { adminData, setAdminData } = useAdmin();
    const { students, blocks, subjects: yearLevelSubjects } = adminData;
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        course: 'all',
        year: 'all',
        status: 'all',
    });

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    // State for add/edit form
    const [studentName, setStudentName] = useState('');
    const [studentEmail, setStudentEmail] = useState('');
    const [studentId, setStudentId] = useState('');
    const [studentCourse, setStudentCourse] = useState<'BSIT' | 'ACT'>('BSIT');
    const [studentYear, setStudentYear] = useState(1);

    // State for enrollment form
    const [enrollStudentId, setEnrollStudentId] = useState('');
    const [enrollYearLevel, setEnrollYearLevel] = useState('');
    const [enrollBlock, setEnrollBlock] = useState('');
    const [enlistedSubjects, setEnlistedSubjects] = useState<Subject[]>([]);

    const studentToEnroll = useMemo(() => students.find(s => s.studentId === enrollStudentId), [students, enrollStudentId]);

    const availableBlocks = useMemo(() => {
        if (!enrollYearLevel) return [];
        const yearKey = `${enrollYearLevel.toString()}-year`;
        return blocks.filter(b => b.year === yearKey);
    }, [blocks, enrollYearLevel]);

    const availableSubjects = useMemo(() => {
        if (!enrollYearLevel) return [];
        const yearKey = `${enrollYearLevel.toString()}-year`;
        return yearLevelSubjects[yearKey] || [];
    }, [yearLevelSubjects, enrollYearLevel]);
    
    useEffect(() => {
        if (studentToEnroll) {
            setEnrollYearLevel(studentToEnroll.year.toString());
        } else {
            setEnrollYearLevel('');
        }
        setEnrollBlock('');
        setEnlistedSubjects([]);
    }, [studentToEnroll]);


    const openAddDialog = () => {
        setSelectedStudent(null);
        setStudentName('');
        setStudentEmail('');
        setStudentId('');
        setStudentCourse('BSIT');
        setStudentYear(1);
        setIsAddDialogOpen(true);
    };

    const openEditDialog = (student: Student) => {
        setSelectedStudent(student);
        setStudentName(student.name);
        setStudentEmail(student.email);
        setStudentId(student.studentId);
        setStudentCourse(student.course);
        setStudentYear(student.year);
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (student: Student) => {
        setSelectedStudent(student);
        setIsDeleteDialogOpen(true);
    };
    
    const handleAddStudent = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const newStudent: Student = {
            id: Date.now(),
            name: studentName,
            email: studentEmail,
            studentId,
            course: studentCourse,
            year: studentYear,
            status: 'Not Enrolled',
            avatar: `https://picsum.photos/seed/${Date.now()}/40/40`,
        };
        setAdminData(prev => ({...prev, students: [...prev.students, newStudent]}));
        setIsAddDialogOpen(false);
    };

     const handleEditStudent = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedStudent) return;
        const updatedStudent = {
            ...selectedStudent,
            name: studentName,
            email: studentEmail,
            studentId,
            course: studentCourse,
            year: studentYear,
        };
        setAdminData(prev => ({
            ...prev,
            students: prev.students.map(s => s.id === selectedStudent.id ? updatedStudent : s)
        }));
        setIsEditDialogOpen(false);
        setSelectedStudent(null);
    };

    const handleEnrollStudent = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!studentToEnroll || !enrollBlock) {
            toast({
                variant: 'destructive',
                title: 'Enrollment Failed',
                description: 'Please select a valid student and block.',
            });
            return;
        }

        setAdminData(prev => {
            const updatedStudents = prev.students.map(s => 
                s.id === studentToEnroll.id 
                ? { ...s, status: 'Enrolled' as const, block: enrollBlock, enlistedSubjects } 
                : s
            );
            const updatedBlocks = prev.blocks.map(b => 
                b.name === enrollBlock ? { ...b, enrolled: b.enrolled + 1 } : b
            );
            return { ...prev, students: updatedStudents, blocks: updatedBlocks };
        });

        toast({
            title: 'Enrollment Successful',
            description: `${studentToEnroll.name} has been enrolled in block ${enrollBlock}.`,
        });

        setIsEnrollDialogOpen(false);
        setEnrollStudentId('');
    };

     const handleDeleteStudent = () => {
        if (!selectedStudent) return;
        setAdminData(prev => ({
            ...prev,
            students: prev.students.filter(s => s.id !== selectedStudent.id),
        }));
        setIsDeleteDialogOpen(false);
        setSelectedStudent(null);
    };
    
    const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
    };

    const clearFilters = () => {
        setSearchTerm('');
        setFilters({ course: 'all', year: 'all', status: 'all' });
    };
    
    const isFiltered = searchTerm || filters.course !== 'all' || filters.year !== 'all' || filters.status !== 'all';
    
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const searchTermLower = searchTerm.toLowerCase();
            const matchesSearch = searchTerm ? 
                student.name.toLowerCase().includes(searchTermLower) || 
                student.studentId.toLowerCase().includes(searchTermLower) ||
                student.email.toLowerCase().includes(searchTermLower) : true;
            
            const matchesCourse = filters.course !== 'all' ? student.course === filters.course : true;
            const matchesYear = filters.year !== 'all' ? student.year.toString() === filters.year : true;
            const matchesStatus = filters.status !== 'all' ? student.status === filters.status : true;

            return matchesSearch && matchesCourse && matchesYear && matchesStatus;
        });
    }, [students, searchTerm, filters]);
    
    const courses = ['all', ...Array.from(new Set(students.map(app => app.course)))];
    const years = ['all', ...Array.from(new Set(students.map(app => app.year.toString())))].sort();
    const statuses = ['all', 'Enrolled', 'Not Enrolled', 'Graduated'];
    
    const getStatusBadgeVariant = (status: Student['status']) => {
        switch (status) {
            case 'Enrolled':
                return 'default';
            case 'Not Enrolled':
                return 'destructive';
            case 'Graduated':
                return 'secondary';
            default:
                return 'outline';
        }
    };


    return (
        <>
            <main className="flex-1 p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-bold tracking-tight">Student Directory</h1>
                        <p className="text-muted-foreground">
                            Manage and view all student records in the system.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={openAddDialog} variant="outline" className="rounded-full">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Student
                        </Button>
                         <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="rounded-full">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Enroll Student
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Manual Student Enrollment</DialogTitle>
                                    <DialogDescription>
                                        Search for a student and assign them to a block and subjects.
                                    </DialogDescription>
                                </DialogHeader>
                                <form id="enroll-student-form" onSubmit={handleEnrollStudent}>
                                    <div className="space-y-4 py-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="studentId">Student ID</Label>
                                            <Input 
                                                id="studentId" 
                                                name="studentId" 
                                                value={enrollStudentId}
                                                onChange={(e) => setEnrollStudentId(e.target.value)}
                                                placeholder="Enter student ID to search..." 
                                                required 
                                            />
                                        </div>
                                        
                                        {studentToEnroll && (
                                            <Card>
                                                <CardContent className="pt-4">
                                                    <div className="flex items-center gap-4">
                                                        <Avatar>
                                                            <AvatarImage src={studentToEnroll.avatar} alt={studentToEnroll.name} />
                                                            <AvatarFallback>{studentToEnroll.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-semibold">{studentToEnroll.name}</p>
                                                            <p className="text-sm text-muted-foreground">{studentToEnroll.course} - {studentToEnroll.year} Year</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="year-level">Year Level</Label>
                                                            <Input id="year-level" value={`${enrollYearLevel}${enrollYearLevel === '1' ? 'st' : enrollYearLevel === '2' ? 'nd' : enrollYearLevel === '3' ? 'rd' : 'th'} Year`} disabled />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="block">Block</Label>
                                                            <Select value={enrollBlock} onValueChange={setEnrollBlock} required>
                                                                <SelectTrigger id="block">
                                                                    <SelectValue placeholder="Select a block" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {availableBlocks.map(b => (
                                                                        <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    {enrollBlock && availableSubjects.length > 0 && (
                                                        <div className="space-y-3 mt-4 pt-4 border-t">
                                                            <h4 className="font-medium">Enlist Subjects</h4>
                                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                                                {availableSubjects.map(subject => (
                                                                    <div key={subject.id} className="flex items-center space-x-2 p-2 border rounded-md">
                                                                        <Checkbox 
                                                                            id={`sub-${subject.id}`}
                                                                            onCheckedChange={(checked) => {
                                                                                if (checked) {
                                                                                    setEnlistedSubjects(prev => [...prev, subject]);
                                                                                } else {
                                                                                    setEnlistedSubjects(prev => prev.filter(s => s.id !== subject.id));
                                                                                }
                                                                            }}
                                                                        />
                                                                        <Label htmlFor={`sub-${subject.id}`} className="flex-1 font-normal">
                                                                            {subject.code} - {subject.description}
                                                                        </Label>
                                                                        <span className="text-xs text-muted-foreground">{subject.units} units</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )}

                                    </div>
                                </form>
                                 <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsEnrollDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit" form="enroll-student-form">Enroll Student</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                       <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
                         <div className="relative flex-1 md:grow-0">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by name, ID, or email..."
                                className="w-full rounded-lg bg-background pl-8 md:w-[250px] lg:w-[300px]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-accent rounded-xl">
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
                                                <SelectContent>
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
                                                <SelectContent>
                                                    {years.map(year => <SelectItem key={year} value={year}>{year === 'all' ? 'All Years' : `${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year`}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Status</Label>
                                            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                                                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 rounded-xl">
                                                    <SelectValue placeholder="All Statuses" />
                                                </SelectTrigger>
                                                <SelectContent>
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
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Student ID</TableHead>
                                        <TableHead>Course & Year</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-4">
                                                    <Avatar>
                                                        <AvatarImage src={student.avatar} alt={student.name} data-ai-hint="person avatar"/>
                                                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="grid gap-1">
                                                        <p className="font-medium">{student.name}</p>
                                                        <p className="text-sm text-muted-foreground">{student.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{student.studentId}</TableCell>
                                            <TableCell>{student.course} - {student.year}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusBadgeVariant(student.status)}>{student.status}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                            <Files className="mr-2 h-4 w-4" />
                                                            Claim Green Form
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => openEditDialog(student)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                                            onSelect={() => openDeleteDialog(student)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No students found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </main>

            {/* Add/Edit Dialog */}
            <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={isAddDialogOpen ? setIsAddDialogOpen : setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                        <DialogDescription>
                            {selectedStudent ? `Update the details for ${selectedStudent.name}.` : 'Enter the details for the new student.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form id="student-form" onSubmit={selectedStudent ? handleEditStudent : handleAddStudent}>
                        <div className="space-y-4 py-2">
                             <div className="space-y-2">
                                <Label htmlFor="studentName">Full Name</Label>
                                <Input id="studentName" value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="studentEmail">Email Address</Label>
                                <Input id="studentEmail" type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="studentIdForm">Student ID</Label>
                                <Input id="studentIdForm" value={studentId} onChange={(e) => setStudentId(e.target.value)} required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="studentCourse">Course</Label>
                                    <Select value={studentCourse} onValueChange={(v) => setStudentCourse(v as 'BSIT' | 'ACT')}>
                                        <SelectTrigger id="studentCourse">
                                            <SelectValue placeholder="Select course" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BSIT">BSIT</SelectItem>
                                            <SelectItem value="ACT">ACT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="studentYear">Year Level</Label>
                                    <Select value={studentYear.toString()} onValueChange={(v) => setStudentYear(parseInt(v, 10))}>
                                        <SelectTrigger id="studentYear">
                                            <SelectValue placeholder="Select year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1st Year</SelectItem>
                                            <SelectItem value="2">2nd Year</SelectItem>
                                            <SelectItem value="3">3rd Year</SelectItem>
                                            <SelectItem value="4">4th Year</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { isAddDialogOpen ? setIsAddDialogOpen(false) : setIsEditDialogOpen(false); }}>Cancel</Button>
                        <Button type="submit" form="student-form">
                            {selectedStudent ? 'Save Changes' : 'Add Student'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                             This will permanently delete the record for <span className="font-semibold">{selectedStudent?.name}</span>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={handleDeleteStudent}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
