<?php
header('Content-Type: application/json');

$teamsDir = 'teams/';

if (isset($_GET['id'])) {
    $teamId = $_GET['id'];

    if (preg_match('/[^a-zA-Z0-9_-]/', $teamId)) {
        echo json_encode(["error" => "Invalid team ID"]);
        exit;
    }

    $teamFile = realpath($teamsDir . $teamId . ".json");

    if ($teamFile && str_starts_with($teamFile, realpath($teamsDir))) {
        if (file_exists($teamFile)) {
            $data = json_decode(file_get_contents($teamFile), true);
            echo json_encode([$data]);
        } else {
            echo json_encode(["error" => "Team not found"]);
        }
    } else {
        echo json_encode(["error" => "Unauthorized access"]);
    }
    exit;
}

echo json_encode(["error" => "Invalid request"]);
?>
