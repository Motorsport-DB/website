<?php
header('Content-Type: application/json');

$root = realpath(__DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..');
$proposalDir = $root . '/proposal';
$picturesDir = $proposalDir . '/pictures';

// Retrieve and validate the ID
$id = $_GET['id'] ?? null;
if (
    !$id ||
    preg_match('/[\/.~`$<>|]/', $id)
) {
    echo json_encode(['success' => false, 'message' => 'Invalid or missing id.']);
    exit;
}

// Extract first name/last name
$parts = explode('_', $id);
if (count($parts) < 2) {
    echo json_encode(['success' => false, 'message' => 'Invalid id format.']);
    exit;
}
$firstName = preg_replace('/[\/.~`$<>|]/', '', $parts[0]);
$lastName = preg_replace('/[\/.~`$<>|]/', '', $parts[1]);

// Paths
$jsonPath = $proposalDir . "/{$firstName}_{$lastName}.json";
$imagePath = $picturesDir . "/{$firstName}_{$lastName}.png";

// Read JSON if present
$jsonData = null;
if (file_exists($jsonPath)) {
    $content = file_get_contents($jsonPath);
    $decoded = json_decode($content, true);
    if (is_array($decoded)) {
        $jsonData = $decoded;
    }
}

// Check image
$imageUrl = null;
if (file_exists($imagePath)) {
    // Return the relative path for client use
    $imageUrl = "proposal/pictures/{$firstName}_{$lastName}.png";
}

// Response
echo json_encode([
    'success' => true,
    'data' => $jsonData,
    'picture' => $imageUrl
]);
