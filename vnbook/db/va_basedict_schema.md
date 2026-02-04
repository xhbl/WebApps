# 简明基础词汇数据库 (va_basedict) - 数据库设计文档

## 概述

简明基础词汇数据库，包含英文单词及其音标、词性、多语言释义等信息。

- **字符集**：UTF8MB4（支持中文、特殊符号）
- **排序规则**：utf8mb4_unicode_ci
- **数据库引擎**：InnoDB（支持事务和外键约束）
- **数据库版本**：MariaDB 10.11.15

---

## 表结构

### 1. 单词主表 (`words`)

存储单词及其音标信息。

#### 字段说明

| 字段名 | 数据类型 | 属性 | 说明 |
|--------|---------|------|------|
| `id` | INT | AUTO_INCREMENT PRIMARY KEY | 单词唯一标识符 |
| `word` | VARCHAR(100) | NOT NULL, UNIQUE | 单词文本（二进制比较，区分大小写） |
| `word_search` | VARCHAR(100) | GENERATED ALWAYS AS (lcase(`word`)) STORED | 用于不区分大小写的搜索（自动生成） |
| `ipas` | longtext | NOT NULL, CHECK (json_valid) | 音标数组JSON，如：`["ˈrek.ɚd", "rɪˈkɔːrd"]` |

#### 索引

| 索引名 | 类型 | 字段 | 说明 |
|--------|------|------|------|
| PRIMARY | 主键 | id | 主键索引 |
| idx_word_unique | 唯一 | word | 保证单词唯一性 |
| idx_word_search | 普通 | word_search | 加快不区分大小写的搜索 |

#### SQL 定义

