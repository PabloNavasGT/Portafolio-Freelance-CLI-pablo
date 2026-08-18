import Database from '../config/db.js';
import { generateNextId } from '../utils/idGenerator.js';

export default class ClientRepository {
    async findByCredentials(email, password) {
        try {
            const db = Database.getDb();
            return await db.collection("clients").findOne({ email, password });
        } catch (error) {
            console.log("Error al buscar cliente por credenciales:", error.message);
            return null;
        }
    }

    async create(clientData) {
        try {
            const db = Database.getDb();
            const col = db.collection("clients");
            const doc = clientData.toDocument ? clientData.toDocument() : { ...clientData };
            
            if (!doc._id) {
                doc._id = await generateNextId(col, 'C');
            }

            return await col.insertOne(doc);
        } catch (error) {
            console.log("Error al crear cliente:", error.message);
            throw error;
        }
    }

    async updatePhone(clientId, phone) {
        try {
            const db = Database.getDb();
            return await db.collection("clients").updateOne(
                { _id: clientId },
                { $set: { phone } }
            );
        } catch (error) {
            console.log("Error al actualizar telefono:", error.message);
            return null;
        }
    }

    async findAll() {
        try {
            const db = Database.getDb();
            return await db.collection("clients").find().toArray();
        } catch (error) {
            console.log("Error al obtener lista de clientes:", error.message);
            return [];
        }
    }

    async deleteById(clientId) {
        try {
            const db = Database.getDb();
            return await db.collection("clients").deleteOne({ _id: clientId });
        } catch (error) {
            console.log("Error al eliminar cliente:", error.message);
            return null;
        }
    }
}