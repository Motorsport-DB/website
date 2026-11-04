<?php
declare(strict_types=1);

namespace MotorsportDB\API\Data;

/**
 * Read-only access to the generated SQLite database (see bin/build.php).
 *
 * @package MotorsportDB\API\Data
 */
final class Database
{
    private static ?\Pdo\Sqlite $pdo = null;

    public static function varDir(): string
    {
        $dir = getenv('MSDB_VAR_DIR');
        return rtrim($dir !== false && $dir !== '' ? $dir : dirname(__DIR__, 3) . '/var', '/');
    }

    public static function path(): string
    {
        return self::varDir() . '/motorsportdb.sqlite';
    }

    public static function get(): \Pdo\Sqlite
    {
        if (self::$pdo === null) {
            $path = self::path();
            if (!is_file($path)) {
                throw new \RuntimeException('Database not built, run: php bin/build.php');
            }
            self::$pdo = new \Pdo\Sqlite('sqlite:' . $path, null, null, [
                \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
                \Pdo\Sqlite::ATTR_OPEN_FLAGS => \Pdo\Sqlite::OPEN_READONLY,
            ]);
            self::$pdo->exec('PRAGMA query_only = 1');
        }
        return self::$pdo;
    }

    /** @return list<array<string,mixed>> */
    public static function all(string $sql, array $params = []): array
    {
        $stmt = self::get()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /** @return array<string,mixed>|null */
    public static function one(string $sql, array $params = []): ?array
    {
        $stmt = self::get()->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @return list<mixed> */
    public static function column(string $sql, array $params = []): array
    {
        $stmt = self::get()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(\PDO::FETCH_COLUMN);
    }
}
