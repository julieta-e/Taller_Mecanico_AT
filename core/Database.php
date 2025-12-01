<?php
// core/Database.php 

class Database {
    // Usaremos la IP y puerto que sabemos que funcionan en VS Code
    private $host = "0.0.0.0,PORT"; //IP,PUERTO
    private $db_name = "TallerMecanico_Negocio";
    private $username = "usuario";     
    private $password = "Password"; 
    public $conn;

    public function getConnection(){
        $this->conn = null;
        
        // DSN para SQL Server (sqlsrv). AGREGAMOS TrustServerCertificate=true
        $dsn = "sqlsrv:Server={$this->host};Database={$this->db_name};TrustServerCertificate=true";
        
        try{
            $this->conn = new PDO($dsn, $this->username, $this->password, array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ));
        }catch(PDOException $exception){
            // Si la conexión falla, se detiene y muestra el error.
            die("Error de conexión a la Base de Datos. Mensaje: " . $exception->getMessage());
        }

        return $this->conn;
    }
}
?>