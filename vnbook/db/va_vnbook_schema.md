# 单词本 (va_vnbook) - 数据库设计文档

## 概述

单词本数据库，用于存储用户信息以及每个用户私有的、可编辑的单词笔记。

- **字符集**：UTF8MB4（支持中文、特殊符号）
- **排序规则**：utf8mb4_unicode_ci
- **数据库引擎**：InnoDB（支持事务和外键约束）
- **数据库版本**：MariaDB 10.11.15

---

## 表结构

### 1. 词性标准配置表 (`vnb_pos`)

存储系统统一的词性标准，用于用户私有释义表的外键约束。

#### 字段说明

| 字段名 | 数据类型    | 属性                  | 说明                                     |
| ------ | ----------- | --------------------- | ---------------------------------------- |
| `pos`  | VARCHAR(20) | NOT NULL, PRIMARY KEY | 词性缩写，如 `n.`、`v.`                  |
| `name` | JSON        | NOT NULL              | 词性全称：`{"en": "noun", "zh": "名词"}` |

#### SQL 定义

```sql
CREATE TABLE `vnb_pos` (
    `pos` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    `name` JSON NOT NULL COMMENT '全称: {"en": "noun", "zh": "名词"}',
    PRIMARY KEY (`pos`)
) ENGINE=InnoDB;
```

---

### 2. 用户主表 (`vnb_users`)

存储用户账号信息及个性化配置。

#### 字段说明

| 字段名     | 数据类型     | 属性                       | 说明           |
| ---------- | ------------ | -------------------------- | -------------- |
| `id`       | INT          | AUTO_INCREMENT PRIMARY KEY | 用户唯一标识   |
| `name`     | VARCHAR(50)  | NOT NULL, UNIQUE           | 用户名（唯一） |
| `pass`     | VARCHAR(255) | NOT NULL                   | 密码哈希       |
| `dispname` | VARCHAR(100) | DEFAULT NULL               | 显示名         |
| `time_c`   | DATETIME     | DEFAULT CURRENT_TIMESTAMP  | 创建时间       |
| `cfg`      | JSON         | DEFAULT NULL               | 前端用户配置   |

#### 索引

| 索引名        | 类型 | 字段 | 说明       |
| ------------- | ---- | ---- | ---------- |
| PRIMARY       | 主键 | id   | 主键索引   |
| idx_user_name | 唯一 | name | 用户名唯一 |

#### SQL 定义

```sql
CREATE TABLE `vnb_users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名(唯一)',
    `pass` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '密码哈希',
    `dispname` VARCHAR(100) DEFAULT NULL COMMENT '显示名',
    `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `cfg` JSON DEFAULT NULL COMMENT '前端用户配置',
    UNIQUE INDEX `idx_user_name` (`name`)
) ENGINE=InnoDB;
```

---

### 3. 单词本分类表 (`vnu_books`)

存储用户的单词本列表。

#### 字段说明

| 字段名    | 数据类型     | 属性                       | 说明                 |
| --------- | ------------ | -------------------------- | -------------------- |
| `id`      | INT          | AUTO_INCREMENT PRIMARY KEY | 单词本 ID            |
| `user_id` | INT          | NOT NULL, FOREIGN KEY      | 关联用户             |
| `title`   | VARCHAR(255) | NOT NULL                   | 单词本名称           |
| `nums`    | INT UNSIGNED | DEFAULT 0                  | 单词数量（自动维护） |
| `time_c`  | DATETIME     | DEFAULT CURRENT_TIMESTAMP  | 创建时间             |
| `hide`    | TINYINT(1)   | DEFAULT 0                  | 是否隐藏             |
| `ptop`    | TINYINT(1)   | DEFAULT 0                  | 置顶状态             |
| `sorder`  | INT          | DEFAULT 0                  | 手动排序序号         |

#### 约束

- `user_id` 外键引用 `vnb_users.id`，删除级联。

#### SQL 定义

