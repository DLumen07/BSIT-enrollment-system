<?php
class Subject {
    private $conn;
    private $table_name = "subjects";

    public $id;
    public $code;
    public $description;
    public $units;
    public $prerequisite_id;
    public $year_level;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET code=:code, description=:description, units=:units, prerequisite_id=:prerequisite_id, year_level=:year_level";
        $stmt = $this->conn->prepare($query);

        $this->code = htmlspecialchars(strip_tags($this->code));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->units = htmlspecialchars(strip_tags($this->units));
        $this->prerequisite_id = htmlspecialchars(strip_tags($this->prerequisite_id));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));

        $stmt->bindParam(":code", $this->code);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":units", $this->units);
        $stmt->bindParam(":prerequisite_id", $this->prerequisite_id);
        $stmt->bindParam(":year_level", $this->year_level);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    function read() {
        $query = "SELECT s1.*, s2.code as prerequisite_code FROM " . $this->table_name . " s1 LEFT JOIN " . $this->table_name . " s2 ON s1.prerequisite_id = s2.id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    function update() {
        $query = "UPDATE " . $this->table_name . " SET code=:code, description=:description, units=:units, prerequisite_id=:prerequisite_id, year_level=:year_level WHERE id=:id";
        $stmt = $this->conn->prepare($query);

        $this->id = htmlspecialchars(strip_tags($this->id));
        $this->code = htmlspecialchars(strip_tags($this->code));
        $this->description = htmlspecialchars(strip_tags($this->description));
        $this->units = htmlspecialchars(strip_tags($this->units));
        $this->prerequisite_id = htmlspecialchars(strip_tags($this->prerequisite_id));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));

        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":code", $this->code);
        $stmt->bindParam(":description", $this->description);
        $stmt->bindParam(":units", $this->units);
        $stmt->bindParam(":prerequisite_id", $this->prerequisite_id);
        $stmt->bindParam(":year_level", $this->year_level);

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