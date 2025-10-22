
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAdmin } from '@/app/admin/context/admin-context';
import type { Subject as ScheduleSubject } from '@/app/admin/dashboard/schedule/[blockId]/page';
import type { Student, Subject } from '@/app/admin/context/admin-context';
import { useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

type InstructorPersonal = {
    id: number;
    name: string;
    email: string;
    avatar: string;
};

type InstructorClass = {
    block: string;
    subjectCode: string;
    subjectDescription: string;
    studentCount: number;
};

type Grade = { subjectCode: string; grade: number; };
type StudentGrades = { [studentId: string]: Grade[] };

type InstructorDataType = {
    personal: InstructorPersonal;
    schedule: (ScheduleSubject & { block: string })[];
    classes: InstructorClass[];
    grades: StudentGrades;
};

interface InstructorContextType {
  instructorData: InstructorDataType | null;
  setInstructorData: React.Dispatch<React.SetStateAction<InstructorDataType | null>>;
  updateStudentGrade: (studentId: string, subjectCode: string, grade: number) => void;
}

const InstructorContext = createContext<InstructorContextType | undefined>(undefined);

export const InstructorProvider = ({ children }: { children: React.ReactNode }) => {
  const { adminData, setAdminData } = useAdmin();
  const [instructorData, setInstructorData] = useState<InstructorDataType | null>(null);
  const searchParams = useSearchParams();
  const instructorEmail = searchParams.get('email');

  useEffect(() => {
    if (adminData && instructorEmail) {
      const currentInstructor = adminData.instructors.find(inst => inst.email === instructorEmail);
      if (currentInstructor) {
        const instructorSchedule: (ScheduleSubject & { block: string })[] = [];
        const instructorClasses: InstructorClass[] = [];

        for (const blockName in adminData.schedules) {
            const blockSchedule = adminData.schedules[blockName];
            const subjectsInBlock = blockSchedule.filter(sub => sub.instructor === currentInstructor.name);
            
            subjectsInBlock.forEach(sub => {
                instructorSchedule.push({ ...sub, block: blockName });
            });

            if (subjectsInBlock.length > 0) {
                 const uniqueSubjects = [...new Map(subjectsInBlock.map(item => [item.code, item])).values()];
                 uniqueSubjects.forEach(subject => {
                    instructorClasses.push({
                        block: blockName,
                        subjectCode: subject.code,
                        subjectDescription: subject.description,
                        studentCount: adminData.students.filter(s => s.block === blockName).length,
                    });
                 });
            }
        }

        setInstructorData({
            personal: {
                id: currentInstructor.id,
                name: currentInstructor.name,
                email: currentInstructor.email,
                avatar: currentInstructor.avatar,
            },
            schedule: instructorSchedule,
            classes: instructorClasses,
            grades: adminData.grades,
        });
      }
    }
  }, [adminData, instructorEmail]);

  const updateStudentGrade = (studentId: string, subjectCode: string, grade: number) => {
    setAdminData(prevAdminData => {
        const newGrades = { ...prevAdminData.grades };
        const studentGrades = newGrades[studentId] ? [...newGrades[studentId]] : [];
        const gradeIndex = studentGrades.findIndex(g => g.subjectCode === subjectCode);

        if (gradeIndex > -1) {
            studentGrades[gradeIndex] = { subjectCode, grade };
        } else {
            studentGrades.push({ subjectCode, grade });
        }
        newGrades[studentId] = studentGrades;
        
        return { ...prevAdminData, grades: newGrades };
    });
  };

  if (!instructorData) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
        </div>
    );
  }

  return (
    <InstructorContext.Provider value={{ instructorData, setInstructorData, updateStudentGrade }}>
      {children}
    </InstructorContext.Provider>
  );
};

export const useInstructor = (): InstructorContextType => {
  const context = useContext(InstructorContext);
  if (context === undefined) {
    throw new Error('useInstructor must be used within an InstructorProvider');
  }
  return context;
};
