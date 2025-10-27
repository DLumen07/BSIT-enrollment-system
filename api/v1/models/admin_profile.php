<?php
class AdminProfile {
    private $conn;
    private $table_name = "admin_profiles";

    public $user_id;
    public $name;
    public $avatar_url;
    public $admin_role;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET user_id=:user_id, name=:name, avatar_url=:avatar_url, admin_role=:admin_role";
        $stmt = $this->conn->prepare($query);

        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->avatar_url = htmlspecialchars(strip_tags($this->avatar_url));
        $this->admin_role = htmlspecialchars(strip_tags($this->admin_role));

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":avatar_url", $this->avatar_url);
        $stmt->bindParam(":admin_role", $this->admin_role);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    function read() {
        $query = "SELECT ap.*, u.email FROM " . $this->table_name . " ap JOIN users u ON ap.user_id = u.id";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    function update() {
        $query = "UPDATE " . $this->table_name . " SET name=:name, avatar_url=:avatar_url, admin_role=:admin_role WHERE user_id=:user_id";
        $stmt = $this->conn->prepare($query);

        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->avatar_url = htmlspecialchars(strip_tags($this->avatar_url));
        $this->admin_role = htmlspecialchars(strip_tags($this->admin_role));

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":avatar_url", $this->avatar_url);
        $stmt->bindParam(":admin_role", $this->admin_role);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>