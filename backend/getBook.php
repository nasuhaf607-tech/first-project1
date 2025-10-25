<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ✅ Connect to Database
$conn = new mysqli("localhost", "root", "", "dbuser");
if ($conn->connect_error) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed"
    ]);
    exit();
}

// ✅ Get email parameter
$email = $_GET['email'] ?? '';

if (empty($email)) {
    echo json_encode([
        "success" => false,
        "message" => "No email provided",
        "bookings" => []
    ]);
    exit();
}

// ✅ SQL Query
$sql = "SELECT 
            ride_id,
            pickup,
            pickup_lat,
            pickup_lng,
            destination,
            dest_lat,
            dest_lng,
            date,
            time,
            specialNeeds,
            recurring,
            status
        FROM tbbook
        WHERE email = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

$bookings = [];
while ($row = $result->fetch_assoc()) {
    $bookings[] = [
        "ride_id" => $row['ride_id'],
        "pickup" => [
            "address" => $row['pickup'], // ✅ clearer naming
            "lat" => isset($row['pickup_lat']) ? floatval($row['pickup_lat']) : 0,
            "lng" => isset($row['pickup_lng']) ? floatval($row['pickup_lng']) : 0
        ],
        "destination" => [
            "address" => $row['destination'],
            "lat" => isset($row['dest_lat']) ? floatval($row['dest_lat']) : 0,
            "lng" => isset($row['dest_lng']) ? floatval($row['dest_lng']) : 0
        ],
        "date" => $row['date'],
        "time" => $row['time'],
        "specialNeeds" => $row['specialNeeds'],
        "recurring" => $row['recurring'],
        "status" => $row['status']
    ];
}

// ✅ Return JSON
echo json_encode([
    "success" => true,
    "bookings" => $bookings
], JSON_PRETTY_PRINT);

$stmt->close();
$conn->close();
?>