```sql
CREATE TABLE `vnu_books` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL DEFAULT 'My Wordbook' COMMENT '单词本名称',
    `nums` INT UNSIGNED DEFAULT 0 COMMENT '单词数量(自动维护)',
    `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `hide` TINYINT(1) DEFAULT 0 COMMENT '是否隐藏',
    `ptop` TINYINT(1) DEFAULT 0 COMMENT 'Pin to top status (1: pinned, 0: normal)',
    `sorder` INT DEFAULT 0 COMMENT 'Manual display sequence order',
    INDEX `idx_vnu_user_books` (`user_id` ASC, `ptop` DESC, `sorder` ASC, `time_c` DESC),
    CONSTRAINT `fk_vnu_book_user` FOREIGN KEY (`user_id`) REFERENCES `vnb_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

### 4. 用户私有单词主表 (`vnu_words`)

存储用户个人词汇（从基础词库复制后独立编辑）。

#### 字段说明

| 字段名    | 数据类型     | 属性                       | 说明             |
| --------- | ------------ | -------------------------- | ---------------- |
| `id`      | INT          | AUTO_INCREMENT PRIMARY KEY | 用户单词 ID      |
| `user_id` | INT          | NOT NULL, FOREIGN KEY      | 关联用户         |
| `word`    | VARCHAR(100) | NOT NULL                   | 单词原文         |
| `phon`    | VARCHAR(255) | DEFAULT NULL               | 用户编辑后的音标 |
| `time_c`  | DATETIME     | DEFAULT CURRENT_TIMESTAMP  | 创建时间         |

#### SQL 定义

```sql
CREATE TABLE `vnu_words` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `word` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '单词原文',
    `phon` VARCHAR(255) DEFAULT NULL COMMENT '用户编辑后的音标',
    `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX `idx_vnu_user_word` (`user_id`, `word`),
    CONSTRAINT `fk_vnu_word_user` FOREIGN KEY (`user_id`) REFERENCES `vnb_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

### 5. 用户私有释义表 (`vnu_explanations`)

存储用户对单词的私有释义（可从基础库增量获取）。

#### 字段说明

| 字段名    | 数据类型    | 属性                       | 说明         |
| --------- | ----------- | -------------------------- | ------------ |
| `id`      | INT         | AUTO_INCREMENT PRIMARY KEY | 释义 ID      |
| `word_id` | INT         | NOT NULL, FOREIGN KEY      | 关联单词     |
| `pos`     | VARCHAR(20) | DEFAULT NULL               | 词性缩写     |
| `exp`     | JSON        | NOT NULL                   | 用户私有释义 |
| `time_c`  | DATETIME    | DEFAULT CURRENT_TIMESTAMP  | 创建时间     |
| `sorder`  | SMALLINT    | DEFAULT 0                  | 释义显示排序 |

#### 约束

- `pos` 外键引用 `vnb_pos.pos`，更新级联。
- `word_id` 外键引用 `vnu_words.id`，删除级联。

#### SQL 定义

```sql
CREATE TABLE `vnu_explanations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `word_id` INT NOT NULL,
    `pos` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT '词性缩写',
    `exp` JSON NOT NULL COMMENT '用户私有释义: {"en": "...", "zh": "..."}',
    `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `sorder` SMALLINT DEFAULT 0 COMMENT '释义显示排序',
    INDEX `idx_vnu_exp_word` (`word_id` ASC, `sorder` ASC, `time_c` DESC),
    CONSTRAINT `fk_vnu_exp_pos` FOREIGN KEY (`pos`) REFERENCES `vnb_pos` (`pos`) ON UPDATE CASCADE,
    CONSTRAINT `fk_vnu_exp_word` FOREIGN KEY (`word_id`) REFERENCES `vnu_words` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

### 6. 用户私有例句表 (`vnu_sentences`)

存储用户的私有例句。

#### 字段说明

| 字段名   | 数据类型     | 属性                       | 说明         |
| -------- | ------------ | -------------------------- | ------------ |
| `id`     | INT          | AUTO_INCREMENT PRIMARY KEY | 例句 ID      |
| `exp_id` | INT          | NOT NULL, FOREIGN KEY      | 关联释义     |
| `sen`    | JSON         | NOT NULL                   | 用户私有例句 |
| `time_c` | DATETIME     | DEFAULT CURRENT_TIMESTAMP  | 创建时间     |
| `smemo`  | VARCHAR(100) | DEFAULT NULL               | 备注         |
| `sorder` | SMALLINT     | DEFAULT 0                  | 例句显示排序 |

#### SQL 定义

```sql
CREATE TABLE `vnu_sentences` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `exp_id` INT NOT NULL,
    `sen` JSON NOT NULL COMMENT '用户私有例句: {"en": "...", "zh": "..."}',
    `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `smemo` VARCHAR(100) DEFAULT NULL COMMENT '备注',
    `sorder` SMALLINT DEFAULT 0 COMMENT '例句显示排序',
    INDEX `idx_vnu_sen_exp` (`exp_id` ASC, `sorder` ASC, `time_c` DESC),
    CONSTRAINT `fk_vnu_sen_exp` FOREIGN KEY (`exp_id`) REFERENCES `vnu_explanations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

