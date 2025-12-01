document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.sidebar-nav a');
    // Las siguientes dos líneas asumen que este script se usa también en admin-dashboard.html
    const contentSections = document.querySelectorAll('.dashboard-section'); 

    // ===============================================
    // 1. LÓGICA DE NAVEGACIÓN (Tu código original)
    // ===============================================

    // Función para mostrar la sección activa
    const showSection = (targetId) => {
        // Solo ejecuta esto si contentSections existen (es decir, en admin-dashboard)
        if (contentSections.length > 0) {
            // Ocultar todas las secciones
            contentSections.forEach(section => {
                section.style.display = 'none';
            });

            // Mostrar la sección objetivo
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
        }

        // Remover la clase 'active' de todos los enlaces y añadirla al activo
        navLinks.forEach(link => {
            // Asegúrate de usar solo el hash para la comparación
            const linkHash = new URL(link.href).hash; 
            link.classList.remove('active');
            if (linkHash === targetId) {
                link.classList.add('active');
            }
        });
    };

    // Manejar el evento de clic en los enlaces de la barra lateral
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Solo previene el default si es un enlace de navegación interna
            const targetId = new URL(this.href).hash;
            if (targetId.startsWith('#')) {
                 e.preventDefault(); 
                 showSection(targetId);
            } else if (this.getAttribute('href') === 'logout') {
                 // Simulación de cierre de sesión
                 e.preventDefault(); 
                 alert('Cerrando sesión administrativa.');
                 window.location.href = 'cuenta.html'; // Redirigir al login principal
            }
        });
    });

    // Mostrar la sección de inicio al cargar (o la sección definida en el hash URL)
    const initialSection = window.location.hash || '#inicio';
    // Comprobación para evitar errores si no estamos en admin-dashboard.html
    if (contentSections.length > 0) {
        showSection(initialSection);
    }
    
    // ===============================================
    // 2. FUNCIÓN PARA CARGAR DATOS EN MODO EDICIÓN
    // ===============================================
    
    /**
     * @brief Simula la carga de datos de un repuesto por su ID y llena el formulario.
     * En una aplicación real, esto haría una llamada a la API/Base de Datos.
     * @param {string} repuestoId El ID del repuesto a cargar.
     */
    
const loadRepuestoData = async (repuestoId) => {
    console.log(`Cargando datos ID: ${repuestoId}...`);
    
    try {
        // Conexión real al servidor
        const response = await fetch(`http://localhost:3000/api/repuestos/${repuestoId}`);
        if (!response.ok) throw new Error('Error al cargar datos');
        
        const data = await response.json();
        
        // Llenar formulario (asegúrate que los IDs de tus inputs coincidan con los nombres de la BD)
        document.getElementById('nombre-repuesto').value = data.nombre;
        document.getElementById('sku-repuesto').value = data.sku;
        // ... resto de campos
        
    } catch (error) {
        console.error("Error:", error);
        alert("No se pudo cargar la información de la base de datos.");
    }
};
    // ===============================================
    // 3. LÓGICA DEL FORMULARIO INVENTARIO
    // ===============================================

    const urlParams = new URLSearchParams(window.location.search);
    const repuestoId = urlParams.get('id'); // Busca el parámetro 'id' en la URL

    const formTitle = document.getElementById('form-title');
    const submitButton = document.getElementById('submit-button');
    
    // Solo ejecuta esta lógica si los elementos existen en la página
    if (formTitle && submitButton) {
        if (repuestoId) {
            // **MODO EDICIÓN**
            formTitle.textContent = `📝 Editar Repuesto ID: ${repuestoId}`;
            submitButton.textContent = 'Actualizar Repuesto';
            
            // 🚨 SOLUCIÓN: Llama a la función para cargar los datos
            loadRepuestoData(repuestoId); 

        } else {
            // **MODO AÑADIR** (Valor por defecto)
            formTitle.textContent = '📦 Añadir Nuevo Repuesto';
            submitButton.textContent = 'Guardar Repuesto';
        }
        
        // Manejar el envío del formulario para edición/guardado (ejemplo)
        document.getElementById('repuesto-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const action = repuestoId ? 'Actualizar' : 'Guardar';
            alert(`Acción: ${action} repuesto. ID: ${repuestoId || 'Nuevo'}. (Funcionalidad de envío real no implementada)`);
            // Aquí iría la lógica para enviar los datos a tu backend
        });
    }
    document.addEventListener('DOMContentLoaded', function () {
    
    // --- LÓGICA DEL SUBMENÚ DESPLEGABLE ---
    const menuItemsWithSubmenu = document.querySelectorAll('.has-submenu > .main-link');

    menuItemsWithSubmenu.forEach(function (link) {
        link.addEventListener('click', function (e) {
            // Evitar que el enlace principal navegue (importante para que el submenú se abra)
            e.preventDefault(); 
            
            const parentLi = link.closest('li');
            const isCurrentlyOpen = parentLi.classList.contains('open');
            
            // 1. Cerrar cualquier otro submenú abierto
            document.querySelectorAll('.has-submenu').forEach(function(item) {
                // Elimina la clase 'open' de todos, incluso del actual
                item.classList.remove('open');
            });
            
            // 2. Si el menú no estaba abierto, lo abrimos después de haber cerrado los demás
            if (!isCurrentlyOpen) {
                parentLi.classList.add('open');
            }

            // 3. Manejar el cambio de sección principal después de abrir/cerrar el menú
            handleSectionChange(link);
        });
    });

    // --- LÓGICA DEL CAMBIO DE SECCIÓN EN MAIN (Contenido principal) ---
    const allLinks = document.querySelectorAll('.sidebar-nav a');
    
    // Asignar el evento click a TODOS los enlaces, incluidos los del submenú
    allLinks.forEach(link => {
        // Solo para enlaces que comienzan con '#' (navegación interna)
        if (link.getAttribute('href') && link.getAttribute('href').startsWith('#')) {
            link.addEventListener('click', function(e) {
                // Si es un enlace principal, ya lo manejamos arriba, pero nos aseguramos del cambio de sección
                if (!this.classList.contains('main-link')) {
                    // Si es un subenlace, prevenimos el default para que solo cambie la sección si es necesario
                    // e.preventDefault(); // Descomentar si no quieres que el URL cambie
                    handleSectionChange(this);
                }
            });
        }
    });

    // Función auxiliar para manejar la activación de la sección y el enlace
    function handleSectionChange(clickedLink) {
        const sections = document.querySelectorAll('.dashboard-section');
        const href = clickedLink.getAttribute('href');
        
        // 1. Ocultar todas las secciones
        sections.forEach(section => {
            section.style.display = 'none';
        });

        // 2. Mostrar la sección correspondiente
        const targetSection = document.querySelector(href);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // 3. Manejar la clase 'active' para resaltado
        document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
        
        if (clickedLink.classList.contains('main-link')) {
             // Si es el enlace principal, lo activamos
             clickedLink.classList.add('active');
        } else if (clickedLink.closest('.submenu')) {
            // Si es un subenlace, activamos el enlace principal padre
            clickedLink.closest('li.has-submenu').querySelector('.main-link').classList.add('active');
        } else {
            // Otros enlaces
            clickedLink.classList.add('active');
        }
    }
    
    // Inicializar: Asegurar que la sección de Inicio esté visible al cargar
    handleSectionChange(document.querySelector('.sidebar-nav a[href="#inicio"]'));
});
});
