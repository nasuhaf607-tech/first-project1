<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

$input = json_decode(file_get_contents("php://input"), true);

$email = $input['email'] ?? '';
$password = $input['password'] ?? '';

// Connect to MySQL
$conn = new mysqli("localhost", "root", "", "dbuser");

if ($conn->connect_error) {
    echo json_encode(["message" => "Database connection failed"]);
    exit();
}

// Query user by email
$stmt = $conn->prepare("SELECT * FROM tbuser WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["message" => "Invalid email or password"]);
    exit();
}

$user = $result->fetch_assoc();

// If you stored password with password_hash (✅ recommended)
if (!password_verify($password, $user['password'])) {
     echo json_encode(["message" => "Invalid email or password"]);
     exit();
 }

echo json_encode([
    "message" => "Login successful",
    "email"   => $user['email'],
    "name"    => $user['name'],
    "userType"=> $user['userType'] ?? null
]);

$conn->close();
?>
