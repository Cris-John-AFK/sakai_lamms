import { PhotoService } from '@/router/service/PhotoService';

export const AttendanceService = {
    async getData() {
        const photos = await PhotoService.getData(); // Get photo data
        return [
            {
                id: 1001,
                name: 'Maria Clara Santos',
                date: '2025-03-19',
                timeIn: '07:20 AM',
                timeOut: '04:25 PM',
                gender: 'Female',
                gradeLevel: 3,
                section: 'A',
                photo: photos[0]?.itemImageSrc
            },
            {
                id: 1002,
                name: 'Jose Andres Reyes',
                date: '2025-03-19',
                timeIn: '07:10 AM',
                timeOut: '04:35 PM',
                gender: 'Male',
                gradeLevel: 4,
                section: 'B',
                photo: photos[1]?.itemImageSrc
            },
            {
                id: 1003,
                name: 'Rizalina Bautista',
                date: '2025-03-19',
                timeIn: '07:25 AM',
                timeOut: '04:40 PM',
                gender: 'Female',
                gradeLevel: 5,
                section: 'C',
                photo: photos[2]?.itemImageSrc
            },
            {
                id: 1004,
                name: 'Emilio Aguinaldo Cruz',
                date: '2025-03-19',
                timeIn: '07:05 AM',
                timeOut: '04:20 PM',
                gender: 'Male',
                gradeLevel: 6,
                section: 'D',
                photo: photos[3]?.itemImageSrc
            },
            {
                id: 1005,
                name: 'Gabriela Silang Rivera',
                date: '2025-03-19',
                timeIn: '07:18 AM',
                timeOut: '04:45 PM',
                gender: 'Female',
                gradeLevel: 2,
                section: 'E',
                photo: photos[4]?.itemImageSrc
            },
            {
                id: 1006,
                name: 'Diego Silang Mendoza',
                date: '2025-03-19',
                timeIn: '07:22 AM',
                timeOut: '04:38 PM',
                gender: 'Male',
                gradeLevel: 3,
                section: 'A',
                photo: photos[5]?.itemImageSrc
            },
            {
                id: 1007,
                name: 'Melchora Aquino Pascual',
                date: '2025-03-19',
                timeIn: '07:08 AM',
                timeOut: '04:28 PM',
                gender: 'Female',
                gradeLevel: 4,
                section: 'B',
                photo: photos[6]?.itemImageSrc
            },
            {
                id: 1008,
                name: 'Andres Bonifacio Torres',
                date: '2025-03-19',
                timeIn: '07:12 AM',
                timeOut: '04:50 PM',
                gender: 'Male',
                gradeLevel: 5,
                section: 'C',
                photo: photos[7]?.itemImageSrc
            },
            {
                id: 1009,
                name: 'Antonio Luna Gomez',
                date: '2025-03-19',
                timeIn: '07:30 AM',
                timeOut: '04:15 PM',
                gender: 'Male',
                gradeLevel: 6,
                section: 'D',
                photo: photos[8]?.itemImageSrc
            },
            {
                id: 1010,
                name: 'Juan Dela Cruz',
                date: '2025-03-19',
                timeIn: '07:15 AM',
                timeOut: '04:30 PM',
                gender: 'Male',
                gradeLevel: 2,
                section: 'E',
                photo: photos[9]?.itemImageSrc
            }
        ];
    },

    // Get students by grade level
    async getStudentsByGrade(gradeLevel) {
        const students = await this.getData();
        return students.filter((student) => student.gradeLevel === parseInt(gradeLevel));
    },

    // Get students by section
    async getStudentsBySection(sectionLetter) {
        const students = await this.getData();
        return students.filter((student) => student.section === sectionLetter);
    },

    // Get students by both grade and section
    async getStudentsByGradeAndSection(gradeLevel, sectionLetter) {
        const students = await this.getData();
        return students.filter((student) => student.gradeLevel === parseInt(gradeLevel) && student.section === sectionLetter);
    },

    // Add student to the system
    async addStudent(student) {
        // Implementation would connect to your backend
        // For now, we'll just return the student object
        return student;
    },

    // Update attendance record for a student
    async recordAttendance(studentId, attendanceRecord) {
        // In a real implementation, this would update the database
        return {
            studentId,
            ...attendanceRecord
        };
    },

    // Get attendance history for a subject
    async getAttendanceForSubject(subjectName) {
        // This would typically fetch from a database
        // For now, return sample data
        return [
            {
                date: '2023-09-15',
                studentName: 'Maria Clara Santos',
                studentId: '1001',
                status: 'Present',
                time: '10:30:45 AM',
                remarks: ''
            },
            {
                date: '2023-09-15',
                studentName: 'Juan Dela Cruz',
                studentId: '1002',
                status: 'Late',
                time: '10:45:12 AM',
                remarks: 'Traffic'
            }
        ];
    },

    // Get a student by ID
    async getStudentById(id) {
        const students = await this.getData();
        return students.find((student) => student.id === parseInt(id));
    }
};
