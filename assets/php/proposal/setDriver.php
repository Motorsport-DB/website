<?php
header('Content-Type: application/json');
$root = realpath(__DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..');

// Get the ID from POST or REQUEST
$id = $_POST['id'] ?? $_REQUEST['id'] ?? null;
if (empty($id)) {
    echo json_encode(['success' => false, 'message' => 'Missing driver id.']);
    exit;
}
if (preg_match('/[\/.~`$<>|]/', $id)) {
    echo json_encode(['success' => false, 'message' => 'Invalid driver id.']);
    exit;
}

$proposalDir = $root . "/proposal";
$picturesDir = $proposalDir . "/pictures";

// Create directories if needed
if (!is_dir($proposalDir) && !mkdir($proposalDir, 0777, true)) {
    echo json_encode(['success' => false, 'message' => 'Cannot create proposal directory.']);
    exit;
}
if (!is_dir($picturesDir) && !mkdir($picturesDir, 0777, true)) {
    echo json_encode(['success' => false, 'message' => 'Cannot create pictures directory.']);
    exit;
}

$jsonFile = $proposalDir . "/{$id}.json";

// Load existing proposal
$data = [];
if (file_exists($jsonFile)) {
    $json = file_get_contents($jsonFile);
    $data = json_decode($json, true);
    if (!is_array($data)) $data = [];
}

$updated = false;

// Update text fields
foreach (['country', 'dateOfBirth', 'dateOfDeath'] as $field) {
    if (!empty($_POST[$field])) {
        $data[$field] = $_POST[$field];
        $updated = true;
    }
}

// Handle image upload
if (
    isset($_FILES['picture']) &&
    $_FILES['picture']['error'] === UPLOAD_ERR_OK
) {
    // Extract first name / last name from ID
    $parts = explode('_', $id);
    if (count($parts) >= 2) {
        $firstName = preg_replace('/[^a-zA-Z0-9\-]/', '', $parts[0]);
        $lastName = preg_replace('/[^a-zA-Z0-9\-]/', '', $parts[1]);

        $picName = "{$firstName}_{$lastName}.png";
        $picPath = $picturesDir . "/" . $picName;

        // Save if file does not already exist
        if (!file_exists($picPath)) {
            $imageInfo = getimagesize($_FILES['picture']['tmp_name']);
            if ($imageInfo === false) {
                echo json_encode(['success' => false, 'message' => 'Invalid image file.']);
                exit;
            }

            $srcImage = match ($imageInfo[2]) {
                IMAGETYPE_JPEG => imagecreatefromjpeg($_FILES['picture']['tmp_name']),
                IMAGETYPE_PNG => imagecreatefrompng($_FILES['picture']['tmp_name']),
                IMAGETYPE_GIF => imagecreatefromgif($_FILES['picture']['tmp_name']),
                default => null
            };

            if ($srcImage && imagepng($srcImage, $picPath)) {
                imagedestroy($srcImage);
                $data['picture'] = "proposal/pictures/" . $picName;
                $updated = true;
            } else {
                if ($srcImage) imagedestroy($srcImage);
                echo json_encode(['success' => false, 'message' => 'Failed to save picture.']);
                exit;
            }
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid ID format (expected first_last).']);
        exit;
    }
}

// Save JSON file if needed
if ($updated) {
    if (file_put_contents($jsonFile, json_encode($data, JSON_PRETTY_PRINT))) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to write JSON file.']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'No data to update.']);
}
