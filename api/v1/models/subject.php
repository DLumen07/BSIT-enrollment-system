<?php
class Subject {
    private $conn;
    private $table_name = "subjects";

    public $id;
    public $subject_code;
    public $subject_name;
    public $description;
    public $units;
    public $course;
    public $year_level;
    public $specialization;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET subject_code=:subject_code, subject_name=:subject_name, description=:description, units=:units, course=:course, year_level=:year_level, specialization=:specialization";
        $stmt = $this->conn->prepare($query);

        $this->subject_code = htmlspecialchars(strip_tags($this->subject_code));
        $this->subject_name = htmlspecialchars(strip_tags($this->subject_name));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->units = htmlspecialchars(strip_tags($this->units));
        $this->course = htmlspecialchars(strip_tags($this->course));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));
        $this->specialization = htmlspecialchars(strip_tags($this->specialization));

        $stmt->bindParam(":subject_code", $this->subject_code);
        $stmt->bindParam(":subject_name", $this->subject_name);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":units", $this->units);
        $stmt->bindParam(":course", $this->course);
        $stmt->bindParam(":year_level", $this->year_level);
        $stmt->bindParam(":specialization", $this->specialization);

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

    function read() {
        $query = "SELECT * FROM " . $this->table_name;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    function update() {
        $query = "UPDATE " . $this->table_name . " SET subject_code=:subject_code, subject_name=:subject_name, description=:description, units=:units, course=:course, year_level=:year_level, specialization=:specialization WHERE id=:id";
        $stmt = $this->conn->prepare($query);

        $this->id = htmlspecialchars(strip_tags($this->id));
        $this->subject_code = htmlspecialchars(strip_tags($this->subject_code));
        $this->subject_name = htmlspecialchars(strip_tags($this->subject_name));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->units = htmlspecialchars(strip_tags($this->units));
        $this->course = htmlspecialchars(strip_tags($this->course));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));
        $this->specialization = htmlspecialchars(strip_tags($this->specialization));

        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":subject_code", $this->subject_code);
        $stmt->bindParam(":subject_name", $this->subject_name);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":units", $this->units);
        $stmt->bindParam(":course", $this->course);
        $stmt->bindParam(":year_level", $this->year_level);
        $stmt->bindParam(":specialization", $this->specialization);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>