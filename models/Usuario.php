<?php
include_once __DIR__ . '/../core/Database.php';

class Usuario {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    public function getAll() {
        $stmt = $this->conn->query("SELECT u.id_usuario, p.nombre, u.username, u.email FROM Usuarios u
                                    LEFT JOIN Personas p ON u.persona_id = p.id_persona");
        return $stmt->fetchAll();
    }

    public function getById($id) {
        $stmt = $this->conn->prepare("SELECT * FROM Usuarios WHERE id_usuario = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function create($data) {
        $stmt = $this->conn->prepare("INSERT INTO Usuarios (persona_id, username, email, password) VALUES (:persona, :username, :email, :password)");
        return $stmt->execute([
            'persona' => $data['persona_id'],
            'username' => $data['username'],
            'email' => $data['email'],
            'password' => password_hash($data['password'], PASSWORD_DEFAULT)
        ]);
    }

    public function update($id, $data) {
        $stmt = $this->conn->prepare("UPDATE Usuarios SET persona_id=:persona, username=:username, email=:email, password=:password WHERE id_usuario=:id");
        return $stmt->execute([
            'persona' => $data['persona_id'],
            'username' => $data['username'],
            'email' => $data['email'],
            'password' => password_hash($data['password'], PASSWORD_DEFAULT),
            'id' => $id
        ]);
    }

    public function delete($id) {
        $stmt = $this->conn->prepare("DELETE FROM Usuarios WHERE id_usuario=:id");
        return $stmt->execute(['id' => $id]);
    }
}
