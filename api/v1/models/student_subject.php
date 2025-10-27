<?php
class StudentSubject {
    private $conn;
    private $table_name = "student_subjects";

    public $id;
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
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    function readByStudent() {
        $query = "SELECT ss.*, s.code as subject_code, s.description as subject_description, s.units FROM " . $this->table_name . " ss JOIN subjects s ON ss.subject_id = s.id WHERE ss.student_user_id = ?";
        $stmt = $this->conn->prepare($query);
        $this->student_user_id = htmlspecialchars(strip_tags($this->student_user_id));
        $stmt->bindParam(1, $this->student_user_id);
        $stmt->execute();
        return $stmt;
    }

    function delete() {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $this->id = htmlspecialchars(strip_tags($this->id));
        $stmt->bindParam(1, $this->id);
        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>