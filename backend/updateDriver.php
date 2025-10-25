<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json");

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "dbuser";

try {
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON input']);
    exit;
}

$driverEmail = $input['driverEmail'] ?? null;
if (!$driverEmail) {
    echo json_encode(['status' => 'error', 'message' => 'Missing driverEmail']);
    exit;
}

// Allowed fields to update
$allowedFields = [
    'name', 'phone', 'icNumber', 'address', 'licenseNumber', 'experience', 'languages', 'availability',
    'vehicleType', 'vehicleNumber', 'emergencyContact', 'emergencyPhone'
];

// Ensure columns exist for allowed fields
try {
    foreach ($allowedFields as $col) {
        $check = $pdo->query("SHOW COLUMNS FROM tbuser LIKE '" . $col . "'");
        if ($check->rowCount() == 0) {
            switch ($col) {
                case 'name':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN name VARCHAR(100)");
                    break;
                case 'phone':
                    // original schema uses phoneNum; maintain both
                    $existsPhoneNum = $pdo->query("SHOW COLUMNS FROM tbuser LIKE 'phoneNum'");
                    if ($existsPhoneNum->rowCount() == 0) {
                        $pdo->exec("ALTER TABLE tbuser ADD COLUMN phoneNum VARCHAR(20)");
                    }
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN phone VARCHAR(20)");
                    break;
                case 'icNumber':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN icNumber VARCHAR(20)");
                    break;
                case 'address':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN address TEXT");
                    break;
                case 'licenseNumber':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN licenseNumber VARCHAR(50)");
                    break;
                case 'experience':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN experience VARCHAR(20)");
                    break;
                case 'languages':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN languages TEXT");
                    break;
                case 'availability':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN availability VARCHAR(50)");
                    break;
                case 'vehicleType':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN vehicleType VARCHAR(50)");
                    break;
                case 'vehicleNumber':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN vehicleNumber VARCHAR(50)");
                    break;
                case 'emergencyContact':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN emergencyContact VARCHAR(100)");
                    break;
                case 'emergencyPhone':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN emergencyPhone VARCHAR(20)");
                    break;
            }
        }
    }
    // ensure updatedAt exists
    $checkUpdatedAt = $pdo->query("SHOW COLUMNS FROM tbuser LIKE 'updatedAt'");
    if ($checkUpdatedAt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE tbuser ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    exit;
}

// Build dynamic update
$setParts = [];
$values = [];
foreach ($allowedFields as $field) {
    if (array_key_exists($field, $input)) {
        $setParts[] = "$field = ?";
        $values[] = $input[$field];
        // if phone is present, also sync phoneNum for backward compatibility
        if ($field === 'phone') {
            $setParts[] = "phoneNum = ?";
            $values[] = $input[$field];
        }
    }
}

if (empty($setParts)) {
    echo json_encode(['status' => 'error', 'message' => 'No fields to update']);
    exit;
}

$setSql = implode(', ', $setParts) . ", updatedAt = NOW()";

try {
    $stmt = $pdo->prepare("UPDATE tbuser SET $setSql WHERE email = ? AND userType = 'Driver'");
    $values[] = $driverEmail;
    $stmt->execute($values);

    if ($stmt->rowCount() === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Driver not found or no changes made']);
        exit;
    }

    // Return updated driver
    $get = $pdo->prepare("SELECT * FROM tbuser WHERE email = ?");
    $get->execute([$driverEmail]);
    $driver = $get->fetch(PDO::FETCH_ASSOC);

    echo json_encode(['status' => 'success', 'driver' => $driver]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}