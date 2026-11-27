# The tag is pinned by digest: bump both together when upgrading.
FROM docker.io/library/php:8.5.13-apache@sha256:256c25149bca6639f538ece3c5dda90684409227dec546b87ca174950569b8f1

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
