FROM php:8.4-apache

RUN a2enmod rewrite headers expires deflate

COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf

WORKDIR /var/www/html

# Ensure www-data can write cache files in the project root
# (volume is mounted at runtime; this sets the umask so new files are group-writable)
RUN echo "umask 002" >> /etc/apache2/envvars
