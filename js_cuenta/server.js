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

// ==================================================
// 2. ENDPOINTS DE AUTENTICACIÓN (EXISTENTES)
// ==================================================

// [MANTENEMOS LOS ENDPOINTS DE /register Y /login SIN CAMBIOS]

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
            .input('nombre', sql.NVarChar, nombre)
            .input('apellido', sql.NVarChar, apellido) 
            .input('telefono', sql.NVarChar, phone)
            .input('email', sql.NVarChar, email)
            .input('tipo_documento', sql.NVarChar, doc_type)
            .input('nro_documento', sql.NVarChar, doc_num)
            .input('direccion', sql.NVarChar, address)
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
            .input('email', sql.NVarChar, email) 
            .input('password', sql.NVarChar, hashedPassword) 
            .query(`INSERT INTO Usuarios (persona_id, nombre_usuario, contraseña_hash, puesto_id) 
                    VALUES (@persona_id, @email, @password, 1)`); 

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

app.post('/login', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(config);
        const { email, password } = req.body;

        const result = await pool.request()
            .input('email', sql.NVarChar, email) 
            .query(`
                SELECT 
                    U.id_usuario, 
                    U.nombre_usuario, 
                    U.contraseña_hash as pass_hash, 
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
        const match = await bcrypt.compare(password, user.pass_hash);

        if (match) {
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


// ==================================================
// 3. ENDPOINTS DE CLIENTES (CRUD COMPLETO)
// ==================================================

// --- CREAR CLIENTE (POST) ---
app.post('/api/clientes', async (req, res) => {
    let pool;
    let transaction;
    
    try {
        const { nombre, apellido, telefono, email, tipo_documento, nro_documento, direccion, codigo_cliente } = req.body;
        
        if (!nombre || !telefono || !email || !nro_documento) {
             return res.status(400).json({ error: "Faltan campos obligatorios (nombre, teléfono, email, nro_documento)." });
        }

        pool = await new sql.ConnectionPool(config).connect();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. Insertar en Personas y obtener ID
        const resultPersona = await new sql.Request(transaction)
            .input('nombre', sql.NVarChar, nombre)
            .input('apellido', sql.NVarChar, apellido || null)
            .input('telefono', sql.NVarChar, telefono)
            .input('email', sql.NVarChar, email)
            .input('tipo_documento', sql.NVarChar, tipo_documento || 'CC')
            .input('nro_documento', sql.NVarChar, nro_documento)
            .input('direccion', sql.NVarChar, direccion || null)
            .query(`INSERT INTO Personas (nombre, apellido, telefono, email, tipo_documento, nro_documento, direccion, fecha_registro) 
                    OUTPUT INSERTED.id_persona 
                    VALUES (@nombre, @apellido, @telefono, @email, @tipo_documento, @nro_documento, @direccion, GETDATE())`);
        
        const personaId = resultPersona.recordset[0].id_persona;
        
        const clientCode = codigo_cliente || `CLI-${personaId}`;

        // 2. Insertar en Clientes
        await new sql.Request(transaction)
            .input('persona_id', sql.Int, personaId)
            .input('codigo_cliente', sql.NVarChar, clientCode)
            .query(`INSERT INTO Clientes (persona_id, codigo_cliente) VALUES (@persona_id, @codigo_cliente)`);

        await transaction.commit(); 
        res.json({ success: true, message: "Cliente registrado correctamente", id_persona: personaId });

    } catch (error) {
        if (transaction) await transaction.rollback(); 
        console.error("Error al crear cliente:", error.message);
        res.status(500).json({ error: "Error interno al crear el cliente." });
    } finally {
        if (pool) pool.close();
    }
});

// --- LISTAR TODOS LOS CLIENTES (GET) ---
app.get('/api/clientes', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT 
                C.id_cliente, 
                C.codigo_cliente, 
                P.nombre, 
                P.apellido, 
                P.telefono, 
                P.email, 
                P.direccion,
                P.nro_documento
            FROM Clientes C
            INNER JOIN Personas P ON C.persona_id = P.id_persona
            ORDER BY P.nombre
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error al listar clientes:", error.message);
        res.status(500).json({ error: "Error al obtener la lista de clientes." });
    } finally {
        if (pool) pool.close();
    }
});

// --- BUSCAR CLIENTE POR ID (GET por ID) ---
app.get('/api/clientes/:id', async (req, res) => {
    let pool;
    try {
        const id_cliente = req.params.id;
        pool = await sql.connect(config);
        const result = await pool.request()
            .input('id_cliente', sql.Int, id_cliente)
            .query(`
                SELECT 
                    C.id_cliente, 
                    C.codigo_cliente, 
                    P.id_persona,
                    P.nombre, 
                    P.apellido, 
                    P.telefono, 
                    P.email, 
                    P.direccion,
                    P.tipo_documento,
                    P.nro_documento
                FROM Clientes C
                INNER JOIN Personas P ON C.persona_id = P.id_persona
                WHERE C.id_cliente = @id_cliente
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Cliente no encontrado." });
        }

        res.json(result.recordset[0]);
    } catch (error) {
        console.error("Error al buscar cliente:", error.message);
        res.status(500).json({ error: "Error interno al buscar el cliente." });
    } finally {
        if (pool) pool.close();
    }
});

