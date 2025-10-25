<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');

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

if (!isset($_SERVER['CONTENT_TYPE']) || strpos($_SERVER['CONTENT_TYPE'], 'multipart/form-data') === false) {
    echo json_encode(['status' => 'error', 'message' => 'Content-Type must be multipart/form-data']);
    exit;
}

$email = $_POST['email'] ?? null;
if (!$email) {
    echo json_encode(['status' => 'error', 'message' => 'Missing email']);
    exit;
}

// Ensure uploads directory exists
$uploadDir = '../uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

$allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
$maxFileSize = 5 * 1024 * 1024; // 5MB

$updates = [];
$filenames = [];

function processFile($key, $prefix, $allowedTypes, $maxFileSize, $uploadDir, &$updates, &$filenames) {
    if (!isset($_FILES[$key]) || $_FILES[$key]['error'] !== UPLOAD_ERR_OK) return;
    if (!in_array($_FILES[$key]['type'], $allowedTypes)) return;
    if ($_FILES[$key]['size'] > $maxFileSize) return;

    $safeName = preg_replace('/[^A-Za-z0-9_\-.]/', '_', basename($_FILES[$key]['name']));
    $fileName = $prefix . '_' . time() . '_' . $safeName;
    if (move_uploaded_file($_FILES[$key]['tmp_name'], $uploadDir . $fileName)) {
        $updates[$key] = $fileName;
        $filenames[$key] = $fileName;
    }
}

processFile('icPhoto', 'ic', $allowedTypes, $maxFileSize, $uploadDir, $updates, $filenames);
processFile('selfiePhoto', 'selfie', $allowedTypes, $maxFileSize, $uploadDir, $updates, $filenames);
processFile('licensePhoto', 'license', $allowedTypes, $maxFileSize, $uploadDir, $updates, $filenames);
processFile('vehiclePhoto', 'vehicle', $allowedTypes, $maxFileSize, $uploadDir, $updates, $filenames);

if (empty($updates)) {
    echo json_encode(['status' => 'error', 'message' => 'No valid files to upload']);
    exit;
}

// Ensure columns exist
try {
    foreach (['icPhoto','selfiePhoto','licensePhoto','vehiclePhoto','updatedAt'] as $col) {
        $check = $pdo->query("SHOW COLUMNS FROM tbuser LIKE '" . $col . "'");
        if ($check->rowCount() == 0) {
            switch ($col) {
                case 'icPhoto':
                case 'selfiePhoto':
                case 'licensePhoto':
                case 'vehiclePhoto':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN $col VARCHAR(255)");
                    break;
                case 'updatedAt':
                    $pdo->exec("ALTER TABLE tbuser ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
                    break;
            }
        }
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    exit;
}

// Build dynamic update
$setParts = [];
$values = [];
foreach ($updates as $col => $val) {
    $setParts[] = "$col = ?";
    $values[] = $val;
}
$setSql = implode(', ', $setParts) . ", updatedAt = NOW()";

try {
    $stmt = $pdo->prepare("UPDATE tbuser SET $setSql WHERE email = ? AND userType = 'Driver'");
    $values[] = $email;
    $stmt->execute($values);

    if ($stmt->rowCount() === 0) {
        echo json_encode(['status' => 'error', 'message' => 'Driver not found']);
        exit;
    }

    echo json_encode(['status' => 'success', 'files' => $filenames]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
}