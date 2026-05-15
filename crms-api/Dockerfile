FROM php:8.2-apache

RUN docker-php-ext-install pdo_mysql \
    && a2enmod rewrite \
    && { \
        echo '<Directory /var/www/html>'; \
        echo '    AllowOverride All'; \
        echo '    Require all granted'; \
        echo '</Directory>'; \
    } > /etc/apache2/conf-available/crms.conf \
    && a2enconf crms

WORKDIR /var/www/html

COPY crms-api/ /var/www/html/

RUN chown -R www-data:www-data /var/www/html

EXPOSE 80