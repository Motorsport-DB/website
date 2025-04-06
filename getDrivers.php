<?php
header('Content-Type: application/json');

$driversDir = 'drivers/';

if (isset($_GET['id'])) {
    $driverId = $_GET['id'];

    if (preg_match('/[^a-zA-Z0-9_ Ááíì\'-]/', $driverId)) {
        echo json_encode(["error" => "Invalid driver ID"]);
        exit;
    }

    $driverFile = realpath($driversDir . $driverId . ".json");

    if ($driverFile && str_starts_with($driverFile, realpath($driversDir))) {
        if (file_exists($driverFile)) {
            $data = json_decode(file_get_contents($driverFile), true, 512, JSON_OBJECT_AS_ARRAY);
            $data["picture"] = file_exists( "drivers/picture/$driverId.png") ? "drivers/picture/$driverId.png" : (file_exists( "drivers/picture/$driverId.jpg") ? "drivers/picture/$driverId.jpg" : "drivers/picture/default.png");
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
