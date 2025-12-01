<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema Taller AT</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://kit.fontawesome.com/tu-kit.js" crossorigin="anonymous"></script>
    <link rel="stylesheet" href="/style.css">
</head>
<body class="admin-body">
<aside class="sidebar">
    <div class="logo-admin"><img src="/assets/img/systmec-Photoroom.png" alt="Logo" onerror="this.style.display='none'"></div>
    <nav class="sidebar-nav">
        <ul>
            <li><a href="?modulo=dashboard">Inicio</a></li>
            <li class="has-submenu">
                <a href="javascript:void(0)" class="main-link" onclick="toggleMenu(this)">Repuestos</a>
                <ul class="submenu">
                    <li><a href="?modulo=repuestos-index">Catálogo</a></li>
                    <li><a href="?modulo=repuestos-crear">Agregar</a></li>
                </ul>
            </li>
            <li class="has-submenu">
                <a href="javascript:void(0)" class="main-link" onclick="toggleMenu(this)">Usuarios</a>
                <ul class="submenu">
                    <li><a href="?modulo=usuarios-index">Lista</a></li>
                    <li><a href="?modulo=usuarios-crear">Crear Usuario</a></li>
                </ul>
            </li>
            <li class="logout-link"><a href="/logout.php">Cerrar Sesión</a></li>
        </ul>
    </nav>
</aside>
<main>
<div class="dashboard-content">