// --- MODIFICAR CLIENTE (PUT) ---
app.put('/api/clientes/:id', async (req, res) => {
    let pool;
    try {
        const id_cliente = req.params.id;
        const { nombre, apellido, telefono, email, direccion, nro_documento, codigo_cliente } = req.body;
        
        if (!nombre || !telefono || !email) {
             return res.status(400).json({ error: "Faltan campos obligatorios para la actualización." });
        }

        pool = await sql.connect(config);

        // 1. Obtener el persona_id
        const resultCliente = await pool.request()
            .input('id_cliente', sql.Int, id_cliente)
            .query('SELECT persona_id FROM Clientes WHERE id_cliente = @id_cliente');

        if (resultCliente.recordset.length === 0) {
            return res.status(404).json({ error: "Cliente no encontrado." });
        }
        const personaId = resultCliente.recordset[0].persona_id;

        // 2. Actualizar Personas
        await pool.request()
            .input('id_persona', sql.Int, personaId)
            .input('nombre', sql.NVarChar, nombre)
            .input('apellido', sql.NVarChar, apellido || null)
            .input('telefono', sql.NVarChar, telefono)
            .input('email', sql.NVarChar, email)
            .input('direccion', sql.NVarChar, direccion || null)
            .input('nro_documento', sql.NVarChar, nro_documento)
            .query(`
                UPDATE Personas SET 
                    nombre = @nombre, 
                    apellido = @apellido, 
                    telefono = @telefono, 
                    email = @email, 
                    direccion = @direccion,
                    nro_documento = @nro_documento
                WHERE id_persona = @id_persona
            `);

        // 3. Actualizar código de cliente (opcional)
        if (codigo_cliente) {
             await pool.request()
                .input('id_cliente', sql.Int, id_cliente)
                .input('codigo_cliente', sql.NVarChar, codigo_cliente)
                .query('UPDATE Clientes SET codigo_cliente = @codigo_cliente WHERE id_cliente = @id_cliente');
        }

        res.json({ success: true, message: "Cliente actualizado correctamente." });

    } catch (error) {
        console.error("Error al modificar cliente:", error.message);
        res.status(500).json({ error: "Error interno al actualizar el cliente." });
    } finally {
        if (pool) pool.close();
    }
});

