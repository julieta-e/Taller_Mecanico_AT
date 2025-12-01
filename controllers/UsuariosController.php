<?php
include_once __DIR__ . '/../models/Usuario.php';

$action = $_GET['action'] ?? 'index';
$model = new Usuario();

switch($action) {
    case 'index':
        $usuarios = $model->getAll();
        include __DIR__ . '/../views/usuarios/index.php';
        break;

    case 'crear':
        if($_SERVER['REQUEST_METHOD'] === 'POST') {
            $model->create($_POST);
            header('Location: index.php');
            exit;
        }
        include __DIR__ . '/../views/usuarios/crear.php';
        break;

    case 'editar':
        $id = $_GET['id'];
        if($_SERVER['REQUEST_METHOD'] === 'POST') {
            $model->update($id, $_POST);
            header('Location: index.php');
            exit;
        }
        $usuario = $model->getById($id);
        include __DIR__ . '/../views/usuarios/editar.php';
        break;

    case 'eliminar':
        $id = $_GET['id'];
        $model->delete($id);
        header('Location: index.php');
        break;
}
