const mongodb = require('mongodb')
const ObjectId = mongodb.ObjectId

class projectRepository {
  constructor(db) {
    this.db = db  };

  // Crear proyecto desde propuesta
  async createFromProposal(proposalData) {
    var col = this.db.collection('proposalRepository');

    let proyectoNuevo = {
      clientId: new ObjectId(proposalData.clientId),
      proposalId: new ObjectId(proposalData._id),
      nombre: 'Proyecto' + proposalData.description,
      estado: 'activo',
      porcentajeAvance: 0,
      historialAvances: [],
      fechaInicio: new Date()
    }

    console.log("Guardando proyecto nuevo...")
    let reultado = await col.insertOne(proyectoNuevo)
    return reultado
  }

  // Actualizar avance del proyecto
  async updateProgress(projectId, percentage, logNote) {
    var col = this.db.collection('proposalRepository')
    let id = new ObjectId(projectId)

    if (percentage < 0 || percentage > 100) {
      console.log("El porcentaje no es valido")
      return false
    }

    let nuevoRegistro = {
      porcentaje: percentage,
      nota: logNote,
      fecha: new Date()
    }

    let reultado = await col.updateOne(
      { _id: id },
      {
        $set: { porcentajeAvance: percentage },
        $push: { historialAvances: nuevoRegistro }
      }
    )
    return reultado
  };

  // Cambiar estado del proyecto
  async updateStatus(projectId, status) {
    var col = this.db.collection('proposalRepository')
    let id = new ObjectId(projectId)

    let estadosValidos = ['activo', 'pausado', 'finalizado', 'cancelado']

    if (!estadosValidos.includes(status)) {
      console.log("Estado no permitido")
      return false
    }

    let reultado = await col.updateOne(
      { _id: id },
      { $set: { estado: status } }
    )

    return reultado
  }
}