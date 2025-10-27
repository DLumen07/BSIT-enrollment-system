<?php
class Schedule {
    private $conn;
    private $table_name = "schedules";

    public $id;
    public $block_id;
    public $subject_id;
    public $instructor_id;
    public $day_of_week;
    public $start_time;
    public $end_time;
    public $room;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET block_id=:block_id, subject_id=:subject_id, instructor_id=:instructor_id, day_of_week=:day_of_week, start_time=:start_time, end_time=:end_time, room=:room";
        $stmt = $this->conn->prepare($query);

        $this->block_id = htmlspecialchars(strip_tags($this->block_id));
        $this->subject_id = htmlspecialchars(strip_tags($this->subject_id));
        $this->instructor_id = htmlspecialchars(strip_tags($this->instructor_id));
        $this->day_of_week = htmlspecialchars(strip_tags($this->day_of_week));
        $this->start_time = htmlspecialchars(strip_tags($this->start_time));
        $this->end_time = htmlspecialchars(strip_tags($this->end_time));
        $this->room = htmlspecialchars(strip_tags($this->room));

        $stmt->bindParam(":block_id", $this->block_id);
        $stmt->bindParam(":subject_id", $this->subject_id);
        $stmt->bindParam(":instructor_id", $this->instructor_id);
        $stmt->bindParam(":day_of_week", $this->day_of_week);
        $stmt->bindParam(":start_time", $this->start_time);
        $stmt->bindParam(":end_time", $this->end_time);
        $stmt->bindParam(":room", $this->room);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    function read() {
        $query = "SELECT s.*, b.name as block_name, sub.code as subject_code, ip.name as instructor_name FROM " . $this->table_name . " s JOIN blocks b ON s.block_id = b.id JOIN subjects sub ON s.subject_id = sub.id LEFT JOIN instructor_profiles ip ON s.instructor_id = ip.user_id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    function update() {
        $query = "UPDATE " . $this->table_name . " SET block_id=:block_id, subject_id=:subject_id, instructor_id=:instructor_id, day_of_week=:day_of_week, start_time=:start_time, end_time=:end_time, room=:room WHERE id=:id";
        $stmt = $this->conn->prepare($query);

        $this->id = htmlspecialchars(strip_tags($this->id));
        $this->block_id = htmlspecialchars(strip_tags($this->block_id));
        $this->subject_id = htmlspecialchars(strip_tags($this->subject_id));
        $this->instructor_id = htmlspecialchars(strip_tags($this->instructor_id));
        $this->day_of_week = htmlspecialchars(strip_tags($this->day_of_week));
        $this->start_time = htmlspecialchars(strip_tags($this->start_time));
        $this->end_time = htmlspecialchars(strip_tags($this->end_time));
        $this->room = htmlspecialchars(strip_tags($this->room));

        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":block_id", $this->block_id);
        $stmt->bindParam(":subject_id", $this->subject_id);
        $stmt->bindParam(":instructor_id", $this->instructor_id);
        $stmt->bindParam(":day_of_week", $this->day_of_week);
        $stmt->bindParam(":start_time", $this->start_time);
        $stmt->bindParam(":end_time", $this->end_time);
        $stmt->bindParam(":room", $this->room);

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