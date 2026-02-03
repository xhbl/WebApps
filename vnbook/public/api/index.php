<?php
require_once 'dbcfg.php';

header('Content-Type: text/html; charset=utf-8');

// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<h1>🚀 Backend Environment Test</h1>";

// 1. Test directory mapping
echo "<p>✅ <b>Directory Mapping:</b> Success! Docker is correctly reading the code.</p>";

// 2. Test PHP environment
echo "<p>🐘 <b>PHP Version:</b> " . PHP_VERSION . "</p>";

// 3. Test if Xdebug is enabled
if (extension_loaded('xdebug')) {
    echo "<p>🐞 <b>Xdebug Status:</b> <span style='color:green;'>Enabled</span></p>";
} else {
    echo "<p>🐞 <b>Xdebug Status:</b> <span style='color:red;'>Not detected (Check if Dockerfile built successfully)</span></p>";
}

// 4. Test database driver
if (extension_loaded('mysqli')) {
    echo "<p>🐬 <b>MySQLi Driver:</b> <span style='color:green;'>Installed</span></p>";
} else {
    echo "<p>🐬 <b>MySQLi Driver:</b> <span style='color:red;'>Not installed</span></p>";
}

// 5. Test PDO support
if (extension_loaded('pdo')) {
    echo "<p>📦 <b>PDO Extension:</b> <span style='color:green;'>Loaded</span></p>";

    // Check for PDO MySQL driver
    $pdo_drivers = PDO::getAvailableDrivers();
    if (in_array('mysql', $pdo_drivers)) {
        echo "<p>🗄️ <b>PDO MySQL Driver:</b> <span style='color:green;'>Available</span></p>";
    } else {
        echo "<p>🗄️ <b>PDO MySQL Driver:</b> <span style='color:red;'>Not available</span></p>";
    }
} else {
    echo "<p>📦 <b>PDO Extension:</b> <span style='color:red;'>Not loaded</span></p>";
}

// --- 6. Database connection test ---
echo "<h3>🗄️ Database Connection Test</h3>";

try {
    // Step 1: Connect to MySQL server without specifying database
    $conn = new mysqli(C_VNB_DB_HOST, C_VNB_DB_USER, C_VNB_DB_PASS);

    // Check for connection error
    if ($conn->connect_error) {
        throw new Exception("Database server connection failed: " . $conn->connect_error);
    }

    echo "<p>✅ <b>MySQL Server:</b> <span style='color:green;'>Connected</span></p>";

    // Step 2: Check if target database exists
    $dbCheckResult = $conn->query("SHOW DATABASES LIKE '" . C_VNB_DB_NAME . "'");

    if ($dbCheckResult && $dbCheckResult->num_rows > 0) {
        // Database exists, select it and view tables
        $conn->select_db(C_VNB_DB_NAME);
        echo "<p>✅ <b>Database:</b> <span style='color:green;'>" . C_VNB_DB_NAME . " exists</span></p>";

        // Query table count
        $result = $conn->query("SHOW TABLES");
        if ($result) {
            echo "<p>📊 <b>Table Count:</b> " . $result->num_rows . "</p>";

            if ($result->num_rows > 0) {
                echo "<p style='color:gray; font-size:0.9em;'>Table List: ";
                $tables = [];
                while ($row = $result->fetch_array()) {
                    $tables[] = $row[0];
                }
                echo implode(', ', $tables) . "</p>";
            }
        }
    } else {
        // Database does not exist
        echo "<p>⚠️ <b>Database:</b> <span style='color:orange;'>Database <code>" . C_VNB_DB_NAME . "</code> not yet created</span></p>";
        echo "<p>💡 <b>Tip:</b> Admin will automatically create database on first app login</p>";
    }

    $conn->close();
} catch (Exception $e) {
    $errorMsg = $e->getMessage();
    echo "<p>❌ <b>Connection Failed:</b> <span style='color:red;'>" . $errorMsg . "</span></p>";

    // Show different tips based on error message
    if (strpos($errorMsg, 'Access denied') !== false) {
        // Authentication failed
        echo "<p>💡 <b>Tip:</b> Username or password incorrect. Check <code>C_VNB_DB_USER</code> and <code>C_VNB_DB_PASS</code> in <code>public/api/dbcfg.php</code></p>";
    } else {
        // Host connection failed
        echo "<p>💡 <b>Tip:</b> Cannot connect to database server. Please check:</p>";
        echo "<ul style='margin-left: 20px;'>";
        echo "<li>Is Docker container running: <code>docker ps</code></li>";
        echo "<li>If using Docker, HOST should be service name (e.g., <code>" . C_VNB_DB_HOST . "</code>), not <code>localhost</code></li>";
        echo "<li>Check <code>C_VNB_DB_HOST</code> configuration in <code>public/api/dbcfg.php</code></li>";
        echo "</ul>";
    }
}

echo "<hr>";
echo "<p>🖥️ <b>Server Time:</b> " . date('Y-m-d H:i:s \U\T\C', time()) . "</p>";
echo "<p>🌐 <b>Client Time:</b> <span id='client-time'></span> <span id='client-tz' style='font-size:0.9em; color:#666;'></span></p>";
echo "<script>";
echo "const clientTime = new Date();";
echo "const year = clientTime.getFullYear();";
echo "const month = String(clientTime.getMonth() + 1).padStart(2, '0');";
echo "const day = String(clientTime.getDate()).padStart(2, '0');";
echo "const hours = String(clientTime.getHours()).padStart(2, '0');";
echo "const minutes = String(clientTime.getMinutes()).padStart(2, '0');";
echo "const seconds = String(clientTime.getSeconds()).padStart(2, '0');";
echo "const formattedTime = year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;";
echo "document.getElementById('client-time').textContent = formattedTime;";
echo "try {";
echo "  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;";
echo "  const offsetMs = clientTime.getTimezoneOffset() * 60000;";
echo "  const offsetHours = Math.floor(Math.abs(offsetMs) / 3600000);";
echo "  const offsetMins = Math.floor((Math.abs(offsetMs) % 3600000) / 60000);";
echo "  const offsetSign = offsetMs <= 0 ? '+' : '-';";
echo "  const offsetStr = offsetSign + String(offsetHours).padStart(2, '0') + ':' + String(offsetMins).padStart(2, '0');";
echo "  document.getElementById('client-tz').textContent = '(' + tzName + ' ' + offsetStr + ')';";
echo "} catch(e) {";
echo "  document.getElementById('client-tz').textContent = '(Timezone unknown)';";
echo "}";
echo "</script>";
