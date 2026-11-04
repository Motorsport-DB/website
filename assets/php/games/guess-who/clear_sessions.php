<?php
declare(strict_types=1);

// Kept for backward compatibility: expired sessions are purged by common.php.
require_once __DIR__ . '/common.php';

gwClearExpired();
