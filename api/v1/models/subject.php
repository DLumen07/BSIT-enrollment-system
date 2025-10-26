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
    public $prerequisite;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET subject_code=:subject_code, subject_name=:subject_name, description=:description, units=:units, course=:course, year_level=:year_level, specialization=:specialization, prerequisite=:prerequisite";
        $stmt = $this->conn->prepare($query);

        $this->subject_code = htmlspecialchars(strip_tags($this->subject_code));
        $this->subject_name = htmlspecialchars(strip_tags($this->subject_name));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->units = htmlspecialchars(strip_tags($this->units));
        $this->course = htmlspecialchars(strip_tags($this->course));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));
        $this->specialization = htmlspecialchars(strip_tags($this->specialization));
        $this->prerequisite = htmlspecialchars(strip_tags($this->prerequisite));

        $stmt->bindParam(":subject_code", $this->subject_code);
        $stmt->bindParam(":subject_name", $this->subject_name);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":units", $this->units);
        $stmt->bindParam(":course", $this->course);
        $stmt->bindParam(":year_level", $this->year_level);
        $stmt->bindParam(":specialization", $this->specialization);
        $stmt->bindParam(":prerequisite", $this->prerequisite);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
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

    function readOne() {
        $query = "SELECT * FROM " . $this->table_name . " WHERE id = ? LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $this->subject_code = $row['subject_code'];
        $this->subject_name = $row['subject_name'];
        $this->description = $row['description'];
        $this->units = $row['units'];
        $this->course = $row['course'];
        $this->year_level = $row['year_level'];
        $this->specialization = $row['specialization'];
        $this->prerequisite = $row['prerequisite'];
    }

    function update() {
        $query = "UPDATE " . $this->table_name . " SET subject_code=:subject_code, subject_name=:subject_name, description=:description, units=:units, course=:course, year_level=:year_level, specialization=:specialization, prerequisite=:prerequisite WHERE id=:id";
        $stmt = $this->conn->prepare($query);

        $this->id = htmlspecialchars(strip_tags($this->id));
        $this->subject_code = htmlspecialchars(strip_tags($this->subject_code));
        $this->subject_name = htmlspecialchars(strip_tags($this->subject_name));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->units = htmlspecialchars(strip_tags($this->units));
        $this->course = htmlspecialchars(strip_tags($this->course));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));
        $this->specialization = htmlspecialchars(strip_tags($this->specialization));
        $this->prerequisite = htmlspecialchars(strip_tags($this->prerequisite));

        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":subject_code", $this->subject_code);
        $stmt->bindParam(":subject_name", $this->subject_name);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":units", $this->units);
        $stmt->bindParam(":course", $this->course);
        $stmt->bindParam(":year_level", $this->year_level);
        $stmt->bindParam(":specialization", $this->specialization);
        $stmt->bindParam(":prerequisite", $this->prerequisite);

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