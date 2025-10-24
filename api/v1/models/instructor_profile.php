<?php
class InstructorProfile {
    private $conn;
    private $table_name = "instructor_profiles";

    public $user_id;
    public $name;
    public $avatar_url;
    public $department;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET user_id=:user_id, name=:name, avatar_url=:avatar_url, department=:department";
        $stmt = $this->conn->prepare($query);

        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->avatar_url = htmlspecialchars(strip_tags($this->avatar_url));
        $this->department = htmlspecialchars(strip_tags($this->department));

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":avatar_url", $this->avatar_url);
        $stmt->bindParam(":department", $this->department);

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