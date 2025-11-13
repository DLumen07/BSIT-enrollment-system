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

export const isStudentProfileComplete = (student: StudentDataType): boolean => {
    const requiredStrings: Array<string | null | undefined> = [
        student.personal.firstName,
        student.personal.lastName,
        student.personal.middleName,
        student.personal.sex,
        student.personal.civilStatus,
        student.personal.nationality,
        student.personal.religion,
        student.personal.dialect,
        student.contact.email,
        student.contact.phoneNumber,
        student.address.currentAddress,
        student.address.permanentAddress,
        student.family.fathersName,
        student.family.fathersOccupation,
        student.family.mothersName,
        student.family.mothersOccupation,
        student.additional.emergencyContactName,
        student.additional.emergencyContactAddress,
        student.additional.emergencyContactNumber,
        student.education.elementarySchool,
        student.education.elemYearGraduated,
        student.education.secondarySchool,
        student.education.secondaryYearGraduated,
    ];

    if (!requiredStrings.every(isNonEmptyString)) {
        return false;
    }

    if (!hasValidDate(student.personal.birthdate)) {
        return false;
    }

    return true;
};
