import { StudentDataType } from '@/app/student/context/student-context';

const isNonEmptyString = (value?: string | null): boolean => {
    return typeof value === 'string' && value.trim().length > 0;
};

const hasValidDate = (value?: string | null): boolean => {
    if (!isNonEmptyString(value)) {
        return false;
    }
    const parsed = new Date(value as string);
    return !Number.isNaN(parsed.getTime());
};

type RequiredFieldCheck = {
    label: string;
    value: string | null | undefined;
};

const getRequiredFields = (student: StudentDataType): RequiredFieldCheck[] => [
    { label: 'First Name', value: student.personal.firstName },
    { label: 'Last Name', value: student.personal.lastName },
    { label: 'Sex', value: student.personal.sex },
    { label: 'Civil Status', value: student.personal.civilStatus },
    { label: 'Nationality', value: student.personal.nationality },
    { label: 'Religion', value: student.personal.religion },
    { label: 'Dialect', value: student.personal.dialect },
    { label: 'Email', value: student.contact.email },
    { label: 'Phone Number', value: student.contact.phoneNumber },
    { label: 'Current Address', value: student.address.currentAddress },
    { label: 'Permanent Address', value: student.address.permanentAddress },
    { label: "Father's Name", value: student.family.fathersName },
    { label: "Father's Occupation", value: student.family.fathersOccupation },
    { label: "Mother's Name", value: student.family.mothersName },
    { label: "Mother's Occupation", value: student.family.mothersOccupation },
    { label: 'Emergency Contact Name', value: student.additional.emergencyContactName },
    { label: 'Emergency Contact Address', value: student.additional.emergencyContactAddress },
    { label: 'Emergency Contact Number', value: student.additional.emergencyContactNumber },
    { label: 'Elementary School', value: student.education.elementarySchool },
    { label: 'Elementary Year Graduated', value: student.education.elemYearGraduated },
    { label: 'Secondary School', value: student.education.secondarySchool },
    { label: 'Secondary Year Graduated', value: student.education.secondaryYearGraduated },
];

export const getMissingProfileFields = (student: StudentDataType): string[] => {
    const missingFields: string[] = [];
    
    for (const field of getRequiredFields(student)) {
        if (!isNonEmptyString(field.value)) {
            missingFields.push(field.label);
        }
    }
    
    if (!hasValidDate(student.personal.birthdate)) {
        missingFields.push('Birthdate');
    }
    
    return missingFields;
};

export const isStudentProfileComplete = (student: StudentDataType): boolean => {
    const requiredFields = getRequiredFields(student);
    
    if (!requiredFields.every(field => isNonEmptyString(field.value))) {
        return false;
    }

    if (!hasValidDate(student.personal.birthdate)) {
        return false;
    }

    return true;
};
