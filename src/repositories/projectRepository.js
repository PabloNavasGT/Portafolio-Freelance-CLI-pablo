import { ObjectId } from 'mongodb';
import Database from '../config/db.js';

export default class ProjectRepository {

  //Guarda un nuevo proyecto en la base de datos.
  async create(projectData) {
    try {
      const db = Database.getDb();
      const doc = projectData.toDocument ? projectData.toDocument() : projectData;
      console.log("Guardando proyecto nuevo...");
      return await db.collection('projects').insertOne(doc);
    } catch (error) {
      console.log("Error al crear proyecto:", error.message);
      throw error;
    }
  }

  //Actualiza el porcentaje de avance de un proyecto y registra la nota en el arreglo de bitácora/logs.
  async updateProgress(projectId, percentage, logNote) {
    try {
      const db = Database.getDb();
      const id = new ObjectId(projectId);

      if (percentage < 0 || percentage > 100) {
        console.log("El porcentaje no es válido");
        return false;
      }

      const nuevoRegistro = {
        note: logNote,
        percentage: percentage,
        date: new Date()
      };

      return await db.collection('projects').updateOne(
        { _id: id },
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

  //Cambia el estado del proyecto verificando la lista de estados permitidos.
  async updateStatus(projectId, status) {
    try {
      const db = Database.getDb();
      const id = new ObjectId(projectId);
      const estadosValidos = ['activo', 'pausado', 'finalizado', 'cancelado'];

      if (!estadosValidos.includes(status)) {
        console.log("Estado no permitido");
        return false;
      }

      return await db.collection('projects').updateOne(
        { _id: id },
        { $set: { status: status, updatedAt: new Date() } }
      );
    } catch (error) {
      console.log("Error al cambiar estado:", error.message);
      return null;
    }
  }

  //Obtiene la información de un proyecto mediante su ObjectId.
  async findById(projectId) {
    try {
      const db = Database.getDb();
      return await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    } catch (error) {
      console.log("Error al buscar proyecto:", error.message);
      return null;
    }
  }

  //Consulta el listado completo de proyectos registrados.
  async findAll() {
    try {
      const db = Database.getDb();
      return await db.collection('projects').find().toArray();
    } catch (error) {
      console.log("Error al obtener proyectos:", error.message);
      return [];
    }
  }
}