<?php
class EnrollmentApplication {
    private $conn;
    private $table_name = "enrollment_applications";

    public $id;
    public $student_user_id;
    public $status;
    public $block_name;
    public $submitted_at;
    public $rejection_reason;
    public $form_data;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET student_user_id=:student_user_id, status=:status, block_name=:block_name, form_data=:form_data, submitted_at=NOW()";
        $stmt = $this->conn->prepare($query);

        $this->student_user_id = htmlspecialchars(strip_tags($this->student_user_id));
        $this->status = htmlspecialchars(strip_tags($this->status));
        $this->block_name = htmlspecialchars(strip_tags($this->block_name));
        $this->form_data = json_encode($this->form_data);

        $stmt->bindParam(":student_user_id", $this->student_user_id);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":block_name", $this->block_name);
        $stmt->bindParam(":form_data", $this->form_data);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    function read() {
        $query = "SELECT * FROM " . $this->table_name . " WHERE status = 'pending'";
        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    function updateStatus() {
        $query = "UPDATE " . $this->table_name . " SET status=:status, rejection_reason=:rejection_reason WHERE id=:id";
        $stmt = $this->conn->prepare($query);

        $this->id = htmlspecialchars(strip_tags($this->id));
        $this->status = htmlspecialchars(strip_tags($this->status));
        $this->rejection_reason = htmlspecialchars(strip_tags($this->rejection_reason));

        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":rejection_reason", $this->rejection_reason);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>