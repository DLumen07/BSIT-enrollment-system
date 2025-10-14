
'use client';
import React, { createContext, useContext, useState } from 'react';
import { useAdmin } from '@/app/admin/context/admin-context';

// For now, we can pull some data from the admin context to simulate a logged-in instructor
// In a real app, this would be fetched from an API based on the logged-in user

const mockInstructorData = {
    personal: {
        id: 1,
        name: 'Dr. Alan Turing',
        email: 'alan.turing@university.edu',
        avatar: 'https://picsum.photos/seed/at-avatar/128/128',
    },
    schedule: [
        { id: 1, code: 'IT 101', description: 'Intro to Computing', day: 'Monday', startTime: '09:00', endTime: '10:30', block: 'BSIT 1-A', color: 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400' },
        { id: 2, code: 'IT 201', description: 'Data Structures', day: 'Monday', startTime: '10:30', endTime: '12:00', block: 'BSIT 2-A', color: 'bg-green-200/50 dark:bg-green-800/50 border-green-400' },
    ],
    classes: [
        {
            block: 'BSIT 1-A',
            subjectCode: 'IT 101',
            subjectDescription: 'Intro to Computing',
            studentCount: 38,
        },
        {
            block: 'BSIT 2-A',
            subjectCode: 'IT 201',
            subjectDescription: 'Data Structures',
            studentCount: 32,
        },
    ]
};

type InstructorDataType = typeof mockInstructorData;

interface InstructorContextType {
  instructorData: InstructorDataType;
  setInstructorData: React.Dispatch<React.SetStateAction<InstructorDataType>>;
}

const InstructorContext = createContext<InstructorContextType | undefined>(undefined);

export const InstructorProvider = ({ children }: { children: React.ReactNode }) => {
  const [instructorData, setInstructorData] = useState<InstructorDataType>(mockInstructorData);

  return (
    <InstructorContext.Provider value={{ instructorData, setInstructorData }}>
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
