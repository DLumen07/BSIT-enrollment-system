<?php
class Grade {
    private $conn;
    private $table_name = "student_grades";

    public $id;
    public $student_user_id;
    public $subject_id;
    public $grade;
    public $academic_year;
    public $semester;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET student_user_id=:student_user_id, subject_id=:subject_id, grade=:grade, academic_year=:academic_year, semester=:semester";
        $stmt = $this->conn->prepare($query);

        $this->student_user_id = htmlspecialchars(strip_tags($this->student_user_id));
        $this->subject_id = htmlspecialchars(strip_tags($this->subject_id));
        $this->grade = htmlspecialchars(strip_tags($this->grade));
        $this->academic_year = htmlspecialchars(strip_tags($this->academic_year));
        $this->semester = htmlspecialchars(strip_tags($this->semester));

        $stmt->bindParam(":student_user_id", $this->student_user_id);
        $stmt->bindParam(":subject_id", $this->subject_id);
        $stmt->bindParam(":grade", $this->grade);
        $stmt->bindParam(":academic_year", $this->academic_year);
        $stmt->bindParam(":semester", $this->semester);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    function readByStudent() {
        $query = "SELECT g.*, s.code as subject_code FROM " . $this->table_name . " g JOIN subjects s ON g.subject_id = s.id WHERE g.student_user_id = ?";
        $stmt = $this->conn->prepare($query);
        $this->student_user_id = htmlspecialchars(strip_tags($this->student_user_id));
        $stmt->bindParam(1, $this->student_user_id);
        $stmt->execute();
        return $stmt;
    }

    function update() {
        $query = "UPDATE " . $this->table_name . " SET grade=:grade WHERE id=:id";
        $stmt = $this->conn->prepare($query);

        $this->id = htmlspecialchars(strip_tags($this->id));
        $this->grade = htmlspecialchars(strip_tags($this->grade));

        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":grade", $this->grade);

        if ($stmt->execute()) {
            return true;
        }
        return false;
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