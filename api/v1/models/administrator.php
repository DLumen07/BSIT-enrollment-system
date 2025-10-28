<?php
class Administrator {
    private $conn;
    private $table_name = "administrators";

    public $id;
    public $name;
    public $email;
    public $role; // Add role property

    public function __construct($db) {
        $this->conn = $db;
    }

    function read() {
        // Join with users table to get the role
        $query = "SELECT a.id, a.name, u.email, u.role 
                  FROM " . $this->table_name . " a
                  LEFT JOIN users u ON a.email = u.email";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }
}
?>