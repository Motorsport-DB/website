<?php
declare(strict_types=1);

/**
 * Versioned URLs of the scripts and styles.
 *
 * Every URL carries a version that changes as soon as a file of assets/js or
 * assets/css changes ("/assets/v1a2b3c4d/js/pages/HomePage.js"): the browser can
 * keep the files for a year and still gets a new version right after an update,
 * without a hard refresh. The web server maps /assets/v<version>/ back to /assets/.
 * Modules imported by other modules get the same version through the import map
 * (absolute imports) or their own URL (relative imports).
 */
function asset_version(): string
{
    static $version = null;
    if ($version !== null) {
        return $version;
    }
    $root = dirname(__DIR__) . '/assets';
    $sum = '';
    foreach (['js', 'css'] as $dir) {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root . '/' . $dir, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $file) {
            if ($file->isFile()) {
                $sum .= $file->getPathname() . ':' . $file->getMTime() . ':' . $file->getSize() . "\n";
            }
        }
    }
    return $version = substr(hash('xxh128', $sum), 0, 10);
}

/** URL of a file of assets/ ("js/pages/HomePage.js") with the current version. */
function asset(string $path): string
{
    return '/assets/v' . asset_version() . '/' . ltrim($path, '/');
}

/** Import map that gives the version to the absolute imports ("/assets/js/…"). */
function asset_import_map(): string
{
    $map = ['imports' => ['/assets/js/' => asset('js/')]];
    return '<script type="importmap">' . json_encode($map, JSON_UNESCAPED_SLASHES) . '</script>';
}
