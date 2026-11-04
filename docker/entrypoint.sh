#!/bin/sh
# Builds the database from races/, drivers/ and teams/ on every start (it is
# skipped in ~1s when the data did not change), then starts Apache.
set -eu

VAR_DIR="${MSDB_VAR_DIR:-/var/lib/motorsportdb}"
# Root has no DAC_OVERRIDE capability here: only fix the ownership if needed.
if ! runuser -u www-data -- test -w "$VAR_DIR"; then
    chown www-data:www-data "$VAR_DIR"
    chmod 0750 "$VAR_DIR"
fi
runuser -u www-data -- mkdir -p "$VAR_DIR/sessions"

# The build runs unprivileged, it only needs to write into $VAR_DIR.
if ! runuser -u www-data -- php -d memory_limit=1G -d open_basedir= /var/www/html/bin/build.php; then
    if [ -f "$VAR_DIR/motorsportdb.sqlite" ]; then
        echo "[entrypoint] build failed, serving the previous database" >&2
    else
        echo "[entrypoint] build failed and no database exists yet" >&2
        exit 1
    fi
fi

exec docker-php-entrypoint "$@"
