FROM php:8.4-apache

LABEL org.opencontainers.image.title="motorsportdb"

RUN a2enmod rewrite headers expires deflate

# APCu for in-memory caching between PHP requests
RUN pecl install apcu && docker-php-ext-enable apcu \
 && echo "apc.enabled=1\napc.shm_size=32M\napc.ttl=86400" \
    > /usr/local/etc/php/conf.d/apcu.ini

COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf

WORKDIR /var/www/html

# Ensure www-data can write cache files in the project root
# (volume is mounted at runtime; this sets the umask so new files are group-writable)
RUN echo "umask 002" >> /etc/apache2/envvars
