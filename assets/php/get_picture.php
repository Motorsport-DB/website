<?php
// Récupération des paramètres GET
$folder = $_GET['folder'] ?? '';
$id = $_GET['id'] ?? '';

// Définition du chemin par défaut
$root = realpath(__DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..');
$basePath = $root . DIRECTORY_SEPARATOR ;

// Vérification du dossier
if (strpos($folder, 'index') !== false) {
    $path = $basePath . 'assets/flags' . DIRECTORY_SEPARATOR;
} else {
    $path = $basePath . $folder . DIRECTORY_SEPARATOR . 'picture' . DIRECTORY_SEPARATOR;
}
$defaultImage = "{$path}default.png";

// Recherche de l'image avec l'ID et une extension valide
$imagePath = $defaultImage;
$validExtensions = ['png', 'jpeg', 'jpg', 'gif', 'webp'];

foreach ($validExtensions as $extension) {
    $filePath = "{$path}{$id}.{$extension}";
    if (file_exists($filePath)) {
        $imagePath = $filePath;
        break;
    }
}

// Retourner le lien de l'image en JSON
header('Content-Type: application/json');
$imageUrl = str_replace($root, '', $imagePath);
$imageUrl = str_replace(DIRECTORY_SEPARATOR, '/', $imageUrl);
echo json_encode(['imagePath' => $imageUrl]);