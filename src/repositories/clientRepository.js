import { ObjectId } from 'mongodb';
import Database from '../config/db.js';

export default class ClientRepository {
    //Busca un cliente registrado mediante sus credenciales de acceso.
    async findByCredentials(email, password) {
        try {
            const db = Database.getDb();
            return await db.collection("clients").findOne({ email, password });
        } catch (error) {
            console.log("Error al buscar cliente por credenciales:", error.message);
            return null;
        }
    }

    //Registra un nuevo cliente en la base de datos.
    async create(clientData) {
        try {
            const db = Database.getDb();
            // Si recibe una instancia de modelo, utiliza toDocument() para limpiar el objeto BSON
            const doc = clientData.toDocument ? clientData.toDocument() : clientData;
            return await db.collection("clients").insertOne(doc);
        } catch (error) {
            console.log("Error al crear cliente:", error.message);
            throw error;
        }
    }

    //Actualiza el número de contacto telefónico de un cliente existente.
    async updatePhone(clientId, phone) {
        try {
            const db = Database.getDb();
            return await db.collection("clients").updateOne(
                { _id: new ObjectId(clientId) },
                { $set: { phone } }
            );
        } catch (error) {
            console.log("Error al actualizar teléfono:", error.message);
            return null;
        }
    }

    //Recupera el listado completo de clientes guardados.
    async findAll() {
        try {
            const db = Database.getDb();
            return await db.collection("clients").find().toArray();
        } catch (error) {
            console.log("Error al obtener lista de clientes:", error.message);
            return [];
        }
    }

    //Elimina un registro de cliente según su ObjectId.
    async deleteById(clientId) {
        try {
            const db = Database.getDb();
            return await db.collection("clients").deleteOne({ _id: new ObjectId(clientId) });
        } catch (error) {
            console.log("Error al eliminar cliente:", error.message);
            return null;
        }
    }
}