### 7. 单词本与单词映射表 (`vnu_mapbw`)

支持跨单词本复用同一单词。

#### 字段说明

| 字段名    | 数据类型 | 属性                       | 说明       |
| --------- | -------- | -------------------------- | ---------- |
| `id`      | INT      | AUTO_INCREMENT PRIMARY KEY | 映射 ID    |
| `user_id` | INT      | NOT NULL, FOREIGN KEY      | 关联用户   |
| `book_id` | INT      | NOT NULL, FOREIGN KEY      | 关联单词本 |
| `word_id` | INT      | NOT NULL, FOREIGN KEY      | 关联单词   |
| `time_c`  | DATETIME | DEFAULT CURRENT_TIMESTAMP  | 创建时间   |

#### 索引

| 索引名             | 类型 | 字段             | 说明           |
| ------------------ | ---- | ---------------- | -------------- |
| idx_vnu_unique_map | 唯一 | book_id, word_id | 同一本中不重复 |
| idx_vnu_user_maps  | 普通 | user_id          | 按用户查询     |

#### SQL 定义

```sql
CREATE TABLE `vnu_mapbw` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `book_id` INT NOT NULL,
    `word_id` INT NOT NULL,
    `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE INDEX `idx_vnu_unique_map` (`book_id`, `word_id`),
    INDEX `idx_vnu_user_maps` (`user_id`),
    CONSTRAINT `fk_vnu_map_user` FOREIGN KEY (`user_id`) REFERENCES `vnb_users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_vnu_map_book` FOREIGN KEY (`book_id`) REFERENCES `vnu_books` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_vnu_map_word` FOREIGN KEY (`word_id`) REFERENCES `vnu_words` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

### 8. 单词复习记录表 (`vnu_review`)

记录用户对单词的复习统计与时间信息。

#### 字段说明

| 字段名      | 数据类型         | 属性                       | 说明             |
| ----------- | ---------------- | -------------------------- | ---------------- |
| `id`        | INT              | AUTO_INCREMENT PRIMARY KEY | 记录 ID          |
| `user_id`   | INT              | NOT NULL, FOREIGN KEY      | 关联用户         |
| `word_id`   | INT              | NOT NULL, FOREIGN KEY      | 关联单词         |
| `n_known`   | TINYINT UNSIGNED | DEFAULT 0                  | 累计认识次数     |
| `n_unknown` | TINYINT UNSIGNED | DEFAULT 0                  | 累计不认识次数   |
| `n_streak`  | TINYINT UNSIGNED | DEFAULT 0                  | 当前连续认识次数 |
| `time_c`    | DATETIME         | DEFAULT CURRENT_TIMESTAMP  | 加入复习时间     |
| `time_r`    | DATETIME         | DEFAULT CURRENT_TIMESTAMP  | 最近复习时间     |

#### 约束与索引

| 名称     | 类型 | 字段             | 说明               |
| -------- | ---- | ---------------- | ------------------ |
| idx_u_w  | 唯一 | user_id, word_id | 单词复习记录唯一性 |
| fk_vnr_u | 外键 | user_id          | 关联用户           |
| fk_vnr_w | 外键 | word_id          | 关联单词           |

#### SQL 定义

```sql
CREATE TABLE `vnu_review` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `word_id` INT NOT NULL,
    `n_known` TINYINT UNSIGNED DEFAULT 0 COMMENT '累计认识次数',
    `n_unknown` TINYINT UNSIGNED DEFAULT 0 COMMENT '累计不认识次数',
    `n_streak` TINYINT UNSIGNED DEFAULT 0 COMMENT '当前连续认识次数',
    `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '加入复习时间',
    `time_r` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最近复习时间',
    UNIQUE INDEX `idx_u_w` (`user_id`, `word_id`),
    CONSTRAINT `fk_vnr_u` FOREIGN KEY (`user_id`) REFERENCES `vnb_users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_vnr_w` FOREIGN KEY (`word_id`) REFERENCES `vnu_words` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
```

---

## 触发器

用于自动维护 `vnu_books.nums` 单词数量。

