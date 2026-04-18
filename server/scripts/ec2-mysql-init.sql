-- 石亭 ERP — 在 EC2 上初始化 MySQL/MariaDB 库与用户
-- 用法（在 EC2 上）：sudo mysql < ec2-mysql-init.sql
-- 或：sudo mysql -e "source /path/to/ec2-mysql-init.sql"
-- 执行前请把下面 CHANGE_ME 改成强密码，并与 server/.env 里 DATABASE_URL 一致。

CREATE DATABASE IF NOT EXISTS shiting_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 仅本机连库（推荐：Node 与 MySQL 同机部署）
-- 若重复执行报错用户已存在，可先：DROP USER 'shiting'@'localhost';
CREATE USER 'shiting'@'localhost' IDENTIFIED BY 'CHANGE_ME';
GRANT ALL PRIVILEGES ON shiting_erp.* TO 'shiting'@'localhost';

-- 若必须从外网或其它机器连该库再取消下面注释（不建议对公网开放 3306）
-- CREATE USER 'shiting'@'%' IDENTIFIED BY 'CHANGE_ME';
-- GRANT ALL PRIVILEGES ON shiting_erp.* TO 'shiting'@'%';

FLUSH PRIVILEGES;
