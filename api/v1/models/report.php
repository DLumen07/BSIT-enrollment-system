<?php
class Report {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function getEnrollmentStats() {
        $query = "SELECT
                    (SELECT COUNT(*) FROM student_profiles) as total_students,
                    (SELECT COUNT(*) FROM instructor_profiles) as total_instructors,
                    (SELECT COUNT(*) FROM subjects) as total_subjects,
                    (SELECT COUNT(*) FROM blocks) as total_blocks,
                    (SELECT COUNT(*) FROM enrollment_applications WHERE status = 'pending') as pending_applications";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }
}
?>