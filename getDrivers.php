<?php
header('Content-Type: application/json');

$driversDir = 'drivers/';

if (isset($_GET['driver'])) {
    $driverId = $_GET['driver'];
    $driverFile = $driversDir . $driverId . ".json";

    if (file_exists($driverFile)) {
        $data = json_decode(file_get_contents($driverFile), true);
        echo json_encode([$data]); 
    } else {
        echo json_encode(["error" => "Driver not found"]);
    }
    exit;
}

if (isset($_GET['allDrivers'])) {
    $drivers = [];

    foreach (glob($driversDir . "*.json") as $filename) {
        $data = json_decode(file_get_contents($filename), true);
        $drivers[] = [
            "id" => pathinfo($filename, PATHINFO_FILENAME),
            "firstName" => $data["firstName"] ?? "Unknown",
            "lastName" => $data["lastName"] ?? "Unknown",
            "nickname" => $data["Nickname"] ?? "N/A",
            "dateOfBirth" => $data["dateOfBirth"] ?? "Unknown",
            "dateOfDeath" => $data["dateOfDeath"] ?? null,
            "country" => $data["country"] ?? "Unknown",
            "picture" => $data["picture"] ?? "default.jpg",
            "seasons" => $data["seasons"] ?? []
        ];
    }
    echo json_encode($drivers);
    exit;
}

echo json_encode(["error" => "Invalid request"]);
?>
