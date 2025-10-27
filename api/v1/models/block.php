<?php
class Block {
    private $conn;
    private $table_name = "blocks";

    public $id;
    public $name;
    public $year_level;
    public $course;
    public $specialization;
    public $capacity;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET name=:name, year_level=:year_level, course=:course, specialization=:specialization, capacity=:capacity";
        $stmt = $this->conn->prepare($query);

        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));
        $this->course = htmlspecialchars(strip_tags($this->course));
        $this->specialization = htmlspecialchars(strip_tags($this->specialization));
        $this->capacity = htmlspecialchars(strip_tags($this->capacity));

        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":year_level", $this->year_level);
        $stmt->bindParam(":course", $this->course);
        $stmt->bindParam(":specialization", $this->specialization);
        $stmt->bindParam(":capacity", $this->capacity);

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

    function update() {
        $query = "UPDATE " . $this->table_name . " SET name=:name, year_level=:year_level, course=:course, specialization=:specialization, capacity=:capacity WHERE id=:id";
        $stmt = $this->conn->prepare($query);

        $this->id = htmlspecialchars(strip_tags($this->id));
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));
        $this->course = htmlspecialchars(strip_tags($this->course));
        $this->specialization = htmlspecialchars(strip_tags($this->specialization));
        $this->capacity = htmlspecialchars(strip_tags($this->capacity));

        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":year_level", $this->year_level);
        $stmt->bindParam(":course", $this->course);
        $stmt->bindParam(":specialization", $this->specialization);
        $stmt->bindParam(":capacity", $this->capacity);

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