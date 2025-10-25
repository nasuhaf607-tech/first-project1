<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

// Capture input JSON
$input = json_decode(file_get_contents("php://input"), true);

if (!$input) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid JSON input"
    ]);
    exit;
}

// Collect data from frontend
$name     = $input['name'] ?? '';
$email    = $input['email'] ?? '';
$phoneNum = $input['phone'] ?? '';
$password = $input['password'] ?? '';
$userType = $input['userType'] ?? 'user';

// Validate required fields
if (empty($name) || empty($email) || empty($phoneNum) || empty($password)) {
    echo json_encode([
        "status" => "error",
        "message" => "All fields are required"
    ]);
    exit;
}

// Connect to DB
$conn = new mysqli("localhost", "root", "", "dbuser");
if ($conn->connect_error) {
    echo json_encode([
        "status" => "error",
        "message" => "Database connection failed: " . $conn->connect_error
    ]);
    exit;
}

// Check if email already exists
$stmt = $conn->prepare("SELECT * FROM tbuser WHERE email = ?");
if (!$stmt) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed (check SELECT): " . $conn->error
    ]);
    exit;
}
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result && $result->num_rows > 0) {
    echo json_encode([
        "status" => "error",
        "message" => "Email already registered"
    ]);
    exit;
}

// Insert new user
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare("INSERT INTO tbuser (name, userType, phoneNum, email, password) VALUES (?, ?, ?, ?, ?)");
if (!$stmt) {
    echo json_encode([
        "status" => "error",
        "message" => "Prepare failed (check INSERT): " . $conn->error
    ]);
    exit;
}
$stmt->bind_param("sssss", $name, $userType, $phoneNum, $email, $hashedPassword);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success",
        "message" => "User registered successfully"
    ]);
} else {
    echo json_encode([
        "status" => "error",
        "message" => "Failed to register user: " . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>
