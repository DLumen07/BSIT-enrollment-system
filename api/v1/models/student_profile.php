<?php
class StudentProfile {
    private $conn;
    private $table_name = "student_profiles";

    public $user_id;
    public $name;
    public $avatar_url;
    public $course;
    public $year_level;
    public $specialization;
    public $block;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET user_id=:user_id, name=:name, avatar_url=:avatar_url, course=:course, year_level=:year_level, specialization=:specialization, block=:block";
        $stmt = $this->conn->prepare($query);

        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->avatar_url = htmlspecialchars(strip_tags($this->avatar_url));
        $this->course = htmlspecialchars(strip_tags($this->course));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));
        $this->specialization = htmlspecialchars(strip_tags($this->specialization));
        $this->block = htmlspecialchars(strip_tags($this->block));

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":avatar_url", $this->avatar_url);
        $stmt->bindParam(":course", $this->course);
        $stmt->bindParam(":year_level", $this->year_level);
        $stmt->bindParam(":specialization", $this->specialization);
        $stmt->bindParam(":block", $this->block);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    function read() {
        $query = "SELECT sp.*, u.email FROM " . $this->table_name . " sp JOIN users u ON sp.user_id = u.id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    function update() {
        $query = "UPDATE " . $this->table_name . " SET name=:name, avatar_url=:avatar_url, course=:course, year_level=:year_level, specialization=:specialization, block=:block WHERE user_id=:user_id";
        $stmt = $this->conn->prepare($query);

        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->avatar_url = htmlspecialchars(strip_tags($this->avatar_url));
        $this->course = htmlspecialchars(strip_tags($this->course));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));
        $this->specialization = htmlspecialchars(strip_tags($this->specialization));
        $this->block = htmlspecialchars(strip_tags($this->block));

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":avatar_url", $this->avatar_url);
        $stmt->bindParam(":course", $this->course);
        $stmt->bindParam(":year_level", $this->year_level);
        $stmt->bindParam(":specialization", $this->specialization);
        $stmt->bindParam(":block", $this->block);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    function delete() {
        $query = "DELETE FROM " . $this->table_name . " WHERE user_id = ?";
        $stmt = $this->conn->prepare($query);
        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $stmt->bindParam(1, $this->user_id);
        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>