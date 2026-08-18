import Database from '../config/db.js';
import { generateNextId } from '../utils/idGenerator.js';

export default class ProjectRepository {
  async create(projectData) {
    try {
      const db = Database.getDb();
      const col = db.collection('projects');
      const doc = projectData.toDocument ? projectData.toDocument() : { ...projectData };

      if (!doc._id) {
        doc._id = await generateNextId(col, 'A');
      }

      console.log("Guardando proyecto nuevo...");
      return await col.insertOne(doc);
    } catch (error) {
      console.log("Error al crear proyecto:", error.message);
      throw error;
    }
  }

  async updateProgress(projectId, percentage, logNote) {
    try {
      const db = Database.getDb();

      if (percentage < 0 || percentage > 100) {
        console.log("El porcentaje no es valido");
        return false;
      }

      const nuevoRegistro = {
        note: logNote,
        percentage: percentage,
        date: new Date()
      };

      return await db.collection('projects').updateOne(
        { _id: projectId },
        {
          $set: { progress: percentage, updatedAt: new Date() },
          $push: { logs: nuevoRegistro }
        }
      );
    } catch (error) {
      console.log("Error al actualizar avance:", error.message);
      return null;
    }
  }

  async updateStatus(projectId, status) {
    try {
      const db = Database.getDb();
      const estadosValidos = ['activo', 'pausado', 'finalizado', 'cancelado'];

      if (!estadosValidos.includes(status)) {
        console.log("Estado no permitido");
        return false;
      }

      return await db.collection('projects').updateOne(
        { _id: projectId },
        { $set: { status: status, updatedAt: new Date() } }
      );
    } catch (error) {
      console.log("Error al cambiar estado:", error.message);
      return null;
    }
  }

  async findById(projectId) {
    try {
      const db = Database.getDb();
      return await db.collection('projects').findOne({ _id: projectId });
    } catch (error) {
      console.log("Error al buscar proyecto:", error.message);
      return null;
    }
  }

  async findAll() {
    try {
      const db = Database.getDb();
      return await db.collection('projects').find().toArray();
    } catch (error) {
      console.log("Error al obtener lista de proyectos:", error.message);
      return [];
    }
  }
}