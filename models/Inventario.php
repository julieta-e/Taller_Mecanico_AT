<?php
include_once __DIR__ . '/../core/Database.php';

class Inventario {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    public function getAll() {
        $stmt = $this->conn->query("SELECT i.id_articulo, i.nombre, i.sku, t.nombre AS tipo, f.nombre AS fabricante, i.stock_actual 
                                    FROM Inventario i
                                    LEFT JOIN TiposRepuesto t ON i.tipo_repuesto_id = t.id_tipo
                                    LEFT JOIN Fabricantes f ON i.fabricante_id = f.id_fabricante");
        return $stmt->fetchAll();
    }

    public function getById($id) {
        $stmt = $this->conn->prepare("SELECT * FROM Inventario WHERE id_articulo = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function create($data) {
        $stmt = $this->conn->prepare("INSERT INTO Inventario (sku, nombre, tipo_repuesto_id, fabricante_id, proveedor_base_id, stock_actual, stock_minimo, precio_costo, precio_venta) 
                                      VALUES (:sku, :nombre, :tipo, :fabricante, :proveedor, :stock, :stock_minimo, :costo, :venta)");
        return $stmt->execute([
            'sku' => $data['sku'],
            'nombre' => $data['nombre'],
            'tipo' => $data['tipo_repuesto_id'],
            'fabricante' => $data['fabricante_id'],
            'proveedor' => $data['proveedor_base_id'],
            'stock' => $data['stock_actual'],
            'stock_minimo' => $data['stock_minimo'],
            'costo' => $data['precio_costo'],
            'venta' => $data['precio_venta']
        ]);
    }

    public function update($id, $data) {
        $stmt = $this->conn->prepare("UPDATE Inventario SET sku=:sku, nombre=:nombre, tipo_repuesto_id=:tipo, fabricante_id=:fabricante, proveedor_base_id=:proveedor, stock_actual=:stock, stock_minimo=:stock_minimo, precio_costo=:costo, precio_venta=:venta WHERE id_articulo=:id");
        return $stmt->execute([
            'sku' => $data['sku'],
            'nombre' => $data['nombre'],
            'tipo' => $data['tipo_repuesto_id'],
            'fabricante' => $data['fabricante_id'],
            'proveedor' => $data['proveedor_base_id'],
            'stock' => $data['stock_actual'],
            'stock_minimo' => $data['stock_minimo'],
            'costo' => $data['precio_costo'],
            'venta' => $data['precio_venta'],
            'id' => $id
        ]);
    }

    public function delete($id) {
        $stmt = $this->conn->prepare("DELETE FROM Inventario WHERE id_articulo=:id");
        return $stmt->execute(['id' => $id]);
    }
}
