-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- 主机： db
-- 生成日期： 2026-02-04 17:38:29
-- 服务器版本： 10.11.15-MariaDB-ubu2204
-- PHP 版本： 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 数据库： `va_basedict`
--

CREATE DATABASE IF NOT EXISTS `va_basedict` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `va_basedict`;

-- --------------------------------------------------------

--
-- 表的结构 `definitions`
--

CREATE TABLE `definitions` (
  `id` int(11) NOT NULL,
  `word_id` int(11) NOT NULL,
  `pos` varchar(10) NOT NULL,
  `ipa_idx` tinyint(4) DEFAULT 0,
  `meanings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`meanings`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- 表的结构 `words`
--

CREATE TABLE `words` (
  `id` int(11) NOT NULL,
  `word` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `word_search` varchar(100) GENERATED ALWAYS AS (lcase(`word`)) STORED,
  `ipas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`ipas`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 转储表的索引
--

--
-- 表的索引 `definitions`
--
ALTER TABLE `definitions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_word_ref` (`word_id`);

--
-- 表的索引 `words`
--
ALTER TABLE `words`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_word_unique` (`word`),
  ADD KEY `idx_word_search` (`word_search`);

--
-- 在导出的表使用AUTO_INCREMENT
--

--
-- 使用表AUTO_INCREMENT `definitions`
--
ALTER TABLE `definitions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `words`
--
ALTER TABLE `words`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 限制导出的表
--

--
-- 限制表 `definitions`
--
ALTER TABLE `definitions`
  ADD CONSTRAINT `fk_word_ref` FOREIGN KEY (`word_id`) REFERENCES `words` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
