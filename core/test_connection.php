<?php
include_once 'Database.php';

$database = new Database();
$db = $database->getConnection(); // Esto intentará conectarse

if ($db) {
    echo "<h1>¡CONEXIÓN A LA BASE DE DATOS EXITOSA! ✅</h1>";
    try {
        $stmt = $db->query("SELECT COUNT(*) AS total FROM dbo.Personas");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "<p>Total de registros en dbo.Personas: <strong>" . $row['total'] . "</strong></p>";
    } catch (PDOException $e) {
        echo "<p>Error al consultar la tabla Personas: " . $e->getMessage() . "</p>";
    }
    
} else {
    // Si la conexión falla, el método getConnection ya habrá hecho un 'die'
}
?>