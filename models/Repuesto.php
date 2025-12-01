<?php
require_once 'core/Database.php';

class Repuesto {
    private $conn;
    private $table = "Inventario";

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    // Obtener todos (join con TiposRepuesto y Fabricantes)
    public function obtenerTodos($filtro = null) {
        $sql = "SELECT i.*, t.nombre AS tipo_nombre, f.nombre AS fabricante_nombre
                FROM {$this->table} i
                LEFT JOIN TiposRepuesto t ON i.tipo_repuesto_id = t.id_tipo
                LEFT JOIN Fabricantes f ON i.fabricante_id = f.id_fabricante";

        if (!empty($filtro)) {
            $sql .= " WHERE i.nombre LIKE :filtro OR i.sku LIKE :filtro";
            $stmt = $this->conn->prepare($sql);
            $like = "%$filtro%";
            $stmt->bindParam(":filtro", $like);
        } else {
            $stmt = $this->conn->prepare($sql);
        }

        $stmt->execute();
        return $stmt;
    }

    // Obtener uno por id
    public function obtenerPorId($id) {
        $sql = "SELECT i.*, t.nombre AS tipo_nombre, f.nombre AS fabricante_nombre
                FROM {$this->table} i
                LEFT JOIN TiposRepuesto t ON i.tipo_repuesto_id = t.id_tipo
                LEFT JOIN Fabricantes f ON i.fabricante_id = f.id_fabricante
                WHERE i.id_articulo = :id";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Crear repuesto
    public function crear($data) {
        $sql = "INSERT INTO {$this->table}
            (sku, tipo_repuesto_id, fabricante_id, proveedor_base_id, nombre, stock_actual, stock_minimo, precio_costo, precio_venta)
            VALUES (:sku, :tipo_id, :fabricante_id, :proveedor_id, :nombre, :stock_actual, :stock_minimo, :precio_costo, :precio_venta)";

        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(":sku", $data['sku']);
        $stmt->bindParam(":tipo_id", $data['tipo_repuesto_id']);
        $stmt->bindParam(":fabricante_id", $data['fabricante_id']);
        $stmt->bindParam(":proveedor_id", $data['proveedor_base_id']);
        $stmt->bindParam(":nombre", $data['nombre']);
        $stmt->bindParam(":stock_actual", $data['stock_actual']);
        $stmt->bindParam(":stock_minimo", $data['stock_minimo']);
        $stmt->bindParam(":precio_costo", $data['precio_costo']);
        $stmt->bindParam(":precio_venta", $data['precio_venta']);

        $ok = $stmt->execute();
        if ($ok) {
            // registrar transaccion inicial si stock_actual > 0
            if ((int)$data['stock_actual'] > 0) {
                $lastId = $this->conn->lastInsertId();
                $this->registrarTransaccionStock($lastId, (int)$data['stock_actual'], 'Entrada', 'Ingreso inicial al crear artículo');
            }
        }
        return $ok;
    }

    // Actualizar (si cambia stock, registra transacción)
    public function actualizar($id, $data) {
        // Leer stock actual
        $current = $this->obtenerStockActual($id);
        $nuevoStock = (int)$data['stock_actual'];

        $sql = "UPDATE {$this->table} SET
                    sku = :sku,
                    tipo_repuesto_id = :tipo_id,
                    fabricante_id = :fabricante_id,
                    proveedor_base_id = :proveedor_id,
                    nombre = :nombre,
                    stock_actual = :stock_actual,
                    stock_minimo = :stock_minimo,
                    precio_costo = :precio_costo,
                    precio_venta = :precio_venta
                WHERE id_articulo = :id";

        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(":sku", $data['sku']);
        $stmt->bindParam(":tipo_id", $data['tipo_repuesto_id']);
        $stmt->bindParam(":fabricante_id", $data['fabricante_id']);
        $stmt->bindParam(":proveedor_id", $data['proveedor_base_id']);
        $stmt->bindParam(":nombre", $data['nombre']);
        $stmt->bindParam(":stock_actual", $data['stock_actual']);
        $stmt->bindParam(":stock_minimo", $data['stock_minimo']);
        $stmt->bindParam(":precio_costo", $data['precio_costo']);
        $stmt->bindParam(":precio_venta", $data['precio_venta']);
        $stmt->bindParam(":id", $id);

        $ok = $stmt->execute();

        if ($ok) {
            // registrar transaccion si hubo cambio de stock
            $delta = $nuevoStock - $current;
            if ($delta != 0) {
                $tipo = $delta > 0 ? 'Entrada' : 'Salida';
                $this->registrarTransaccionStock($id, abs($delta), $tipo, 'Ajuste por edición de artículo');
            }
        }

        return $ok;
    }

    // Eliminar
    public function eliminar($id) {
        $sql = "DELETE FROM {$this->table} WHERE id_articulo = :id";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(":id", $id);
        return $stmt->execute();
    }

    // Obtener stock actual (int)
    private function obtenerStockActual($id) {
        $sql = "SELECT stock_actual FROM {$this->table} WHERE id_articulo = :id";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return $r ? (int)$r['stock_actual'] : 0;
    }

    // Registrar transaccion en TransaccionesStock
    public function registrarTransaccionStock($articulo_id, $cantidad, $tipo_movimiento, $comentario = null) {
        $sql = "INSERT INTO TransaccionesStock (articulo_id, tipo_movimiento, cantidad, fecha, comentario)
                VALUES (:articulo_id, :tipo_movimiento, :cantidad, :fecha, :comentario)";
        $stmt = $this->conn->prepare($sql);
        $fecha = date('Y-m-d H:i:s');
        $stmt->bindParam(":articulo_id", $articulo_id);
        $stmt->bindParam(":tipo_movimiento", $tipo_movimiento);
        $stmt->bindParam(":cantidad", $cantidad);
        $stmt->bindParam(":fecha", $fecha);
        $stmt->bindParam(":comentario", $comentario);
        return $stmt->execute();
    }

    // Obtener ubicaciones desde StockDetalleUbicacion
    public function obtenerUbicaciones($articulo_id) {
        $sql = "SELECT sdu.*, za.nombre AS zona_nombre, a.nombre AS almacen_nombre, su.nombre AS sucursal_nombre
                FROM StockDetalleUbicacion sdu
                LEFT JOIN ZonasAlmacenamiento za ON sdu.zona_id = za.id_zona
                LEFT JOIN Almacenes a ON za.almacen_id = a.id_almacen
                LEFT JOIN Sucursales su ON a.sucursal_id = su.id_sucursal
                WHERE sdu.articulo_id = :articulo_id";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(":articulo_id", $articulo_id);
        $stmt->execute();
        return $stmt;
    }

    // Obtener transacciones recientes
    public function obtenerTransacciones($articulo_id, $limit = 50) {
        $sql = "SELECT * FROM TransaccionesStock
                WHERE articulo_id = :articulo_id
                ORDER BY fecha DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(":articulo_id", $articulo_id);
        $stmt->execute();
        return $stmt;
    }

    // Obtener catálogos para formularios
    public function obtenerTipos() {
        $stmt = $this->conn->prepare("SELECT id_tipo, nombre FROM TiposRepuesto ORDER BY nombre");
        $stmt->execute();
        return $stmt;
    }

    public function obtenerFabricantes() {
        $stmt = $this->conn->prepare("SELECT id_fabricante, nombre FROM Fabricantes ORDER BY nombre");
        $stmt->execute();
        return $stmt;
    }

    public function obtenerProveedores() {
        $stmt = $this->conn->prepare("SELECT id_proveedor, nombre_empresa FROM Proveedores ORDER BY nombre_empresa");
        $stmt->execute();
        return $stmt;
    }
}
