<?php
/**
 * MotorsportDB - Picture Finder Utility
 * Finds pictures for drivers, teams, and championships
 */

namespace MotorsportDB\API\Utils;

class PictureFinder
{
    private string $rootPath;
    private array $allowedFolders = ['drivers', 'teams', 'races'];
    private array $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'svg'];

    public function __construct(string $rootPath = null)
    {
        $this->rootPath = $rootPath ?? realpath(__DIR__ . '/../../../');
    }

    /**
     * Find picture for an entity
     * 
     * @param string $folder Folder name (drivers, teams, races)
     * @param string $id Entity ID
     * @return string|null Relative path to picture or null
     */
    public function findPicture(string $folder, string $id): ?string
    {
        // Validate folder
        if (!in_array($folder, $this->allowedFolders)) {
            return null;
        }

        // Sanitize ID (prevent directory traversal)
        $id = $this->sanitizeId($id);
        if (!$id) {
            return null;
        }

        // Build directory path
        $directory = $this->rootPath . '/' . $folder . '/picture';
        
        if (!is_dir($directory)) {
            return null;
        }

        // Try each extension
        foreach ($this->allowedExtensions as $ext) {
            $file = $directory . '/' . $id . '.' . $ext;
            
            if (file_exists($file) && is_file($file)) {
                // Return relative path from root
                return '/' . $folder . '/picture/' . $id . '.' . $ext;
            }
        }

        return null;
    }

    /**
     * Find all pictures in a folder
     * 
     * @param string $folder Folder name
     * @return array List of pictures with IDs
     */
    public function findAllPictures(string $folder): array
    {
        // Validate folder
        if (!in_array($folder, $this->allowedFolders)) {
            return [];
        }

        $directory = $this->rootPath . '/' . $folder . '/picture';
        
        if (!is_dir($directory)) {
            return [];
        }

        $pictures = [];
        $pattern = $directory . '/*';
        $files = glob($pattern);

        foreach ($files as $file) {
            if (is_file($file)) {
                $filename = basename($file);
                $pathInfo = pathinfo($filename);
                
                // Check if extension is allowed
                if (isset($pathInfo['extension']) && 
                    in_array(strtolower($pathInfo['extension']), $this->allowedExtensions)) {
                    
                    $id = $pathInfo['filename'];
                    $pictures[$id] = '/' . $folder . '/picture/' . $filename;
                }
            }
        }

        return $pictures;
    }

    /**
     * Check if picture exists
     * 
     * @param string $folder Folder name
     * @param string $id Entity ID
     * @return bool
     */
    public function pictureExists(string $folder, string $id): bool
    {
        return $this->findPicture($folder, $id) !== null;
    }

    /**
     * Get picture info
     * 
     * @param string $folder Folder name
     * @param string $id Entity ID
     * @return array|null Picture info or null
     */
    public function getPictureInfo(string $folder, string $id): ?array
    {
        $picturePath = $this->findPicture($folder, $id);
        
        if (!$picturePath) {
            return null;
        }

        $fullPath = $this->rootPath . $picturePath;
        
        if (!file_exists($fullPath)) {
            return null;
        }

        $pathInfo = pathinfo($fullPath);
        $imageInfo = @getimagesize($fullPath);

        return [
            'path' => $picturePath,
            'fullPath' => $fullPath,
            'filename' => $pathInfo['basename'],
            'extension' => $pathInfo['extension'] ?? null,
            'size' => filesize($fullPath),
            'width' => $imageInfo[0] ?? null,
            'height' => $imageInfo[1] ?? null,
            'mimeType' => $imageInfo['mime'] ?? null,
        ];
    }

    /**
     * Sanitize entity ID to prevent directory traversal
     * 
     * @param string $id Entity ID
     * @return string|null Sanitized ID or null if invalid
     */
    private function sanitizeId(string $id): ?string
    {
        // Remove any path traversal attempts
        $id = str_replace(['..', '/', '\\', "\0"], '', $id);
        
        // Allow only alphanumeric, underscore, hyphen, and space
        if (!preg_match('/^[a-zA-Z0-9_\- ]+$/', $id)) {
            return null;
        }

        return $id;
    }

    /**
     * Get default picture for entity type
     * 
     * @param string $folder Folder name
     * @return string Default picture path
     */
    public function getDefaultPicture(string $folder): string
    {
        $defaults = [
            'drivers' => '/assets/other/default_driver.png',
            'teams' => '/assets/other/default_team.png',
            'races' => '/assets/other/default_race.png',
        ];

        return $defaults[$folder] ?? '/assets/other/default.png';
    }
}
