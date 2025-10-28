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
    public $middle_name;
    public $birthdate;
    public $current_address;
    public $permanent_address;
    public $nationality;
    public $religion;
    public $dialect;
    public $civil_status;
    public $status;
    public $fathers_name;
    public $fathers_occupation;
    public $mothers_name;
    public $mothers_occupation;
    public $guardians_name;
    public $guardians_occupation;
    public $guardians_address;
    public $living_with_family;
    public $boarding;
    public $differently_abled;
    public $disability;
    public $minority_group;
    public $minority;
    public $elementary_school;
    public $elem_year_graduated;
    public $secondary_school;
    public $secondary_year_graduated;
    public $collegiate_school;
    public $collegiate_year_graduated;
    public $emergency_contact_name;
    public $emergency_contact_address;
    public $emergency_contact_number;

    public function __construct($db) {
        $this->conn = $db;
    }

    function create() {
        $query = "INSERT INTO " . $this->table_name . " SET user_id=:user_id, student_id_number=:student_id_number, name=:name, avatar_url=:avatar_url, course=:course, year_level=:year_level, specialization=:specialization, sex=:sex, phone_number=:phone_number, middle_name=:middle_name, birthdate=:birthdate, current_address=:current_address, permanent_address=:permanent_address, nationality=:nationality, religion=:religion, dialect=:dialect, civil_status=:civil_status, status=:status, fathers_name=:fathers_name, fathers_occupation=:fathers_occupation, mothers_name=:mothers_name, mothers_occupation=:mothers_occupation, guardians_name=:guardians_name, guardians_occupation=:guardians_occupation, guardians_address=:guardians_address, living_with_family=:living_with_family, boarding=:boarding, differently_abled=:differently_abled, disability=:disability, minority_group=:minority_group, minority=:minority, elementary_school=:elementary_school, elem_year_graduated=:elem_year_graduated, secondary_school=:secondary_school, secondary_year_graduated=:secondary_year_graduated, collegiate_school=:collegiate_school, collegiate_year_graduated=:collegiate_year_graduated, emergency_contact_name=:emergency_contact_name, emergency_contact_address=:emergency_contact_address, emergency_contact_number=:emergency_contact_number";
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
        $this->middle_name = htmlspecialchars(strip_tags($this->middle_name));
        $this->birthdate = htmlspecialchars(strip_tags($this->birthdate));
        $this->current_address = htmlspecialchars(strip_tags($this->current_address));
        $this->permanent_address = htmlspecialchars(strip_tags($this->permanent_address));
        $this->nationality = htmlspecialchars(strip_tags($this->nationality));
        $this->religion = htmlspecialchars(strip_tags($this->religion));
        $this->dialect = htmlspecialchars(strip_tags($this->dialect));
        $this->civil_status = htmlspecialchars(strip_tags($this->civil_status));
        $this->status = htmlspecialchars(strip_tags($this->status));
        $this->fathers_name = htmlspecialchars(strip_tags($this->fathers_name));
        $this->fathers_occupation = htmlspecialchars(strip_tags($this->fathers_occupation));
        $this->mothers_name = htmlspecialchars(strip_tags($this->mothers_name));
        $this->mothers_occupation = htmlspecialchars(strip_tags($this->mothers_occupation));
        $this->guardians_name = htmlspecialchars(strip_tags($this->guardians_name));
        $this->guardians_occupation = htmlspecialchars(strip_tags($this->guardians_occupation));
        $this->guardians_address = htmlspecialchars(strip_tags($this->guardians_address));
        $this->living_with_family = htmlspecialchars(strip_tags($this->living_with_family));
        $this->boarding = htmlspecialchars(strip_tags($this->boarding));
        $this->differently_abled = htmlspecialchars(strip_tags($this->differently_abled));
        $this->disability = htmlspecialchars(strip_tags($this->disability));
        $this->minority_group = htmlspecialchars(strip_tags($this->minority_group));
        $this->minority = htmlspecialchars(strip_tags($this->minority));
        $this->elementary_school = htmlspecialchars(strip_tags($this->elementary_school));
        $this->elem_year_graduated = htmlspecialchars(strip_tags($this->elem_year_graduated));
        $this->secondary_school = htmlspecialchars(strip_tags($this->secondary_school));
        $this->secondary_year_graduated = htmlspecialchars(strip_tags($this->secondary_year_graduated));
        $this->collegiate_school = htmlspecialchars(strip_tags($this->collegiate_school));
        $this->collegiate_year_graduated = htmlspecialchars(strip_tags($this->collegiate_year_graduated));
        $this->emergency_contact_name = htmlspecialchars(strip_tags($this->emergency_contact_name));
        $this->emergency_contact_address = htmlspecialchars(strip_tags($this->emergency_contact_address));
        $this->emergency_contact_number = htmlspecialchars(strip_tags($this->emergency_contact_number));

        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":student_id_number", $this->student_id_number);
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":avatar_url", $this->avatar_url);
        $stmt->bindParam(":course", $this->course);
        $stmt->bindParam(":year_level", $this->year_level);
        $stmt->bindParam(":specialization", $this->specialization);
        $stmt->bindParam(":sex", $this->sex);
        $stmt->bindParam(":phone_number", $this->phone_number);
        $stmt->bindParam(":middle_name", $this->middle_name);
        $stmt->bindParam(":birthdate", $this->birthdate);
        $stmt->bindParam(":current_address", $this->current_address);
        $stmt->bindParam(":permanent_address", $this->permanent_address);
        $stmt->bindParam(":nationality", $this->nationality);
        $stmt->bindParam(":religion", $this->religion);
        $stmt->bindParam(":dialect", $this->dialect);
        $stmt->bindParam(":civil_status", $this->civil_status);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":fathers_name", $this->fathers_name);
        $stmt->bindParam(":fathers_occupation", $this->fathers_occupation);
        $stmt->bindParam(":mothers_name", $this->mothers_name);
        $stmt->bindParam(":mothers_occupation", $this->mothers_occupation);
        $stmt->bindParam(":guardians_name", $this->guardians_name);
        $stmt->bindParam(":guardians_occupation", $this->guardians_occupation);
        $stmt->bindParam(":guardians_address", $this->guardians_address);
        $stmt->bindParam(":living_with_family", $this->living_with_family);
        $stmt->bindParam(":boarding", $this->boarding);
        $stmt->bindParam(":differently_abled", $this->differently_abled);
        $stmt->bindParam(":disability", $this->disability);
        $stmt->bindParam(":minority_group", $this->minority_group);
        $stmt->bindParam(":minority", $this->minority);
        $stmt->bindParam(":elementary_school", $this->elementary_school);
        $stmt->bindParam(":elem_year_graduated", $this->elem_year_graduated);
        $stmt->bindParam(":secondary_school", $this->secondary_school);
        $stmt->bindParam(":secondary_year_graduated", $this->secondary_year_graduated);
        $stmt->bindParam(":collegiate_school", $this->collegiate_school);
        $stmt->bindParam(":collegiate_year_graduated", $this->collegiate_year_graduated);
        $stmt->bindParam(":emergency_contact_name", $this->emergency_contact_name);
        $stmt->bindParam(":emergency_contact_address", $this->emergency_contact_address);
        $stmt->bindParam(":emergency_contact_number", $this->emergency_contact_number);

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
        $query = "UPDATE " . $this->table_name . " SET student_id_number=:student_id_number, name=:name, avatar_url=:avatar_url, course=:course, year_level=:year_level, enrollment_status=:enrollment_status, block_id=:block_id, specialization=:specialization, sex=:sex, phone_number=:phone_number, middle_name=:middle_name, birthdate=:birthdate, current_address=:current_address, permanent_address=:permanent_address, nationality=:nationality, religion=:religion, dialect=:dialect, civil_status=:civil_status, status=:status, fathers_name=:fathers_name, fathers_occupation=:fathers_occupation, mothers_name=:mothers_name, mothers_occupation=:mothers_occupation, guardians_name=:guardians_name, guardians_occupation=:guardians_occupation, guardians_address=:guardians_address, living_with_family=:living_with_family, boarding=:boarding, differently_abled=:differently_abled, disability=:disability, minority_group=:minority_group, minority=:minority, elementary_school=:elementary_school, elem_year_graduated=:elem_year_graduated, secondary_school=:secondary_school, secondary_year_graduated=:secondary_year_graduated, collegiate_school=:collegiate_school, collegiate_year_graduated=:collegiate_year_graduated, emergency_contact_name=:emergency_contact_name, emergency_contact_address=:emergency_contact_address, emergency_contact_number=:emergency_contact_number WHERE user_id=:user_id";
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
        $this->middle_name = htmlspecialchars(strip_tags($this->middle_name));
        $this->birthdate = htmlspecialchars(strip_tags($this->birthdate));
        $this->current_address = htmlspecialchars(strip_tags($this->current_address));
        $this->permanent_address = htmlspecialchars(strip_tags($this->permanent_address));
        $this->nationality = htmlspecialchars(strip_tags($this->nationality));
        $this->religion = htmlspecialchars(strip_tags($this->religion));
        $this->dialect = htmlspecialchars(strip_tags($this->dialect));
        $this->civil_status = htmlspecialchars(strip_tags($this->civil_status));
        $this->status = htmlspecialchars(strip_tags($this->status));
        $this->fathers_name = htmlspecialchars(strip_tags($this->fathers_name));
        $this->fathers_occupation = htmlspecialchars(strip_tags($this->fathers_occupation));
        $this->mothers_name = htmlspecialchars(strip_tags($this->mothers_name));
        $this->mothers_occupation = htmlspecialchars(strip_tags($this->mothers_occupation));
        $this->guardians_name = htmlspecialchars(strip_tags($this->guardians_name));
        $this->guardians_occupation = htmlspecialchars(strip_tags($this->guardians_occupation));
        $this->guardians_address = htmlspecialchars(strip_tags($this->guardians_address));
        $this->living_with_family = htmlspecialchars(strip_tags($this->living_with_family));
        $this->boarding = htmlspecialchars(strip_tags($this->boarding));
        $this->differently_abled = htmlspecialchars(strip_tags($this->differently_abled));
        $this->disability = htmlspecialchars(strip_tags($this->disability));
        $this->minority_group = htmlspecialchars(strip_tags($this->minority_group));
        $this->minority = htmlspecialchars(strip_tags($this->minority));
        $this->elementary_school = htmlspecialchars(strip_tags($this->elementary_school));
        $this->elem_year_graduated = htmlspecialchars(strip_tags($this->elem_year_graduated));
        $this->secondary_school = htmlspecialchars(strip_tags($this->secondary_school));
        $this->secondary_year_graduated = htmlspecialchars(strip_tags($this->secondary_year_graduated));
        $this->collegiate_school = htmlspecialchars(strip_tags($this->collegiate_school));
        $this->collegiate_year_graduated = htmlspecialchars(strip_tags($this->collegiate_year_graduated));
        $this->emergency_contact_name = htmlspecialchars(strip_tags($this->emergency_contact_name));
        $this->emergency_contact_address = htmlspecialchars(strip_tags($this->emergency_contact_address));
        $this->emergency_contact_number = htmlspecialchars(strip_tags($this->emergency_contact_number));

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
        $stmt->bindParam(":middle_name", $this->middle_name);
        $stmt->bindParam(":birthdate", $this->birthdate);
        $stmt->bindParam(":current_address", $this->current_address);
        $stmt->bindParam(":permanent_address", $this->permanent_address);
        $stmt->bindParam(":nationality", $this->nationality);
        $stmt->bindParam(":religion", $this->religion);
        $stmt->bindParam(":dialect", $this->dialect);
        $stmt->bindParam(":civil_status", $this->civil_status);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":fathers_name", $this->fathers_name);
        $stmt->bindParam(":fathers_occupation", $this->fathers_occupation);
        $stmt->bindParam(":mothers_name", $this->mothers_name);
        $stmt->bindParam(":mothers_occupation", $this->mothers_occupation);
        $stmt->bindParam(":guardians_name", $this->guardians_name);
        $stmt->bindParam(":guardians_occupation", $this->guardians_occupation);
        $stmt->bindParam(":guardians_address", $this->guardians_address);
        $stmt->bindParam(":living_with_family", $this->living_with_family);
        $stmt->bindParam(":boarding", $this->boarding);
        $stmt->bindParam(":differently_abled", $this->differently_abled);
        $stmt->bindParam(":disability", $this->disability);
        $stmt->bindParam(":minority_group", $this->minority_group);
        $stmt->bindParam(":minority", $this->minority);
        $stmt->bindParam(":elementary_school", $this->elementary_school);
        $stmt->bindParam(":elem_year_graduated", $this->elem_year_graduated);
        $stmt->bindParam(":secondary_school", $this->secondary_school);
        $stmt->bindParam(":secondary_year_graduated", $this->secondary_year_graduated);
        $stmt->bindParam(":collegiate_school", $this->collegiate_school);
        $stmt->bindParam(":collegiate_year_graduated", $this->collegiate_year_graduated);
        $stmt->bindParam(":emergency_contact_name", $this->emergency_contact_name);
        $stmt->bindParam(":emergency_contact_address", $this->emergency_contact_address);
        $stmt->bindParam(":emergency_contact_number", $this->emergency_contact_number);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>