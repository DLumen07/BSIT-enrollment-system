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
        $query = "SELECT ip.*, u.email FROM " . $this->table_name . " ip JOIN users u ON ip.user_id = u.id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    function readOne() {
        $query = "SELECT ip.*, u.email FROM " . $this->table_name . " ip JOIN users u ON ip.user_id = u.id WHERE ip.user_id = ? LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->user_id);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        $this->name = $row['name'];
        $this->avatar_url = $row['avatar_url'];
        $this->department = $row['department'];
        $this->email = $row['email'];
    }

    function update() {
        $query = "UPDATE " . $this->table_name . " SET name=:name, avatar_url=:avatar_url, department=:department WHERE user_id=:user_id";
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