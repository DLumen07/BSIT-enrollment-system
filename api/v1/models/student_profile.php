<?php
class StudentProfile {
    private $conn;
    private $table_name = "student_profiles";

    public $user_id;
    public $student_id_number;
    public $name;
    public $avatar_url;
    public $course;
    public $year_level;
    public $enrollment_status;
    public $block_id;
    public $specialization;
    public $sex;
    public $phone_number;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET user_id=:user_id, student_id_number=:student_id_number, name=:name, avatar_url=:avatar_url, course=:course, year_level=:year_level, specialization=:specialization, sex=:sex, phone_number=:phone_number";
        $stmt = $this->conn->prepare($query);

        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $this->student_id_number = htmlspecialchars(strip_tags($this->student_id_number));
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->avatar_url = htmlspecialchars(strip_tags($this->avatar_url));
        $this->course = htmlspecialchars(strip_tags($this->course));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));
        $this->specialization = htmlspecialchars(strip_tags($this->specialization));
        $this->sex = htmlspecialchars(strip_tags($this->sex));
        $this->phone_number = htmlspecialchars(strip_tags($this->phone_number));

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":student_id_number", $this->student_id_number);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":avatar_url", $this->avatar_url);
        $stmt->bindParam(":course", $this->course);
        $stmt->bindParam(":year_level", $this->year_level);
        $stmt->bindParam(":specialization", $this->specialization);
        $stmt->bindParam(":sex", $this->sex);
        $stmt->bindParam(":phone_number", $this->phone_number);

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
        $query = "UPDATE " . $this->table_name . " SET student_id_number=:student_id_number, name=:name, avatar_url=:avatar_url, course=:course, year_level=:year_level, enrollment_status=:enrollment_status, block_id=:block_id, specialization=:specialization, sex=:sex, phone_number=:phone_number WHERE user_id=:user_id";
        $stmt = $this->conn->prepare($query);

        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $this->student_id_number = htmlspecialchars(strip_tags($this->student_id_number));
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->avatar_url = htmlspecialchars(strip_tags($this->avatar_url));
        $this->course = htmlspecialchars(strip_tags($this->course));
        $this->year_level = htmlspecialchars(strip_tags($this->year_level));
        $this->enrollment_status = htmlspecialchars(strip_tags($this->enrollment_status));
        $this->block_id = htmlspecialchars(strip_tags($this->block_id));
        $this->specialization = htmlspecialchars(strip_tags($this->specialization));
        $this->sex = htmlspecialchars(strip_tags($this->sex));
        $this->phone_number = htmlspecialchars(strip_tags($this->phone_number));

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":student_id_number", $this->student_id_number);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":avatar_url", $this->avatar_url);
        $stmt->bindParam(":course", $this->course);
        $stmt->bindParam(":year_level", $this->year_level);
        $stmt->bindParam(":enrollment_status", $this->enrollment_status);
        $stmt->bindParam(":block_id", $this->block_id);
        $stmt->bindParam(":specialization", $this->specialization);
        $stmt->bindParam(":sex", $this->sex);
        $stmt->bindParam(":phone_number", $this->phone_number);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>