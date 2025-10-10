'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const gradesData = [
  {
    semester: 'A.Y. 2023-2024, 2nd Sem',
    gpa: '1.75',
    standing: 'Good Standing',
    totalUnits: 18,
    subjects: [
      { code: 'IT 201', description: 'Data Structures & Algorithms', grade: '1.5' },
      { code: 'IT 202', description: 'Web Development', grade: '2.0' },
      { code: 'MATH 201', description: 'Discrete Mathematics', grade: '1.75' },
      { code: 'FIL 102', description: 'Filipino sa Iba\'t Ibang Disiplina', grade: '2.25' },
      { code: 'PE 104', description: 'Physical Education 4', grade: '1.0' },
    ],
  },
  {
    semester: 'A.Y. 2023-2024, 1st Sem',
    gpa: '1.50',
    standing: 'Dean\'s Lister',
    totalUnits: 21,
    subjects: [
        { id: 101, code: 'IT 101', description: 'Introduction to Computing', grade: '1.25' },
        { id: 102, code: 'MATH 101', description: 'Calculus 1', grade: '1.75' },
        { code: 'ENG 101', description: 'Purposive Communication', grade: '1.5' },
        { code: 'SCI 101', description: 'Science, Technology, and Society', grade: '1.5' },
        { code: 'HIS 101', description: 'Readings in Philippine History', grade: '1.5' },
    ],
  },
];

export default function GradesPage() {
  return (
    <main className="flex-1 p-4 sm:p-6">
      <div className="space-y-0.5 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Grades</h1>
        <p className="text-muted-foreground">
          View your academic performance from previous semesters.
        </p>
      </div>

      <Tabs defaultValue={gradesData[0].semester} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:w-auto md:inline-grid">
            {gradesData.map((data) => (
                <TabsTrigger key={data.semester} value={data.semester}>{data.semester}</TabsTrigger>
            ))}
        </TabsList>
        {gradesData.map((data) => (
            <TabsContent key={data.semester} value={data.semester}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                    <div className="lg:col-span-2">
                        <Card>
                             <CardHeader>
                                <CardTitle>Grade Details</CardTitle>
                                <CardDescription>
                                    Subject grades for {data.semester}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Subject Code</TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="text-right">Final Grade</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.subjects.map(subject => (
                                                <TableRow key={subject.code}>
                                                    <TableCell className="font-medium">{subject.code}</TableCell>
                                                    <TableCell>{subject.description}</TableCell>
                                                    <TableCell className="text-right font-semibold">{subject.grade}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Semester Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Units</p>
                                    <p className="text-lg font-bold">{data.totalUnits}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">General Point Average (GPA)</p>
                                    <p className="text-lg font-bold">{data.gpa}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Academic Standing</p>
                                    <p className="text-lg font-bold">{data.standing}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}
