<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle OPTIONS request (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "dbuser";

// Connect to DB
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    exit(json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]));
}

// Query
$sql = "SELECT 
            tbbook.pickup, 
            tbbook.destination, 
            tbbook.date, 
            tbbook.time, 
            tbbook.specialNeeds, 
            tbbook.recurring, 
            tbbook.email,
            tbbook.status,
            tbuser.name,
            tbbook.driver_email,
            tbbook.ride_id
        FROM tbbook
        INNER JOIN tbuser ON tbbook.email = tbuser.email
        ORDER BY tbbook.date DESC, tbbook.time DESC";

$result = $conn->query($sql);

$bookings = [];
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $bookings[] = $row;
    }
}

// Always return JSON
echo json_encode($bookings);

$conn->close();
?>