```sql
CREATE TABLE `words` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `word` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    `word_search` VARCHAR(100) GENERATED ALWAYS AS (lcase(`word`)) STORED 
        COMMENT '用于不区分大小写的搜索',
    `ipas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL 
        CHECK (json_valid(`ipas`)) 
        COMMENT '音标数组JSON: ["ˈrek.ɚd", "rɪˈkɔːrd"]',
    UNIQUE INDEX `idx_word_unique` (`word`),
    INDEX `idx_word_search` (`word_search`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 插入示例

```sql
INSERT INTO `words` (`id`, `word`, `ipas`) VALUES (
    1, 
    'the', 
    '["ˈðə", "ðə", "ði"]'
);
```

---

### 2. 释义表 (`definitions`)

存储单词的词性和释义（支持多语言）。

#### 字段说明

| 字段名 | 数据类型 | 属性 | 说明 |
|--------|---------|------|------|
| `id` | INT | AUTO_INCREMENT PRIMARY KEY | 释义记录唯一标识符 |
| `word_id` | INT | NOT NULL, FOREIGN KEY | 引用 words 表的 id |
| `pos` | VARCHAR(10) | NOT NULL | 词性，如：`n.`(名词)、`v.`(动词)、`adj.`(形容词) |
| `ipa_idx` | TINYINT | DEFAULT 0 | 对应 words 表 ipas 数组的下标（0 表示第一个音标） |
| `meanings` | longtext | NOT NULL, CHECK (json_valid) | 多语言释义JSON对象 |

#### 约束

| 约束名 | 类型 | 说明 |
|--------|------|------|
| PRIMARY KEY (id) | 主键 | 主键约束 |
| fk_word_ref | 外键 | word_id 引用 words.id，删除级联 (ON DELETE CASCADE) |

#### SQL 定义

```sql
CREATE TABLE `definitions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `word_id` INT NOT NULL,
    `pos` VARCHAR(10) NOT NULL 
        COMMENT '词性: n.(名词), v.(动词), adj.(形容词)等',
    `ipa_idx` TINYINT DEFAULT 0 
        COMMENT '对应words表ipas数组的下标',
    `meanings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL 
        CHECK (json_valid(`meanings`)) 
        COMMENT '多语言释义JSON，格式：{"zh": ["义项1", "义项2"], "en": ["meaning1"]}',
    CONSTRAINT `fk_word_ref` FOREIGN KEY (`word_id`) 
        REFERENCES `words` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 插入示例

```sql
INSERT INTO `definitions` (`word_id`, `pos`, `ipa_idx`, `meanings`) VALUES (
    500,
    'n.',
    0,
    '{"zh": ["苹果"], "en": ["apple"]}'
);
```

---

## 数据格式详解

### ipas 字段（音标）

**类型**：JSON 数组  
**格式**：`["音标1", "音标2", ...]`

**示例**：
```json
["ˈrek.ɚd", "rɪˈkɔːrd"]
```

**特点**：
- 包含单词的所有音标变体
- 通常包括美式（第一个）和英式发音
- 索引从 0 开始
- 可用于 `ipa_idx` 字段定位

---

### meanings 字段（释义）

**类型**：JSON 对象  
**格式**：`{"语言代码": ["义项1", "义项2", ...]}`

**完整示例**：
```json
{
    "zh": ["凉爽的", "冷静的", "酷的"],
    "en": ["moderately cold", "fashionably attractive"],
    "jp": ["涼しい"]
}
```

**语言代码说明**：
- `zh`：中文释义（必需）
- `en`：英文释义（可选）
- `jp`：日文释义（可选）
- 可扩展支持其他语言

**特点**：
- 每个语言的值都是字符串数组
- 同一语言可包含多个义项
- 易于扩展新语言

---

## 数据示例

### words 表示例

| id | word | word_search | ipas |
|-------|--------|-------------|------|
| 1 | the | the | `["ˈðə", "ðə", "ði"]` |
| 2 | be | be | `["ˈbi", "bi"]` |
| 500 | record | record | `["ˈrek.ɚd", "rɪˈkɔːrd"]` |

### definitions 表示例

| id | word_id | pos | ipa_idx | meanings |
|-----|---------|-----|---------|----------|
| 1 | 500 | n. | 0 | `{"zh": ["唱片", "记录"], "en": ["record"]}` |
| 2 | 800 | n. | 0 | `{"zh": ["记录", "唱片"]}` |
| 3 | 800 | v. | 1 | `{"zh": ["录音", "记录"], "en": ["record"]}` |

---

## 关键特性

✅ **数据完整性**：
- 外键约束确保 `word_id` 必须存在于 words 表
- `JSON_VALID()` 检查确保 JSON 格式有效
- UNIQUE 约束保证单词唯一性

✅ **性能优化**：
- `word_search` 自动生成字段，加快不区分大小写的搜索
- 多个索引支持快速查询

✅ **多语言支持**：
- `meanings` 字段支持任意语言释义
- 易于扩展新语言

✅ **数据维护**：
- 级联删除：删除单词时自动删除其所有释义记录

---

## 常用查询

### 查询单词及其所有释义

```sql
SELECT 
    w.id,
    w.word,
    w.ipas,
    d.pos,
    d.ipa_idx,
    d.meanings
FROM words w
LEFT JOIN definitions d ON w.id = d.word_id
WHERE w.word = 'record';
```

### 不区分大小写搜索单词

```sql
SELECT * FROM words 
WHERE word_search = lcase('RECORD');
```

### 查询特定词性的单词

```sql
SELECT 
    w.word,
    d.pos,
    d.meanings
FROM definitions d
JOIN words w ON d.word_id = w.id
WHERE d.pos = 'v.' 
LIMIT 10;
```

### 查询包含特定中文释义的单词

```sql
SELECT 
    w.word,
    d.meanings
FROM definitions d
JOIN words w ON d.word_id = w.id
WHERE JSON_CONTAINS(d.meanings, '"录音"', '$.zh')
LIMIT 10;
```

---

## 字符集和排序规则

### 编码说明

- **utf8mb4**：完整的 UTF-8 编码，支持 4 字节字符（包括emoji）
- **utf8mb4_bin**：字段级别二进制排序（区分大小写）
- **utf8mb4_unicode_ci**：表级别通用排序（不区分大小写，"ci" = case-insensitive）

### 实现方式

| 字段 | 排序规则 | 说明 |
|------|---------|------|
| `word` | utf8mb4_bin | 保持原始大小写，区分大小写 |
| `word_search` | 表默认 | 自动生成小写版本，便于模糊搜索 |
| 其他字段 | utf8mb4_unicode_ci | 不区分大小写 |

---

## 外键关系

```
words (id) ─────→ definitions (word_id)
     ↓
   1:N 关系
   （一个单词可以有多个释义）
```

### 级联删除规则

- 当删除 `words` 表中的一条记录时
- 该单词在 `definitions` 表中的所有释义会自动删除
- 由 `CONSTRAINT fk_word_ref FOREIGN KEY ... ON DELETE CASCADE` 实现

---

## 数据库初始化

```sql
-- 创建数据库
CREATE DATABASE `va_basedict` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 切换到数据库
USE `va_basedict`;

-- 执行 va_basedict.sql 初始化创建表
SOURCE va_basedict.sql;

-- 导入数据（可选）
SOURCE va_basedict_import.sql;
```

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `va_basedict_schema.md` | 数据库设计文档 |
| `va_basedict_init.sql` | 数据库初始化SQL |
| `va_basedict_import.sql` | 生成的数据导入脚本 |
| `va_basedict_md2sql.py` | Markdown词库转SQL的转换脚本 |
| `coca_vocab_20k.md` | Markdown词库数据 |

---

## 版本历史

| 日期 | 版本 | 描述 |
|------|------|------|
| 2026-02-04 | 1.0 | 初始版本，基于 MariaDB 10.11.15 |

---

## 注意事项

⚠️ **字符编码**：
- 所有字符串字段使用 `utf8mb4` 编码
- 确保数据库连接也设置为 `utf8mb4`

⚠️ **JSON 格式**：
- meanings 字段必须包含至少一个语言（建议 `zh`）
- JSON 格式必须有效，否则会被 CHECK 约束拒绝

⚠️ **音标格式**：
- ipas 字段必须是有效的 JSON 数组
- 通常第一个音标为美式发音，第二个为英式发音

---

## 相关资源

- [MariaDB JSON 函数文档](https://mariadb.com/kb/en/json-functions/)
- [UTF8MB4 编码说明](https://mariadb.com/kb/en/character-sets/)
- [IPA 音标参考](https://www.internationalphoneticalphabet.org/)
