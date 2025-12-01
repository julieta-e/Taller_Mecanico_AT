const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. CONFIGURACIÓN DE BASE DE DATOS ---
const config = {
    user: 'TallerAppUser',       
    password: 'limasonso031404',          
    server: '192.168.0.8', 
    database: 'TallerMecanico_Negocio',
    options: {
        host: '192.168.0.8',
        port: 1433,
        encrypt: false, 
        trustServerCertificate: true
    }
};

// --- 2. ENDPOINT REGISTRO (CORREGIDO PARA NVARCHAR) ---
app.post('/register', async (req, res) => {
    let pool;
    let transaction;
    
    try {
        const { name, email, password, phone, doc_type, doc_num, address } = req.body;
        
        if (!name || !email || !password || !phone || !doc_type || !doc_num || !address) {
            return res.status(400).json({ error: "Faltan datos obligatorios para el registro. Asegúrate de llenar todos los campos." });
        }
        
        pool = await new sql.ConnectionPool(config).connect();
        transaction = new sql.Transaction(pool);
        await transaction.begin(); 

        const nameParts = name.trim().split(/\s+/); 
        let nombre = nameParts[0] || ''; 
        let apellido = nameParts.slice(1).join(" ") || null; 

        // 1. Insertar en Personas y obtener ID
        const requestPersona = new sql.Request(transaction);
        const resultPersona = await requestPersona
            .input('nombre', sql.VarChar, nombre)
            .input('apellido', sql.VarChar, apellido) 
            .input('telefono', sql.VarChar, phone)
            .input('email', sql.VarChar, email)
            .input('tipo_documento', sql.VarChar, doc_type)
            .input('nro_documento', sql.VarChar, doc_num)
            .input('direccion', sql.VarChar, address)
            .query(`INSERT INTO Personas (nombre, apellido, telefono, email, tipo_documento, nro_documento, direccion) 
                    OUTPUT INSERTED.id_persona 
                    VALUES (@nombre, @apellido, @telefono, @email, @tipo_documento, @nro_documento, @direccion)`);
        
        const personaId = resultPersona.recordset[0].id_persona;

        // 2. Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Insertar en Usuarios (puesto_id = 1 por defecto para CLIENTE)
        const requestUsuario = new sql.Request(transaction);
        await requestUsuario
            .input('persona_id', sql.Int, personaId)
            .input('email', sql.NVarChar, email) // Usar NVarChar para el email
            .input('password', sql.NVarChar, hashedPassword) // Usar NVarChar para el hash
            .query(`INSERT INTO Usuarios (persona_id, nombre_usuario, contraseña_hash, puesto_id) 
                    VALUES (@persona_id, @email, @password, 1)`); // ¡SIN CONVERSIONES! Se guarda el texto.

        await transaction.commit(); 
        res.json({ success: true, message: "Usuario registrado correctamente" });

    } catch (error) {
        if (transaction) await transaction.rollback(); 
        console.error("Error en /register:", error.message);
        
        if (error.code === 'EREQUEST' && error.originalError?.info?.number === 2627) {
             const dbError = "Ya existe un registro con el Correo Electrónico o el Número de Documento proporcionado. Por favor, verifica tus datos.";
             res.status(409).json({ error: dbError }); 
        } else {
            const genericError = "Error interno del servidor al registrar. Detalles: " + error.message;
            res.status(500).json({ error: genericError });
        }
    } finally {
        if (pool) pool.close();
    }
});

// --- 3. ENDPOINT LOGIN (CORREGIDO PARA NVARCHAR) ---
app.post('/login', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(config);
        const { email, password } = req.body;

        const result = await pool.request()
            .input('email', sql.NVarChar, email) // Usar NVarChar para la búsqueda
            .query(`
                SELECT 
                    U.id_usuario, 
                    U.nombre_usuario, 
                    U.contraseña_hash as pass_hash, -- ¡SIN CONVERTIR! Se selecciona el hash como texto (NVARCHAR)
                    U.puesto_id, 
                    P.nombre,
                    P.apellido
                FROM Usuarios U
                INNER JOIN Personas P ON U.persona_id = P.id_persona
                WHERE U.nombre_usuario = @email
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({ success: false, message: "Usuario o Contraseña incorrecta" });
        }

        const user = result.recordset[0];
        
        // Comparamos la contraseña (bcrypt ya recibe el hash como texto)
        const match = await bcrypt.compare(password, user.pass_hash);

        if (match) {
            // DEVOLVEMOS EL puesto_id al frontend
            res.json({ 
                success: true, 
                message: "Bienvenido", 
                user: { 
                    id: user.id_usuario, 
                    email: user.nombre_usuario,
                    nombre: user.nombre,       
                    apellido: user.apellido,
                    roleId: user.puesto_id 
                } 
            });
        } else {
            res.status(401).json({ success: false, message: "Usuario o Contraseña incorrecta" });
        }

    } catch (error) {
        console.error("Error en /login:", error.message);
        res.status(500).json({ error: error.message });
    } finally {
        if (pool) pool.close();
    }
});

// Endpoint Repuestos (Existente, sin cambios)
app.get('/api/repuestos/:id', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(config);
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM Inventario WHERE id_articulo = @id');
            
        if(result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({error: "No encontrado"});
        }
    } catch (e) { 
        console.error("Error en /api/repuestos:", e.message);
        res.status(500).send(e.message); 
    } finally {
        if (pool) pool.close();
    }
});

// Arrancar servidor
app.listen(3000, () => console.log("Servidor Node corriendo en puerto 3000..."));