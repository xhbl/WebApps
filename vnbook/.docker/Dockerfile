FROM php:8.2-apache

# 安装 Xdebug 和 MySQL 扩展
RUN pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && docker-php-ext-install mysqli pdo pdo_mysql

# 开启 Apache 重写模块
RUN a2enmod rewrite

# 将时区设置为洛杉矶
RUN ln -snf /usr/share/zoneinfo/America/Los_Angeles /etc/localtime && echo America/Los_Angeles > /etc/timezone
