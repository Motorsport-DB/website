FROM php:8.4-apache

LABEL org.opencontainers.image.title="motorsportdb"

RUN a2enmod rewrite headers expires deflate

# APCu for in-memory caching between PHP requests
ADD https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/

RUN if pecl install apcu; then \
            docker-php-ext-enable apcu && \
            printf "apc.enabled=1\napc.shm_size=32M\napc.ttl=86400\n" \
                > /usr/local/etc/php/conf.d/apcu.ini; \
        else \
            chmod +x /usr/local/bin/install-php-extensions && \
                install-php-extensions apcu || \
                echo "Warning: APCu normal install failed; continuing with APCu."; \
        fi

COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf

WORKDIR /var/www/html

# Ensure www-data can write cache files in the project root
# (volume is mounted at runtime; this sets the umask so new files are group-writable)
RUN echo "umask 002" >> /etc/apache2/envvars