```sql
CREATE TRIGGER tr_mapbw_insert AFTER INSERT ON vnu_mapbw
FOR EACH ROW UPDATE vnu_books SET nums = nums + 1 WHERE id = NEW.book_id;

CREATE TRIGGER tr_mapbw_delete AFTER DELETE ON vnu_mapbw
FOR EACH ROW UPDATE vnu_books SET nums = nums - 1 WHERE id = OLD.book_id;

CREATE TRIGGER tr_mapbw_update AFTER UPDATE ON vnu_mapbw
FOR EACH ROW BEGIN
   IF OLD.book_id <> NEW.book_id THEN
       UPDATE vnu_books SET nums = nums - 1 WHERE id = OLD.book_id;
       UPDATE vnu_books SET nums = nums + 1 WHERE id = NEW.book_id;
   END IF;
END;

CREATE TRIGGER tr_word_physical_delete BEFORE DELETE ON vnu_words
FOR EACH ROW BEGIN
   UPDATE vnu_books SET nums = nums - 1
   WHERE id IN (SELECT book_id FROM vnu_mapbw WHERE word_id = OLD.id);
END;
```

---

## 初始化数据

### 词性标准初始化

```sql
INSERT INTO `vnb_pos` (`pos`, `name`) VALUES
('n.', '{"en": "noun", "zh": "名词"}'),
('v.', '{"en": "verb", "zh": "动词 (统称)"}'),
('vt.', '{"en": "transitive verb", "zh": "及物动词"}'),
('vi.', '{"en": "intransitive verb", "zh": "不及物动词"}'),
('aux.', '{"en": "auxiliary verb", "zh": "助动词"}'),
('adj.', '{"en": "adjective", "zh": "形容词"}'),
('adv.', '{"en": "adverb", "zh": "副词"}'),
('prep.', '{"en": "preposition", "zh": "介词"}'),
('pron.', '{"en": "pronoun", "zh": "代词"}'),
('abbr.', '{"en": "abbreviation", "zh": "缩写词"}'),
('conj.', '{"en": "conjunction", "zh": "连词"}'),
('int.', '{"en": "interjection", "zh": "感叹词"}'),
('det.', '{"en": "determiner", "zh": "限定词"}'),
('num.', '{"en": "numeral", "zh": "数词"}'),
('quant.', '{"en": "quantifier", "zh": "量词"}'),
('art.', '{"en": "article", "zh": "冠词"}'),
('phr.', '{"en": "phrase", "zh": "短语"}'),
('idm.', '{"en": "idiom", "zh": "惯用语"}'),
('na.', '{"en": "not applicable", "zh": "不适用"}');
```

---

## 外键关系

```
vnb_users (id) ──→ vnu_books (user_id)
     │                ↓
     ├────────→ vnu_words (user_id)
     │                ↓
     │           vnu_explanations (word_id) ──→ vnb_pos (pos)
     │                ↓
     │           vnu_sentences (exp_id)
     │
     └────────→ vnu_mapbw (user_id)
                      ├─→ vnu_books (book_id)
                      └─→ vnu_words (word_id)
    └────────→ vnu_review (user_id)
                  └─→ vnu_words (word_id)
```

---

## 数据库初始化

```sql
-- 创建数据库
CREATE DATABASE IF NOT EXISTS `va_vnbook`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

```

---

## 文件说明

| 文件                  | 说明                                               |
| --------------------- | -------------------------------------------------- |
| `va_vnbook_schema.md` | 数据库设计文档                                     |
| `impdb.php`           | 数据库初始化代码（创建库、表、触发器、初始化数据） |

---

## 版本历史

| 日期       | 版本 | 描述                                                       |
| ---------- | ---- | ---------------------------------------------------------- |
| 2026-02-09 | 1.2  | 新增单词复习记录表 `vnu_review`                            |
| 2026-02-06 | 1.1  | 新增 `sorder` 排序字段和 `smemo` 备注字段 到释义表和例句表 |
| 2026-02-04 | 1.0  | 初始版本，基于 impdb.php                                   |

---

## 注意事项

⚠️ **JSON 格式**：

- `name`、`cfg`、`exp`、`sen` 字段必须为合法 JSON
  - `name` 示例：`{"en": "noun", "zh": "名词"}`
  - `cfg` 示例：`{"hideAllWords":false,"wordsListSortMode":"date"}`
  - `exp` 示例：`{"en": "record", "zh": "记录"}`
  - `sen` 示例：`{"en": "I keep a record.", "zh": "我保留一份记录。"}`

⚠️ **外键级联**：

- 删除用户会级联删除其所有数据
- 删除单词会级联删除相关释义与例句

⚠️ **触发器**：

- `vnu_mapbw` 的增删改会自动维护 `vnu_books.nums`

---

## 相关资源

- [MariaDB JSON 函数文档](https://mariadb.com/kb/en/json-functions/)
- [UTF8MB4 编码说明](https://mariadb.com/kb/en/character-sets/)
