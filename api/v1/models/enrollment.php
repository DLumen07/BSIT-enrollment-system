<?php
class Enrollment {
    private $conn;
    private $table_name = "student_subjects";

    public $student_user_id;
    public $subject_id;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET student_user_id=:student_user_id, subject_id=:subject_id";
        $stmt = $this->conn->prepare($query);

        $this->student_user_id = htmlspecialchars(strip_tags($this->student_user_id));
        $this->subject_id = htmlspecialchars(strip_tags($this->subject_id));

        $stmt->bindParam(":student_user_id", $this->student_user_id);
        $stmt->bindParam(":subject_id", $this->subject_id);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>