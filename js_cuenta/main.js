document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  // ---------------- LOGIN ----------------
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;

      const res = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        alert("Login correcto. Rol: " + data.role);
        // window.location.href = "admin-dashboard.html";
      } else {
        alert(data.error);
      }
    });
  }

  // ---------------- REGISTER ----------------
  // --- Manejo del Formulario de REGISTRO ---
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const data = {
            name: document.getElementById('register-name').value,
            email: document.getElementById('register-email').value,
            password: document.getElementById('register-password').value,
            phone: document.getElementById('register-phone').value,
        };

        try {
            // CAMBIO IMPORTANTE: Apuntar a Node.js
            const response = await fetch('http://localhost:3000/register', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showMessage('✅ ' + result.message, true);
                registerForm.reset();
                switchForm('login');
            } else {
                showMessage('❌ ' + (result.message || result.error), false);
            }
        } catch (error) {
            showMessage('❌ Error de conexión con el servidor Node (3000).', false);
            console.error(error);
        }
    });
}
});
