<?php
header('Content-Type: application/json');

$teamsDir = 'teams/';

if (isset($_GET['id'])) {
    $teamId = $_GET['id'];

    if (preg_match('/[\/.~`$<>|]/', $teamId)) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid team ID"]);
        exit;
    }

    $teamFile = realpath($teamsDir . $teamId . ".json");

    if ($teamFile && str_starts_with($teamFile, realpath($teamsDir))) {
        if (file_exists($teamFile)) {
            $data = json_decode(file_get_contents($teamFile), true);
            $data["picture"] = file_exists( "teams/picture/$teamId.png") ? "teams/picture/$teamId.png" : (file_exists( "teams/picture/$teamId.jpg") ? "teams/picture/$teamId.jpg" : null);
            echo json_encode([$data]);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Team not found"]);
        }
    } else {
        http_response_code(404);
        echo json_encode(["error" => "Unauthorized access"]);
    }
    exit;
}
http_response_code(401);
echo json_encode(["error" => "Invalid request"]);
?>
