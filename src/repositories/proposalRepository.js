import { ObjectId } from 'mongodb';
import Database from '../config/db.js';

export default class ProposalRepository {
  //Guarda una nueva propuesta comercial en la base de datos.
  async create(proposalData) {
    try {
      const db = Database.getDb();
      const doc = proposalData.toDocument ? proposalData.toDocument() : proposalData;
      console.log("Guardando propuesta...");
      return await db.collection('proposals').insertOne(doc);
    } catch (error) {
      console.log("Error al guardar propuesta:", error.message);
      throw error;
    }
  }


  //Busca todas las propuestas comerciales pertenecientes a un cliente específico.
  async findByClientId(clientId) {
    try {
      const db = Database.getDb();
      const idBuscado = new ObjectId(clientId);

      const lista = await db.collection('proposals').find({ clientId: idBuscado }).toArray();
      console.log("Propuestas encontradas:", lista.length);
      return lista;
    } catch (error) {
      console.log("Error al buscar propuestas del cliente:", error.message);
      return [];
    }
  }

  //Acepta una propuesta comercial y crea de forma automática el proyecto asociado dentro de una transacción ACID.
  async acceptProposal(proposalId) {
    const session = Database.startSession();
    const db = Database.getDb();

    try {
      let resultado = false;
      // Transacción atómica que involucra las colecciones 'proposals' y 'projects'
      await session.withTransaction(async () => {
        const colPropuestas = db.collection('proposals');
        const id = new ObjectId(proposalId);

        const propuesta = await colPropuestas.findOne({ _id: id }, { session });

        if (!propuesta) {
          throw new Error("No existe esa propuesta");
        }
        if (propuesta.status === 'aceptada') {
          throw new Error("La propuesta ya está aceptada");
        }

        // 1. Marcar la propuesta como 'aceptada'
        await colPropuestas.updateOne(
          { _id: id },
          { $set: { status: 'aceptada' } },
          { session }
        );

        // 2. Instanciar e insertar el proyecto derivado automáticamente
        const colProyectos = db.collection('projects');
        const proyectoNuevo = {
          name: `Proyecto de propuesta: ${propuesta.title || propuesta._id}`,
          description: propuesta.description || '',
          clientId: propuesta.clientId,
          contractId: null,
          status: 'activo',
          progress: 0,
          budget: propuesta.price || 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await colProyectos.insertOne(proyectoNuevo, { session });
        resultado = true;
      });

      return resultado;
    } catch (error) {
      console.log("Error en la transacción de la propuesta:", error.message);
      return false;
    } finally {
      await session.endSession();
    }
  }
}