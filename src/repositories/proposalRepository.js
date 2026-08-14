const mongodb = require('mongodb')
const ObjectId = mongodb.ObjectId

class proposalRepository {
  constructor(db, client) {
    this.db = db
    this.client = client
  }
//guardar nuevas propuestas
  async create(proposalData) {
    var coleccion = this.db.collection('proposalRepository')

    let propuestaGuardar = {
      description: proposalData.description,
      precio: proposalData.precio,
      plazos: proposalData.plazos,
      clientId: new ObjectId(proposalData.clientId),
      estado: 'pendiente',
      fechaCreacion: new Date()
    }

    console.log("Guardando propuesta...")
    let reultado = await coleccion.insertOne(propuestaGuardar)
    return reultado
  }
//traer proyectos
  async findByClientId(clientId) {
    var coleccion = this.db.collection('proposalRepository')
    let idBuscado = new ObjectId(clientId);

    let lista = await coleccion.find({ clientId: _id }).toArray()
    console.log("Propuestas encontradas:", lista.length)
    return lista
  }
//Cambia el estado a "aceptada" y dispara la creación automática del proyecto
  async acceptProposal(proposalId) {
    let sesion = this.client.startSession()

    try {
      sesion.startTransaction()

      let colPropuestas = this.db.collection('proposalRepository')
      let id = new ObjectId(proposalId)

      let propuesta = await colPropuestas.findOne({ _id: id }, { session: sesion })

      if (propuesta == null) {
        console.log("No existe esa propuesta")
        return false
      }
      if (propuesta.estado == 'aceptada') {
        console.log("La propuesta ya esta aceptada")
        return "ya aceptada"
      }

      await colPropuestas.updateOne(
        { _id: id },
        { $set: { estado: 'aceptada' } },
        { session: sesion }
      )

      let colProyectos = this.db.collection('proposalRepository')

      let proyectoNuevo = {
        nombre: 'Proyecto de propuesta' + propuesta._id,
        clientId: propuesta.clientId,
        proposalId: propuesta._id,
        estado: 'activo',
        fechaInicio: new Date()
      }

      let resProy = await colProyectos.insertOne(proyectoNuevo, { session: sesion })

      await sesion.commitTransaction()
      sesion.endSession()

      return true
    } catch (error) {
      await sesion.abortTransaction()
      sesion.endSession()
      console.log("ups... hubo un error",error)
      return false
    }
  }}

module.exports = proposalRepository