// --- ELIMINAR CLIENTE (DELETE) ---
// Se recomienda usar transacciones para asegurar que se elimina la entrada en Clientes y Personas.
app.delete('/api/clientes/:id', async (req, res) => {
    let pool;
    let transaction;
    try {
        const id_cliente = req.params.id;

        pool = await new sql.ConnectionPool(config).connect();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. Obtener persona_id
        const resultCliente = await new sql.Request(transaction)
            .input('id_cliente', sql.Int, id_cliente)
            .query('SELECT persona_id FROM Clientes WHERE id_cliente = @id_cliente');

        if (resultCliente.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: "Cliente no encontrado." });
        }
        const personaId = resultCliente.recordset[0].persona_id;

        // 2. Eliminar de Clientes
        await new sql.Request(transaction)
            .input('id_cliente', sql.Int, id_cliente)
            .query('DELETE FROM Clientes WHERE id_cliente = @id_cliente');

        // 3. Eliminar de Personas
        // NOTA: Si la persona tiene un usuario asociado o está vinculada a otras tablas (ej. Empleados),
        // SQL Server podría restringir esta eliminación.
        await new sql.Request(transaction)
            .input('id_persona', sql.Int, personaId)
            .query('DELETE FROM Personas WHERE id_persona = @id_persona');
        
        await transaction.commit();
        res.json({ success: true, message: "Cliente y Persona eliminados correctamente." });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Error al eliminar cliente:", error.message);
        // Sugerencia de error para restricciones de FK
        const errorMessage = (error.code === 'EREQUEST' && error.originalError?.info?.number === 547) 
                           ? "Error de integridad: El cliente tiene registros asociados (ej. Órdenes, Citas) y no puede ser eliminado. Considere Inactivarlo en su lugar."
                           : "Error interno al eliminar el cliente.";
        res.status(500).json({ error: errorMessage });
    } finally {
        if (pool) pool.close();
    }
});


// ==================================================
// 4. ENDPOINTS DE PROVEEDORES (CRUD COMPLETO)
// ==================================================

// --- CREAR PROVEEDOR (POST) ---
app.post('/api/proveedores', async (req, res) => {
    let pool;
    let transaction;
    
    try {
        const { nombre_empresa, contacto_nombre, contacto_telefono, contacto_email } = req.body;
        
        if (!nombre_empresa || !contacto_nombre || !contacto_telefono) {
             return res.status(400).json({ error: "Faltan campos obligatorios (Nombre Empresa, Nombre Contacto, Teléfono Contacto)." });
        }

        pool = await new sql.ConnectionPool(config).connect();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. Insertar en Proveedores y obtener ID
        const resultProveedor = await new sql.Request(transaction)
            .input('nombre_empresa', sql.NVarChar, nombre_empresa)
            .query(`INSERT INTO Proveedores (nombre_empresa) 
                    OUTPUT INSERTED.id_proveedor 
                    VALUES (@nombre_empresa)`);
        
        const proveedorId = resultProveedor.recordset[0].id_proveedor;
        
        // 2. Insertar Contacto Principal
        await new sql.Request(transaction)
            .input('proveedor_id', sql.Int, proveedorId)
            .input('nombre', sql.NVarChar, contacto_nombre)
            .input('telefono', sql.NVarChar, contacto_telefono)
            .input('email', sql.NVarChar, contacto_email || null)
            .query(`INSERT INTO ContactosProveedor (proveedor_id, nombre, telefono, email) 
                    VALUES (@proveedor_id, @nombre, @telefono, @email)`);

        await transaction.commit(); 
        res.json({ success: true, message: "Proveedor registrado correctamente.", id_proveedor: proveedorId });

    } catch (error) {
        if (transaction) await transaction.rollback(); 
        console.error("Error al crear proveedor:", error.message);
        res.status(500).json({ error: "Error interno al crear el proveedor." });
    } finally {
        if (pool) pool.close();
    }
});

