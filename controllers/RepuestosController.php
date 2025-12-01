<?php
include_once __DIR__ . '/../models/Inventario.php';

$action = $_GET['action'] ?? 'index';
$model = new Inventario();

switch($action) {
    case 'index':
        $repuestos = $model->getAll();
        include __DIR__ . '/../views/repuestos/index.php';
        break;

    case 'crear':
        if($_SERVER['REQUEST_METHOD'] === 'POST') {
            $model->create($_POST);
            header('Location: index.php');
            exit;
        }
        include __DIR__ . '/../views/repuestos/crear.php';
        break;

    case 'editar':
        $id = $_GET['id'];
        if($_SERVER['REQUEST_METHOD'] === 'POST') {
            $model->update($id, $_POST);
            header('Location: index.php');
            exit;
        }
        $repuesto = $model->getById($id);
        include __DIR__ . '/../views/repuestos/editar.php';
        break;

    case 'eliminar':
        $id = $_GET['id'];
        $model->delete($id);
        header('Location: index.php');
        break;

    case 'detalle':
        $id = $_GET['id'];
        $repuesto = $model->getById($id);
        include __DIR__ . '/../views/repuestos/detalle.php';
        break;
}
