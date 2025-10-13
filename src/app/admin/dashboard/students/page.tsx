
'use client';
import React, { useState, useMemo } from 'react';
import { MoreHorizontal, Search, Filter, FilterX, PlusCircle, Pencil, Trash2, Files } from 'lucide-react';
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

type Student = {
    id: number;
    studentId: string;
    name: string;
    avatar: string;
    email: string;
    course: 'BSIT' | 'ACT';
    year: number;
    status: 'Enrolled' | 'Not Enrolled' | 'Graduated';
};

const initialStudents: Student[] = [
    { id: 1, studentId: '2021-0123', name: 'Alice Johnson', avatar: 'https://picsum.photos/seed/aj-student/40/40', email: 'alice.j@student.example.com', course: 'BSIT', year: 4, status: 'Enrolled' },
    { id: 2, studentId: '2022-0234', name: 'Bob Williams', avatar: 'https://picsum.photos/seed/bw-student/40/40', email: 'bob.w@student.example.com', course: 'BSIT', year: 3, status: 'Enrolled' },
    { id: 3, studentId: '2023-0345', name: 'Charlie Brown', avatar: 'https://picsum.photos/seed/cb-student/40/40', email: 'charlie.b@student.example.com', course: 'ACT', year: 2, status: 'Enrolled' },
];

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>(initialStudents);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        course: 'all',
        year: 'all',
        status: 'all',
    });

    const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    const openEditDialog = (student: Student) => {
        setSelectedStudent(student);
        setIsAddEditDialogOpen(true);
    };

    const openDeleteDialog = (student: Student) => {
        setSelectedStudent(student);
        setIsDeleteDialogOpen(true);
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
    const years = ['all', ...Array from(new Set(students.map(app => app.year.toString())))].sort();
    const statuses = ['all', ...Array.from(new Set(students.map(app => app.status)))];
    
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
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button className="rounded-full">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Student
                            </Button>
                        </DialogTrigger>
                        {/* Add/Edit Dialog content will go here */}
                    </Dialog>
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
                                    <Button variant="ghost" className="gap-2 hover:bg-transparent hover:text-accent focus:text-accent">
                                        <Filter className="h-4 w-4" />
                                        Filter
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4" align="end">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <Label>Course</Label>
                                            <Select value={filters.course} onValueChange={(value) => handleFilterChange('course', value)}>
                                                <SelectTrigger>
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
                                                <SelectTrigger>
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
                                                <SelectTrigger>
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
        </>
    );
}