// --- LISTAR PROVEEDORES (GET) ---
app.get('/api/proveedores', async (req, res) => {
    let pool;
    try {
        pool = await sql.connect(config);
        const result = await pool.request().query(`
            SELECT 
                PR.id_proveedor, 
                PR.nombre_empresa,
                C.nombre AS contacto_nombre,
                C.telefono AS contacto_telefono,
                C.email AS contacto_email
            FROM Proveedores PR
            LEFT JOIN ContactosProveedor C ON PR.id_proveedor = C.proveedor_id -- Se asume que el primer contacto es el principal para la lista
            ORDER BY PR.nombre_empresa
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error al listar proveedores:", error.message);
        res.status(500).json({ error: "Error al obtener la lista de proveedores." });
    } finally {
        if (pool) pool.close();
    }
});

// --- BUSCAR PROVEEDOR POR ID (GET por ID) ---
app.get('/api/proveedores/:id', async (req, res) => {
    let pool;
    try {
        const id_proveedor = req.params.id;
        pool = await sql.connect(config);
        const result = await pool.request()
            .input('id_proveedor', sql.Int, id_proveedor)
            .query(`
                SELECT 
                    PR.id_proveedor, 
                    PR.nombre_empresa,
                    C.nombre AS contacto_nombre,
                    C.telefono AS contacto_telefono,
                    C.email AS contacto_email,
                    C.id_contacto
                FROM Proveedores PR
                LEFT JOIN ContactosProveedor C ON PR.id_proveedor = C.proveedor_id
                WHERE PR.id_proveedor = @id_proveedor
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Proveedor no encontrado." });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error("Error al buscar proveedor:", error.message);
        res.status(500).json({ error: "Error interno al buscar el proveedor." });
    } finally {
        if (pool) pool.close();
    }
});

// --- MODIFICAR PROVEEDOR (PUT) ---
app.put('/api/proveedores/:id', async (req, res) => {
    let pool;
    let transaction;
    try {
        const id_proveedor = req.params.id;
        const { nombre_empresa, contacto_nombre, contacto_telefono, contacto_email, id_contacto } = req.body;
        
        if (!nombre_empresa || !contacto_nombre || !contacto_telefono) {
             return res.status(400).json({ error: "Faltan campos obligatorios para la actualización." });
        }

        pool = await new sql.ConnectionPool(config).connect();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. Actualizar nombre de la empresa
        await new sql.Request(transaction)
            .input('id_proveedor', sql.Int, id_proveedor)
            .input('nombre_empresa', sql.NVarChar, nombre_empresa)
            .query('UPDATE Proveedores SET nombre_empresa = @nombre_empresa WHERE id_proveedor = @id_proveedor');

        // 2. Actualizar contacto principal (asumiendo que id_contacto viene en el body)
        if (id_contacto) {
            await new sql.Request(transaction)
                .input('id_contacto', sql.Int, id_contacto)
                .input('nombre', sql.NVarChar, contacto_nombre)
                .input('telefono', sql.NVarChar, contacto_telefono)
                .input('email', sql.NVarChar, contacto_email || null)
                .query(`
                    UPDATE ContactosProveedor SET 
                        nombre = @nombre, 
                        telefono = @telefono, 
                        email = @email
                    WHERE id_contacto = @id_contacto AND proveedor_id = @id_proveedor
                `);
        } else {
             // Si no hay id_contacto, se podría insertar un nuevo contacto si el front lo soporta, o simplemente ignorar la actualización de contacto
             console.warn(`Proveedor ${id_proveedor} actualizado sin ID de contacto proporcionado.`);
        }
        
        await transaction.commit();
        res.json({ success: true, message: "Proveedor actualizado correctamente." });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Error al modificar proveedor:", error.message);
        res.status(500).json({ error: "Error interno al actualizar el proveedor." });
    } finally {
        if (pool) pool.close();
    }
});

// --- ELIMINAR PROVEEDOR (DELETE) ---
app.delete('/api/proveedores/:id', async (req, res) => {
    let pool;
    let transaction;
    try {
        const id_proveedor = req.params.id;

        pool = await new sql.ConnectionPool(config).connect();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // 1. Eliminar Contactos asociados (Debe hacerse primero)
        await new sql.Request(transaction)
            .input('id_proveedor', sql.Int, id_proveedor)
            .query('DELETE FROM ContactosProveedor WHERE proveedor_id = @id_proveedor');

        // 2. Eliminar Proveedor
        const result = await new sql.Request(transaction)
            .input('id_proveedor', sql.Int, id_proveedor)
            .query('DELETE FROM Proveedores WHERE id_proveedor = @id_proveedor');

        if (result.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: "Proveedor no encontrado." });
        }
        
        await transaction.commit();
        res.json({ success: true, message: "Proveedor eliminado correctamente." });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error("Error al eliminar proveedor:", error.message);
        const errorMessage = (error.code === 'EREQUEST' && error.originalError?.info?.number === 547) 
                           ? "Error de integridad: El proveedor tiene artículos en Inventario o Pedidos de Compra asociados y no puede ser eliminado."
                           : "Error interno al eliminar el proveedor.";
        res.status(500).json({ error: errorMessage });
    } finally {
        if (pool) pool.close();
    }
});


