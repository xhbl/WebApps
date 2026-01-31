<?php
require_once 'dbcfg.php';

class DB
{
    /**
     * Test connection to DB server (without selecting database)
     * @return bool True if connect ok, false if failed
     */
    public static function testConnection(&$errorMsg = null)
    {
        $dsn = "mysql:host=" . C_VNB_DB_HOST . ";charset=" . C_DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, C_VNB_DB_USER, C_VNB_DB_PASS, $options);
            return true;
        } catch (PDOException $e) {
            $errorMsg = $e->getMessage();
            return false;
        }
    }
    private static $instances = [];

    /**
     * Get PDO connection for a specific database
     */
    public static function con($dbname = C_VNB_DB_NAME)
    {
        if (!isset(self::$instances[$dbname])) {
            $dsn = "mysql:host=" . C_VNB_DB_HOST . ";dbname=" . $dbname . ";charset=" . C_DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            try {
                self::$instances[$dbname] = new PDO($dsn, C_VNB_DB_USER, C_VNB_DB_PASS, $options);
            } catch (PDOException $e) {
                return null;
            }
        }
        return self::$instances[$dbname];
    }

    /** Helper for Application DB */
    public static function vnb()
    {
        return self::con(C_VNB_DB_NAME);
    }

    /** Helper for Base Dictionary DB */
    public static function base()
    {
        return self::con(C_DB_BASE);
    }
}

/** Legacy support wrappers */
function vnb_dbconnect()
{
    return DB::vnb();
}
function vnb_db_con()
{
    return DB::vnb();
}
function vnb_dbselectadmin()
{
    return DB::vnb() !== null;
}
// Do not close PHP tag to avoid accidental output
