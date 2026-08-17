// Carga de variables de entorno desde el archivo .env
import 'dotenv/config';
// Importación del cliente nativo de MongoDB
import { MongoClient } from 'mongodb';
// Estilizado de texto y símbolos en terminal
import chalk from 'chalk';
import logSymbols from 'log-symbols';
// Importación de mapas de esquemas
import { schemasMap } from './dbSchemas.js';

// Singleton para administrar la conexión centralizada y las sesiones de MongoDB.
class Database {
    // Preserva la instancia única de conexión a la base de datos
    static client = null;
    static db = null;

    // Inicializa el pool de conexiones con el cluster de MongoDB.
    static async connect() {
        // Reutiliza la conexión existente si ya se encuentra abierta
        if (this.db) return this.db;

        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
        const dbName = process.env.DB_NAME || 'portafolio_freelance';

        try {
            // Instancia el cliente de MongoDB
            this.client = new MongoClient(uri);

            // Conecta al servidor de MongoDB
            await this.client.connect();
            this.db = this.client.db(dbName);

            // Aplica las validaciones $jsonSchema e índices a las colecciones
            await this.initSchemas();

            // Confirmación visual en consola
            console.log(`${logSymbols.success} ${chalk.green(`Conectado exitosamente a MongoDB [BD: ${dbName}]`)}`);
            return this.db;
        } catch (error) {
            // Notificación de error crítico en consola
            console.error(`${logSymbols.error} ${chalk.red('Error crítico de conexión a MongoDB:')}`, error.message);
            throw error;
        }
    }

    // Registra y actualiza esquemas $jsonSchema e índices en MongoDB
    static async initSchemas() {
        if (!this.db) return;

        // Obtiene las colecciones existentes en la BD
        const existingCollections = await this.db.listCollections().toArray();
        const existingNames = existingCollections.map(c => c.name);

        for (const [collName, schema] of Object.entries(schemasMap)) {
            if (existingNames.includes(collName)) {
                // Si la colección existe, actualiza las reglas de validación
                await this.db.command({
                    collMod: collName,
                    validator: schema,
                    validationLevel: 'strict'
                });
            } else {
                // Si la colección no existe, la crea con su validador
                await this.db.createCollection(collName, {
                    validator: schema,
                    validationLevel: 'strict'
                });
            }
        }

        // Creación de índices únicos de seguridad
        await this.db.collection('clients').createIndex({ email: 1 }, { unique: true });
        await this.db.collection('contracts').createIndex({ code: 1 }, { unique: true });
        await this.db.collection('finances').createIndex({ referenceCode: 1 }, { unique: true });
    }

    // Retorna la referencia de la base de datos activa.
    static getDb() {
        if (!this.db) {
            throw new Error('La base de datos no está inicializada. Ejecuta Database.connect() primero.');
        }
        return this.db;
    }

    // Retorna la instancia del cliente nativo de MongoDB.
    static getClient() {
        if (!this.client) {
            throw new Error('El cliente de MongoDB no está inicializado.');
        }
        return this.client;
    }

    // Inicia una sesión oficial de MongoDB para transacciones ACID.
    static startSession() {
        return this.getClient().startSession();
    }

    // Cierra de manera limpia las conexiones de MongoDB.
    static async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            console.log(`${logSymbols.info} ${chalk.yellow('Conexión con MongoDB cerrada correctamente.')}`);
        }
    }
}

export default Database;