// ... (Secciones 1, 2, 3 y 4 se mantienen sin cambios) ...

// ==================================================
// 5. ENDPOINTS DE CITAS
// ==================================================

// --- AGENDAR CITA (POST) - MODIFICADO PARA PLACA LIBRE ---
app.post('/api/citas', async (req, res) => {
    let pool;
    let transaction;
    let final_vehiculo_id;
    
    try {
        // Ahora recibimos 'placa_texto' y 'vehiculo_id' puede ser nulo/vacío
        const { cliente_id, vehiculo_id, placa_texto, fecha_hora, estado_cita = 'Pendiente' } = req.body;
        
        // Nueva validación: Necesita cliente_id, fecha_hora y *placa_texto* (ya sea registrado o nuevo)
        if (!cliente_id || !placa_texto || !fecha_hora) {
             return res.status(400).json({ error: "Faltan campos obligatorios (cliente_id, placa_texto, fecha_hora)." });
        }
        
        pool = await new sql.ConnectionPool(config).connect();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        final_vehiculo_id = vehiculo_id;
        const placa_normalizada = placa_texto.trim().toUpperCase();
        
        // 1. Lógica para manejar la placa ingresada libremente (si no hay ID de vehículo seleccionado)
        if (!final_vehiculo_id) {
            // A. Buscar si la placa ya existe para este cliente
            let resultVehiculo = await new sql.Request(transaction)
                .input('placa', sql.NVarChar, placa_normalizada)
                .input('cliente_id', sql.Int, cliente_id)
                .query(`SELECT id_vehiculo FROM Vehiculos WHERE placa = @placa AND cliente_id = @cliente_id`);

            if (resultVehiculo.recordset.length > 0) {
                // El vehículo existe, usamos su ID
                final_vehiculo_id = resultVehiculo.recordset[0].id_vehiculo;
            } else {
                // B. El vehículo no existe, crearlo con datos mínimos.
                // Usamos 'Genérico' para campos obligatorios de la tabla Vehiculos
                const newVehicleResult = await new sql.Request(transaction)
                    .input('cliente_id', sql.Int, cliente_id)
                    .input('placa', sql.NVarChar, placa_normalizada)
                    .input('fabricante', sql.NVarChar, 'Genérico')
                    .input('modelo', sql.NVarChar, 'Placa Nueva')
                    .input('anio', sql.Int, new Date().getFullYear()) // Usar año actual por defecto
                    .query(`
                        INSERT INTO Vehiculos (cliente_id, placa, fabricante, modelo, anio) 
                        OUTPUT INSERTED.id_vehiculo 
                        VALUES (@cliente_id, @placa, @fabricante, @modelo, @anio)
                    `);
                
                final_vehiculo_id = newVehicleResult.recordset[0].id_vehiculo;
            }
        }
        
        // 2. Insertar la cita con el ID de vehículo garantizado
        const resultCita = await new sql.Request(transaction)
            .input('cliente_id', sql.Int, cliente_id)
            .input('vehiculo_id', sql.Int, final_vehiculo_id) // Usamos el ID de vehículo encontrado o creado
            .input('fecha_hora', sql.DateTime2, new Date(fecha_hora)) 
            .input('estado_cita', sql.NVarChar, estado_cita)
            .query(`INSERT INTO CitasTaller (cliente_id, vehiculo_id, fecha_hora, estado_cita) 
                    OUTPUT INSERTED.id_cita 
                    VALUES (@cliente_id, @vehiculo_id, @fecha_hora, @estado_cita)`);

        const id_cita = resultCita.recordset[0].id_cita;
        
        await transaction.commit(); 
        res.json({ success: true, message: "Cita agendada correctamente. Vehículo registrado si era nuevo.", id_cita });

    } catch (error) {
        if (transaction) await transaction.rollback(); 
        console.error("Error al agendar cita:", error.message);
        res.status(500).json({ error: "Error interno al agendar la cita. Detalles: " + error.message });
    } finally {
        if (pool) pool.close();
    }
});

// ... (El resto de los endpoints de Citas y Vehículos se mantienen sin cambios) ...

// Arrancar servidor
app.listen(3000, () => console.log("Servidor Node corriendo en puerto 3000..."));