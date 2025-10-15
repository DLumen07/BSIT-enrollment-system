
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAdmin } from '@/app/admin/context/admin-context';
import { useSearchParams } from 'next/navigation';

// Define the shape of your data
// This combines all the disparate mock data into a single structure.
const mockStudentData = {
    personal: {
        firstName: 'Student',
        lastName: 'Name',
        middleName: 'Dela Cruz',
        birthdate: 'January 1, 2004',
        sex: 'Male' as 'Male' | 'Female',
        civilStatus: 'Single',
        nationality: 'Filipino',
        religion: 'Roman Catholic',
        dialect: 'Tagalog',
    },
    contact: {
        email: 'student.name@example.com',
        phoneNumber: '09123456789',
    },
    address: {
        currentAddress: '123 Main St, Quezon City, Metro Manila',
        permanentAddress: '456 Provincial Rd, Cebu City, Cebu',
    },
    family: {
        fathersName: "Father's Name",
        fathersOccupation: "Father's Occupation",
        mothersName: "Mother's Name",
        mothersOccupation: "Mother's Occupation",
        guardiansName: "Guardian's Name",
    },
    additional: {
        emergencyContactName: 'Emergency Contact',
        emergencyContactAddress: 'Emergency Address',
        emergencyContactNumber: '09876543210',
    },
    education: {
        elementarySchool: 'Central Elementary School',
        elemYearGraduated: '2016',
        secondarySchool: 'National High School',
        secondaryYearGraduated: '2022',
        collegiateSchool: 'Previous University (if transferee)',
    },
    academic: {
        studentId: '22-01-0001',
        course: 'BS in Information Technology',
        yearLevel: '2nd Year',
        block: 'BSIT 2-A',
        status: 'Enrolled' as 'Enrolled' | 'Not Enrolled' | 'Graduated',
        dateEnrolled: 'August 15, 2024',
        specialization: undefined as 'AP' | 'DD' | undefined,
    },
    enrollment: {
        isEnrolled: true,
        registeredSubjects: [
            { code: 'IT 201', description: 'Data Structures & Algorithms', units: 3, schedule: 'M 09:00-10:30', instructor: 'Prof. Ada Lovelace' },
            { code: 'IT 202', description: 'Web Development', units: 3, schedule: 'T 13:00-14:30', instructor: 'Dr. Grace Hopper' },
            { code: 'MATH 201', description: 'Discrete Mathematics', units: 3, schedule: 'W 11:00-12:30', instructor: 'Dr. Alan Turing' },
            { code: 'FIL 102', description: 'Filipino sa Iba\'t Ibang Disiplina', units: 3, schedule: 'Th 14:00-15:30', instructor: 'G. Jose Rizal' },
            { code: 'PE 104', description: 'Physical Education 4', units: 2, schedule: 'F 08:00-10:00', instructor: 'Coach Dave' },
        ],
    },
    schedule: [
        { id: 1, code: 'IT 201', description: 'Data Structures & Algorithms', day: 'Monday', startTime: '09:00', endTime: '10:30', instructor: 'Prof. Ada Lovelace', room: 'Lab 501', color: 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400' },
        { id: 2, code: 'IT 202', description: 'Web Development', day: 'Tuesday', startTime: '13:00', endTime: '14:30', instructor: 'Dr. Grace Hopper', room: 'Lab 502', color: 'bg-green-200/50 dark:bg-green-800/50 border-green-400' },
        { id: 3, code: 'MATH 201', description: 'Discrete Mathematics', day: 'Wednesday', startTime: '11:00', endTime: '12:30', instructor: 'Dr. Alan Turing', room: 'Room 301', color: 'bg-yellow-200/50 dark:bg-yellow-800/50 border-yellow-400' },
        { id: 4, code: 'FIL 102', description: 'Filipino sa Iba\'t Ibang Disiplina', day: 'Thursday', startTime: '14:00', endTime: '15:30', instructor: 'G. Jose Rizal', room: 'Room 305', color: 'bg-orange-200/50 dark:bg-orange-800/50 border-orange-400' },
        { id: 5, code: 'PE 104', description: 'Physical Education 4', day: 'Friday', startTime: '08:00', endTime: '10:00', instructor: 'Coach Dave', room: 'Gymnasium', color: 'bg-purple-200/50 dark:bg-purple-800/50 border-purple-400' },
    ]
};

type StudentDataType = typeof mockStudentData;

interface StudentContextType {
  studentData: StudentDataType | null;
  setStudentData: React.Dispatch<React.SetStateAction<StudentDataType | null>>;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider = ({ children }: { children: React.ReactNode }) => {
  const { adminData } = useAdmin();
  const [studentData, setStudentData] = useState<StudentDataType | null>(null);
  const searchParams = useSearchParams();
  const studentEmail = searchParams.get('email');

  useEffect(() => {
    if (adminData && studentEmail) {
      const currentStudent = adminData.students.find(s => s.email === studentEmail);
      if (currentStudent) {
        const studentSchedule = adminData.schedules[currentStudent.block || ''] || [];
        const isEnrolled = currentStudent.status === 'Enrolled';
        
        const [firstName, ...lastNameParts] = currentStudent.name.split(' ');
        const lastName = lastNameParts.join(' ');

        const data: StudentDataType = {
          personal: {
            firstName: firstName,
            lastName: lastName,
            middleName: '',
            birthdate: 'January 1, 2004',
            sex: currentStudent.sex,
            civilStatus: 'Single',
            nationality: 'Filipino',
            religion: 'Roman Catholic',
            dialect: 'Tagalog',
          },
          contact: {
            email: currentStudent.email,
            phoneNumber: currentStudent.phoneNumber,
          },
          address: {
            currentAddress: '123 Main St, Quezon City, Metro Manila',
            permanentAddress: '456 Provincial Rd, Cebu City, Cebu',
          },
          family: {
            fathersName: "Father's Name",
            fathersOccupation: "Father's Occupation",
            mothersName: "Mother's Name",
            mothersOccupation: "Mother's Occupation",
            guardiansName: "Guardian's Name",
          },
          additional: {
            emergencyContactName: 'Emergency Contact',
            emergencyContactAddress: 'Emergency Address',
            emergencyContactNumber: '09876543210',
          },
          education: {
            elementarySchool: 'Central Elementary School',
            elemYearGraduated: '2016',
            secondarySchool: 'National High School',
            secondaryYearGraduated: '2022',
            collegiateSchool: 'Previous University (if transferee)',
          },
          academic: {
            studentId: currentStudent.studentId,
            course: currentStudent.course,
            yearLevel: `${currentStudent.year}${currentStudent.year === 1 ? 'st' : currentStudent.year === 2 ? 'nd' : currentStudent.year === 3 ? 'rd' : 'th'} Year`,
            block: currentStudent.block || 'N/A',
            status: currentStudent.status,
            dateEnrolled: 'August 15, 2024',
            specialization: currentStudent.specialization,
          },
          enrollment: {
            isEnrolled: isEnrolled,
            registeredSubjects: isEnrolled ? (currentStudent.enlistedSubjects || []).map(sub => ({
                 code: sub.code,
                 description: sub.description,
                 units: sub.units,
                 schedule: studentSchedule.find(ss => ss.code === sub.code) ? `${studentSchedule.find(ss => ss.code === sub.code)!.day.substring(0,1)} ${studentSchedule.find(ss => ss.code === sub.code)!.startTime}-${studentSchedule.find(ss => ss.code === sub.code)!.endTime}` : 'TBA',
                 instructor: studentSchedule.find(ss => ss.code === sub.code)?.instructor || 'TBA'
            })) : [],
          },
          schedule: isEnrolled ? studentSchedule.map(s => ({...s, room: 'TBA'})) : []
        };
        setStudentData(data);
      }
    }
  }, [adminData, studentEmail]);


  if (!studentData) {
    return <div>Loading student data...</div>;
  }

  return (
    <StudentContext.Provider value={{ studentData, setStudentData }}>
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = (): StudentContextType => {
  const context = useContext(StudentContext);
  if (context === undefined) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};
    

    