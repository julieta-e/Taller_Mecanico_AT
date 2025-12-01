document.addEventListener('DOMContentLoaded', () => {

    // 1. Smooth scrolling para enlaces de ancla (ej. #contacto)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            if (targetId.length > 1 && document.querySelector(targetId)) {
                document.querySelector(targetId).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // 2. Lógica del buscador de repuestos (Necesita elementos en repuestos.html)
    const buscadorInput = document.getElementById('buscador-input');
    const filtroCategoria = document.getElementById('filtro-categoria');
    const repuestosGrid = document.getElementById('repuestos-grid');
    const noResultados = document.getElementById('no-resultados');

    if (buscadorInput && filtroCategoria && repuestosGrid) {
        
        const repuestoItems = repuestosGrid.querySelectorAll('.repuesto-item');

        const filtrarRepuestos = () => {
            const searchTerm = buscadorInput.value.toLowerCase();
            const selectedCategory = filtroCategoria.value;
            let resultadosEncontrados = 0;

            repuestoItems.forEach(item => {
                const itemTitulo = item.querySelector('h4').textContent.toLowerCase();
                const itemCategoria = item.getAttribute('data-categoria');

                // Condiciones de filtrado
                const matchBusqueda = itemTitulo.includes(searchTerm);
                const matchCategoria = (selectedCategory === 'todos') || (itemCategoria === selectedCategory);

                // Mostrar u ocultar el ítem
                if (matchBusqueda && matchCategoria) {
                    item.classList.remove('hidden');
                    resultadosEncontrados++;
                } else {
                    item.classList.add('hidden');
                }
            });

            // Mostrar u ocultar el mensaje de "No resultados"
            if (resultadosEncontrados === 0) {
                noResultados.style.display = 'block';
            } else {
                noResultados.style.display = 'none';
            }
        };

        // Añadir los "escuchadores" de eventos
        buscadorInput.addEventListener('input', filtrarRepuestos);
        filtroCategoria.addEventListener('change', filtrarRepuestos);
    }

    // -----------------------------------------------------------
    // 3. Lógica para el toggle de Login/Registro y Acceso
    // -----------------------------------------------------------
    
    // Elementos del Toggle de formularios
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const switchToRegisterLink = document.getElementById('switch-to-register'); 
    const switchToLoginLink = document.getElementById('switch-to-login'); 

    if (loginForm && registerForm) {
        
        function showForm(formToShow, formToHide) {
            formToShow.classList.add('active');
            formToHide.classList.remove('active');
            formToShow.style.display = 'block'; 
            formToHide.style.display = 'none'; 
        }

        // Listener para ir a REGISTRO
        if (switchToRegisterLink) {
            switchToRegisterLink.addEventListener('click', (e) => {
                e.preventDefault(); 
                showForm(registerForm, loginForm); 
            });
        }
        
        // Listener para ir a LOGIN
        if (switchToLoginLink) {
            switchToLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                showForm(loginForm, registerForm);
            });
        }
        
        // Inicialización
        showForm(loginForm, registerForm);
    }
    
    // Elementos del Formulario de Login para el submit
    const loginFormSubmit = document.querySelector('#login-form form');
    
    // ✅ CORRECCIÓN DE IDS: Usamos los IDs reales del HTML
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password'); 

    // --- Variables de Simulación de Administrador ---
    const ADMIN_EMAIL = 'admin@taller.com'; 
    const ADMIN_PASS = '1234'; 

    // Lógica de Simulación de Acceso Administrativo/Usuario
    if (loginFormSubmit && emailInput && passwordInput) {
        loginFormSubmit.addEventListener('submit', function(e) {
            e.preventDefault(); 
            
            const enteredEmail = emailInput.value.trim();
            const enteredPass = passwordInput.value.trim();

            if (enteredEmail === ADMIN_EMAIL && enteredPass === ADMIN_PASS) {
                // Acceso de Administrador: Redirigir al Dashboard
                alert('Acceso de Administrador simulado exitoso. Redirigiendo a Dashboard...');
                window.location.href = 'admin-dashboard.html'; 
            } else {
                // Acceso de Usuario Normal: Simulación
                alert('Ingreso de usuario normal simulado. ¡Bienvenido!');
                window.location.href = 'perfil-usuario.html';
            }
        });
    }

    document.addEventListener('DOMContentLoaded', updateHeaderBasedOnLogin);

function updateHeaderBasedOnLogin() {
    const user = localStorage.getItem('user');
    const navActions = document.querySelector('.nav-actions');
    
    // Si la página actual es la de cuenta.html, no hacemos nada (para que no redirija)
    if (window.location.pathname.includes('cuenta.html')) {
        return;
    }

    if (user) {
        const userData = JSON.parse(user);
        
        // 1. Creamos el nuevo HTML para el usuario
        const userInfoHTML = `
            <a href="perfil.html" class="account-link active" id="profile-name-link">
                Hola, ${userData.nombre}
            </a>
            <a href="#" class="cta-button logout-button" id="global-logout-button">
                Cerrar Sesión
            </a>
        `;
        
        // 2. Reemplazamos el contenido existente
        navActions.innerHTML = userInfoHTML + 
                                `<a href="agendar_cita.html" class="cta-button">Agendar Cita</a>`;
        
        // 3. Añadimos el listener para cerrar sesión
        document.getElementById('global-logout-button').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('user');
            // Aquí puedes llamar al endpoint de Node.js para invalidar el token si lo usas.
            window.location.href = 'index.html';
        });

    } else {
        // Si no está logueado, nos aseguramos de que diga "Iniciar Sesión"
        navActions.innerHTML = `
            <a href="cuenta.html" class="account-link">Iniciar sesion</a>
            <a href="agendar_cita.html" class="cta-button">Agendar Cita</a>
        `;
    }
}
});