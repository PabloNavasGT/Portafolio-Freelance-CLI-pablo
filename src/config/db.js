// Carga de variables de entorno desde el archivo .env
import 'dotenv/config';
// Importación del cliente nativo de MongoDB
import { MongoClient } from 'mongodb';
// Estilizado de texto y símbolos en terminal
import chalk from 'chalk';
import logSymbols from 'log-symbols';


//Singleton para administrar la conexión centralizada y las sesiones de MongoDB.
class Database {
    // Preserva la instancia única de conexión a la base de datos
    static client = null;
    static db = null;

    //Inicializa el pool de conexiones con el cluster de MongoDB.
    static async connect() {
        // Reutiliza la conexión existente si ya se encuentra abierta
        if (this.db) return this.db;

        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
        const dbName = process.env.DB_NAME || 'portafolio_freelance';

        try {
            // Instancia el cliente de MongoDB[cite: 3]
            this.client = new MongoClient(uri);

            // Conecta al servidor de MongoDB
            await this.client.connect();
            this.db = this.client.db(dbName);

            // Confirmación visual en consola[cite: 3]
            console.log(`${logSymbols.success} ${chalk.green(`Conectado exitosamente a MongoDB [BD: ${dbName}]`)}`);
            return this.db;
        } catch (error) {
            // Notificación de error crítico en consola[cite: 3]
            console.error(`${logSymbols.error} ${chalk.red('Error crítico de conexión a MongoDB:')}`, error.message);
            throw error;
        }
    }

    
    //Retorna la referencia de la base de datos activa.
    static getDb() {
        if (!this.db) {
            throw new Error('La base de datos no está inicializada. Ejecuta Database.connect() primero.');
        }
        return this.db;
    }

    
    //Retorna la instancia del cliente nativo de MongoDB.

    static getClient() {
        if (!this.client) {
            throw new Error('El cliente de MongoDB no está inicializado.');
        }
        return this.client;
    }

    
    //Inicia una sesión oficial de MongoDB para transacciones ACID.
    static startSession() {
        return this.getClient().startSession();
    }


    //Cierra de manera limpia las conexiones de MongoDB.
    
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