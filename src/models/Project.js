import { ObjectId } from 'mongodb';

export default class Project {
  constructor({ clientId, name, budget, description = '', contractId = null, status = 'activo', progress = 0, _id = null }) {
    this._id = _id ? new ObjectId(_id) : null;
    this.clientId = clientId ? new ObjectId(clientId) : null;
    this.contractId = contractId ? new ObjectId(contractId) : null;
    this.name = name;
    this.description = description;
    this.budget = Number(budget) || 0;
    this.status = status;
    this.progress = Number(progress) || 0;
    this.logs = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  validarEstado(nuevoEstado) {
    const estadosPermitidos = ['activo', 'pausado', 'finalizado', 'cancelado'];
    if (estadosPermitidos.includes(nuevoEstado)) {
      return true;
    }
    console.log("El estado no es válido");
    return false;
  }

  cambiarEstado(nuevoEstado) {
    if (this.validarEstado(nuevoEstado)) {
      this.status = nuevoEstado;
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  validarPorcentaje(porcentaje) {
    if (typeof porcentaje !== 'number' || isNaN(porcentaje)) {
      console.log("El porcentaje debe ser un valor numérico");
      return false;
    }
    if (porcentaje >= 0 && porcentaje <= 100) {
      return true;
    }
    console.log("El porcentaje de avance debe estar entre 0 y 100");
    return false;
  }

  registrarAvance(note, percentage) {
    if (this.validarPorcentaje(percentage)) {
      this.progress = percentage;
      this.logs.push({
        note,
        percentage,
        date: new Date()
      });
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  toDocument() {
    const doc = {
      name: this.name,
      description: this.description,
      clientId: this.clientId,
      contractId: this.contractId,
      status: this.status,
      progress: this.progress,
      budget: this.budget,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
    if (this._id) doc._id = this._id;
    return doc;
  }
}