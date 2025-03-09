<?php
header('Content-Type: application/json');

$driversDir = 'drivers/';

if (isset($_GET['id'])) {
    $driverId = $_GET['id'];

    if (preg_match('/[^a-zA-Z0-9_-]/', $driverId)) {
        echo json_encode(["error" => "Invalid driver ID"]);
        exit;
    }

    $driverFile = realpath($driversDir . $driverId . ".json");

    if ($driverFile && str_starts_with($driverFile, realpath($driversDir))) {
        if (file_exists($driverFile)) {
            $data = json_decode(file_get_contents($driverFile), true);
            echo json_encode([$data]);
        } else {
            echo json_encode(["error" => "Driver not found"]);
        }
    } else {
        echo json_encode(["error" => "Unauthorized access"]);
    }
    exit;
}

echo json_encode(["error" => "Invalid request"]);
?>
