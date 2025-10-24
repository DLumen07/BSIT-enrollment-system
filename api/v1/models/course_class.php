<?php
class CourseClass {
    private $conn;
    private $table_name = "classes";

    public $id;
    public $subject_id;
    public $instructor_id;
    public $block_id;
    public $room;
    public $day_of_week;
    public $start_time;
    public $end_time;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET subject_id=:subject_id, instructor_id=:instructor_id, block_id=:block_id, room=:room, day_of_week=:day_of_week, start_time=:start_time, end_time=:end_time";
        $stmt = $this->conn->prepare($query);

        $this->subject_id = htmlspecialchars(strip_tags($this->subject_id));
        $this->instructor_id = htmlspecialchars(strip_tags($this->instructor_id));
        $this->block_id = htmlspecialchars(strip_tags($this->block_id));
        $this->room = htmlspecialchars(strip_tags($this->room));
        $this->day_of_week = htmlspecialchars(strip_tags($this->day_of_week));
        $this->start_time = htmlspecialchars(strip_tags($this->start_time));
        $this->end_time = htmlspecialchars(strip_tags($this->end_time));

        $stmt->bindParam(":subject_id", $this->subject_id);
        $stmt->bindParam(":instructor_id", $this->instructor_id);
        $stmt->bindParam(":block_id", $this->block_id);
        $stmt->bindParam(":room", $this->room);
        $stmt->bindParam(":day_of_week", $this->day_of_week);
        $stmt->bindParam(":start_time", $this->start_time);
        $stmt->bindParam(":end_time", $this->end_time);

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
}
?>