<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json");

$input = json_decode(file_get_contents("php://input"), true);

// ✅ Collect input values
$pickup        = $input['pickup'] ?? '';
$pickup_lat    = $input['pickup_lat'] ?? null;
$pickup_lng    = $input['pickup_lng'] ?? null;
$destination   = $input['destination'] ?? '';
$dest_lat      = $input['dest_lat'] ?? null;
$dest_lng      = $input['dest_lng'] ?? null;
$date          = $input['date'] ?? '';
$time          = $input['time'] ?? '';
$specialNeeds  = $input['specialNeeds'] ?? '';
$recurring     = isset($input['recurring']) && $input['recurring'] ? 1 : 0; // ✅ store as tinyint
$email         = $input['email'] ?? '';
$status        = "Pending";
$driver_email  = null;

// ✅ Generate unique ride ID
$rideId = 'RIDE-' . time() . '-' . rand(1000, 9999);

// ✅ Connect to DB
$conn = new mysqli("localhost", "root", "", "dbuser");
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

// ✅ Prevent duplicate booking on same date/time
$stmt = $conn->prepare("SELECT email FROM tbbook WHERE date = ? AND time = ?");
$stmt->bind_param("ss", $date, $time);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo json_encode(["success" => false, "message" => "A booking already exists for this date and time."]);
} else {
    // ✅ Insert booking with lat/lng
    $insert = $conn->prepare("
        INSERT INTO tbbook 
        (pickup, pickup_lat, pickup_lng, destination, dest_lat, dest_lng, date, time, specialNeeds, recurring, email, status, driver_email, ride_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $insert->bind_param(
        "sddsdssssissss",   // 14 params
        $pickup,            // s
        $pickup_lat,        // d
        $pickup_lng,        // d
        $destination,       // s
        $dest_lat,          // d
        $dest_lng,          // d
        $date,              // s
        $time,              // s
        $specialNeeds,      // s
        $recurring,         // i (tinyint 0/1)
        $email,             // s
        $status,            // s
        $driver_email,      // s
        $rideId             // s
    );

    if ($insert->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Booking successful!",
            "ride_id" => $rideId
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Booking failed: " . $insert->error]);
    }
}

$conn->close();
?>
