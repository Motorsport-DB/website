# PHP 8.5.12 fixes PHP2Shell (CVE-2026-109618 / CVE-2026-109619).
# The tag is pinned by digest: bump both together when upgrading.
FROM docker.io/library/php:8.5.12-apache@sha256:9cc4f73d14eb46d07789a2a98b939b928f8a271a95416cb63902ebb460d31dbb

LABEL org.opencontainers.image.title="motorsportdb" \
      org.opencontainers.image.source="https://github.com/Motorsport-DB/website"

RUN set -eux; \
    a2enmod rewrite headers expires deflate; \
    a2disconf other-vhosts-access-log serve-cgi-bin || true; \
    pecl install apcu-5.1.28; \
    docker-php-ext-enable apcu; \
    rm -rf /tmp/pear ~/.pearrc; \
    cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY docker/php.ini "$PHP_INI_DIR/conf.d/zz-motorsportdb.ini"
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY --chmod=0755 docker/entrypoint.sh /usr/local/bin/motorsportdb-entrypoint

# Generated data (SQLite, search index, game sessions) lives outside the
# document root, in a dedicated writable volume.
ENV MSDB_VAR_DIR=/var/lib/motorsportdb
RUN install -d -o www-data -g www-data -m 0750 /var/lib/motorsportdb

WORKDIR /var/www/html
ENTRYPOINT ["motorsportdb-entrypoint"]
CMD ["apache2-foreground"]
