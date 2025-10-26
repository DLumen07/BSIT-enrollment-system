<?php
class Block {
    private $conn;
    private $table_name = "blocks";

    public $id;
    public $name; // Renamed from block_name
    public $course;
    public $year; // Renamed from year_level
    public $specialization;
    public $capacity; // Added
    public $enrolled; // Added

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET block_name=:block_name, course=:course, year_level=:year_level, specialization=:specialization";
        $stmt = $this->conn->prepare($query);

        $this->block_name = htmlspecialchars(strip_tags($this->block_name));
        $this->course = htmlspecialchars(strip_tags($this->course));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));
        $this->specialization = htmlspecialchars(strip_tags($this->specialization));

        $stmt->bindParam(":block_name", $this->block_name);
        $stmt->bindParam(":course", $this->course);
        $stmt->bindParam(":year_level", $this->year_level);
        $stmt->bindParam(":specialization", $this->specialization);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    function read() {
        // Added capacity and enrolled, and aliased fields
        $query = "SELECT 
                    id, 
                    block_name as name, 
                    course, 
                    year_level as year, 
                    specialization, 
                    40 as capacity, 
                    0 as enrolled 
                  FROM " . $this->table_name;
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    function update() {
        $query = "UPDATE " . $this->table_name . " SET block_name=:block_name, course=:course, year_level=:year_level, specialization=:specialization WHERE id=:id";
        $stmt = $this->conn->prepare($query);

        $this->id = htmlspecialchars(strip_tags($this->id));
        $this->block_name = htmlspecialchars(strip_tags($this->block_name));
        $this->course = htmlspecialchars(strip_tags($this->course));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));
        $this->specialization = htmlspecialchars(strip_tags($this->specialization));

        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":block_name", $this->block_name);
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
}
?>