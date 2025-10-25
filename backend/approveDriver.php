<?php
header("Access-Control-Allow-Origin: *"); // allow all origins
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// if it's a preflight (OPTIONS) request, return immediately
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}


// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "dbuser";

try {
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $driverEmail = $input['driverEmail'] ?? null;
    $action = $input['action'] ?? null;

    if (!$driverEmail || !$action) {
        echo json_encode(['status' => 'error', 'message' => 'Missing required parameters']);
        exit;
    }

    if (!in_array($action, ['approved', 'rejected', 'pending'])) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        exit;
    }

    try {
        // Check if status and updatedAt columns exist, if not create them
        $checkStatus = $pdo->query("SHOW COLUMNS FROM tbuser LIKE 'status'");
        if ($checkStatus->rowCount() == 0) {
            $pdo->query("ALTER TABLE tbuser ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
        }
        
        $checkUpdatedAt = $pdo->query("SHOW COLUMNS FROM tbuser LIKE 'updatedAt'");
        if ($checkUpdatedAt->rowCount() == 0) {
            $pdo->query("ALTER TABLE tbuser ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        }

        // Update driver status
        $stmt = $pdo->prepare("UPDATE tbuser SET status = ?, updatedAt = NOW() WHERE email = ? AND userType = 'Driver'");
        $stmt->execute([$action, $driverEmail]);

        if ($stmt->rowCount() === 0) {
            echo json_encode(['status' => 'error', 'message' => 'Driver not found']);
            exit;
        }

        // Get driver details (email notifications disabled)
        $stmt = $pdo->prepare("SELECT * FROM tbuser WHERE email = ?");
        $stmt->execute([$driverEmail]);
        $driver = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($driver) {
            // Email notifications are disabled as per requirements.
            // No email will be sent and no log will be written.
        }

        echo json_encode([
            'status' => 'success',
            'message' => 'Driver ' . $action . ' successfully!'
        ]);

    } catch(PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
}
?>
