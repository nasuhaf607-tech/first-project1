<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/* --- 1. Connect DB --- */
$conn = new mysqli("localhost", "root", "", "dbuser");
if ($conn->connect_error) {
    exit(json_encode(["success" => false, "message" => "DB connection failed: " . $conn->connect_error]));
}

/* --- 2. Parse input --- */
$data = json_decode(file_get_contents("php://input"), true);
$passengerEmail = $data["passenger_email"] ?? "";
$bookingDate    = $data["date"] ?? "";
$bookingTime    = $data["time"] ?? "";
$driverEmail    = $data["driver_email"] ?? "";
$latitude       = isset($data["latitude"]) ? floatval($data["latitude"]) : null;
$longitude      = isset($data["longitude"]) ? floatval($data["longitude"]) : null;

if (!$passengerEmail || !$bookingDate || !$bookingTime || !$driverEmail) {
    exit(json_encode(["success" => false, "message" => "Missing fields"]));
}

/* --- 3. Get ride_id from tbbook --- */
$sql = "SELECT ride_id FROM tbbook WHERE email=? AND date=? AND time=? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sss", $passengerEmail, $bookingDate, $bookingTime);
$stmt->execute();
$result = $stmt->get_result();
$ride = $result->fetch_assoc();
$stmt->close();

if (!$ride) {
    exit(json_encode(["success" => false, "message" => "Booking not found"]));
}
$ride_id = $ride["ride_id"];  // string, not int

/* --- 4. Verify driver exists --- */
$sql = "SELECT email, status FROM tbuser WHERE email=? AND userType='Driver' LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $driverEmail);
$stmt->execute();
$result = $stmt->get_result();
$driver = $result->fetch_assoc();
$stmt->close();

if (!$driver) {
    exit(json_encode(["success" => false, "message" => "Driver not found or not authorized"]));
}

// --- 4b. Enforce approval: only approved drivers can accept bookings ---
$driverStatus = strtolower(trim($driver['status'] ?? ''));
if ($driverStatus !== 'approved') {
    exit(json_encode(["success" => false, "message" => "Driver not approved by admin."]));
}

/* --- 5. Update booking with driver assignment --- */
$sql = "UPDATE tbbook SET status='Accepted', driver_email=? WHERE ride_id=?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $driverEmail, $ride_id);
$stmt->execute();
$stmt->close();

/* --- 6. Ensure tblocation table exists --- */
$conn->query("CREATE TABLE IF NOT EXISTS tblocation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id VARCHAR(64) NOT NULL,
    driver_id VARCHAR(100) NOT NULL,
    lat DOUBLE NOT NULL,
    lng DOUBLE NOT NULL,
    speed DOUBLE DEFAULT NULL,
    heading DOUBLE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_driver_ride (ride_id, driver_id)
) ENGINE=InnoDB");

/* --- 7. Insert/Update driver location --- */
if ($latitude !== null && $longitude !== null) {
    $sql = "INSERT INTO tblocation (driver_id, ride_id, lat, lng) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                lat=VALUES(lat), 
                lng=VALUES(lng), 
                created_at=CURRENT_TIMESTAMP";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssdd", $driverEmail, $ride_id, $latitude, $longitude);
    $stmt->execute();
    $stmt->close();
}

echo json_encode([
    "success" => true,
    "message" => "Booking accepted and driver location updated",
    "ride_id" => $ride_id,
    "driver_email" => $driverEmail,
    "lat" => $latitude,
    "lng" => $longitude
]);

$conn->close();
?>
