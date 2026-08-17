import { ObjectId } from 'mongodb';

export default class Project {

  //Crea una instancia de Proyecto.
  constructor({ clientId, name, budget, description = '', contractId = null, status = 'activo', progress = 0, logs = [], _id = null }) {
    this._id = _id ? new ObjectId(_id) : null;
    // Conversión de referencias a ObjectId para mantener integridad referencial en MongoDB
    this.clientId = clientId ? new ObjectId(clientId) : null;
    this.contractId = contractId ? new ObjectId(contractId) : null;
    this.name = name;
    this.description = description;
    this.budget = Number(budget) || 0;
    this.status = status;
    this.progress = Number(progress) || 0;
    // Historial de Bitácora/Avances del proyecto
    this.logs = logs || [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  //Valida si un estado propuesto está dentro del flujo permitido.
  validarEstado(nuevoEstado) {
    const estadosPermitidos = ['activo', 'pausado', 'finalizado', 'cancelado'];
    if (estadosPermitidos.includes(nuevoEstado)) {
      return true;
    }
    console.log("El estado no es válido");
    return false;
  }

  //Cambia el estado del proyecto actualizando la fecha de modificación.
  cambiarEstado(nuevoEstado) {
    if (this.validarEstado(nuevoEstado)) {
      this.status = nuevoEstado;
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  //Evalúa que el porcentaje ingresado esté en el rango numérico [0 - 100].
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

  //Registra una nueva entrada de avance en la bitácora (`logs`) y actualiza el porcentaje.
  registrarAvance(note, percentage) {
    if (this.validarPorcentaje(percentage)) {
      this.progress = percentage;
      // Adición de la entrada al historial de logs
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

  //Exporta el documento para persistencia en MongoDB.
  toDocument() {
    const doc = {
      name: this.name,
      description: this.description,
      clientId: this.clientId,
      contractId: this.contractId,
      status: this.status,
      progress: this.progress,
      budget: this.budget,
      logs: this.logs, // Conserva las anotaciones registradas en la bitácora
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
    if (this._id) doc._id = this._id;
    return doc;
  }
}