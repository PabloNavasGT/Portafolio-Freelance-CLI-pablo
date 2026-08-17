import { ObjectId } from 'mongodb';

export default class Proposal {
  //Instancia una nueva Propuesta.

  constructor({ clientId = null, title, description = '', price, deadline = null, status = 'pendiente', _id = null }) {
    this._id = _id ? new ObjectId(_id) : null;
    this.clientId = clientId ? new ObjectId(clientId) : null;
    this.title = title;
    this.description = description;
    this.price = Number(price) || 0;
    // Conversión de fecha límite a objeto Date
    this.deadline = deadline ? new Date(deadline) : null;
    this.status = status;
    this.createdAt = new Date();
  }

  //Valida el cumplimiento de reglas financieras y de estado base.
  validarReglasBase() {
    if (this.price < 0) {
      console.log("El precio no puede ser negativo");
      return false;
    }

    const estadosValidos = ['pendiente', 'aceptada', 'rechazada'];
    if (!estadosValidos.includes(this.status)) {
      console.log("Estado de propuesta no válido");
      return false;
    }

    return true;
  }

  //Mapea y convierte una propuesta aceptada en un objeto base para un nuevo Proyecto.
  convertirAProyecto() {
    if (this.status === 'aceptada') {
      return {
        name: `Proyecto derivado: ${this.title}`,
        description: this.description,
        clientId: this.clientId,
        status: 'activo',
        progress: 0,
        budget: this.price,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    console.log("La propuesta debe estar en estado 'aceptada' para convertirse en proyecto");
    return null;
  }

  //Convierte la propuesta a documento BSON compatible con MongoDB.
  toDocument() {
    const doc = {
      title: this.title,
      description: this.description,
      price: this.price,
      status: this.status,
      deadline: this.deadline,
      clientId: this.clientId,
      createdAt: this.createdAt
    };
    if (this._id) doc._id = this._id;
    return doc;
  }
}