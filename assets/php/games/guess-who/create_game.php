<?php
$root_dir = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR;

require_once 'clear_sessions.php';

$input = json_decode(file_get_contents("php://input"), true);

if (!isset($input["championships"]) || count($input["championships"]) < 1) {
    echo json_encode(["success" => false, "error" => "At least 1 championship required"]);
    exit;
}

$all_pilots = [];

foreach ($input["championships"] as $championship) {
    $champ_name = $championship[0];
    $year = $championship[1];
    $file_path = $root_dir . 'races' . DIRECTORY_SEPARATOR . "{$champ_name}" . DIRECTORY_SEPARATOR . "{$year}.json";
    if (file_exists($file_path)) {
        $json = file_get_contents($file_path);
        $data = json_decode($json, true);
        if (isset($data["events"]) && is_array($data["events"])) {
            foreach ($data["events"] as $event) {
                foreach ($event as $session) {
                    foreach ($session as $car) {
                        if (isset($car["drivers"]) && is_array($car["drivers"])) {
                            $all_pilots = array_merge($all_pilots, $car["drivers"]);
                        }
                    }
                }
            }
        } else {
            echo json_encode(["success" => false, "error" => "Invalid championship data format in file: $file_path"]);
            exit;
        }
    } else {
        echo json_encode(["success" => false, "error" => "Championship file not found: $file_path"]);
        exit;
    }
}
$all_pilots = array_values(array_unique($all_pilots));

$session_id = bin2hex(random_bytes(4)); // ex: 'a1b2c3d4'
$session_dir = $root_dir . "games" . DIRECTORY_SEPARATOR . "guess-who";
@mkdir($session_dir, 0777, true);

shuffle($all_pilots); 
$pilots = array_slice($all_pilots, 0, 20);
if (count($pilots) < 2) {
    echo json_encode(["success" => false, "error" => "Not enough drivers to create a game"]);
    exit;
}
$keys = array_rand($pilots, 2);
$secret1 = $pilots[$keys[0]];
$secret2 = $pilots[$keys[1]];

$pilots_with_images = [];
foreach ($pilots as $driverId) {
    $picture = file_exists($root_dir . "drivers/picture/$driverId.png") ? "/drivers/picture/$driverId.png"
        : (file_exists($root_dir . "drivers/picture/$driverId.jpg") ? "/drivers/picture/$driverId.jpg"
        : "/drivers/picture/default.png");
    $pilots_with_images[$driverId] = [
        "id" => $driverId,
        "picture" => $picture
    ];
}

$data = [
    "created_at" => time(),
    "player1_ready" => false,
    "player2_ready" => false,
    "pilots" => $pilots_with_images,
    "secrets" => [
        "1" => $secret2,
        "2" => $secret1
    ]
];

file_put_contents("$session_dir/$session_id.json", json_encode($data));

echo json_encode(["success" => true, "session_id" => $session_id]);
