import { ObjectId } from 'mongodb';

export default class Transaction {
  constructor({ projectId, type, amount, referenceCode, clientId = null, description = '', _id = null }) {
    this._id = _id ? new ObjectId(_id) : null;
    this.projectId = projectId ? new ObjectId(projectId) : null;
    this.clientId = clientId ? new ObjectId(clientId) : null;
    this.type = type; // 'ingreso' | 'egreso'
    this.amount = Number(amount) || 0;
    this.referenceCode = referenceCode;
    this.description = description;
    this.createdAt = new Date();
  }

  validarTipo() {
    if (this.type === 'ingreso' || this.type === 'egreso') {
      return true;
    }
    console.log("El tipo solo puede ser 'ingreso' o 'egreso'");
    return false;
  }

  verificarReferencia() {
    if (!this.referenceCode || this.referenceCode.trim() === "") {
      console.log("El código de referencia es obligatorio");
      return false;
    }
    return true;
  }

  calcularConImpuesto(porcentajeImpuesto) {
    const impuesto = this.amount * (porcentajeImpuesto / 100);
    return this.amount + impuesto;
  }

  toDocument() {
    const doc = {
      projectId: this.projectId,
      clientId: this.clientId,
      type: this.type,
      amount: this.amount,
      referenceCode: this.referenceCode,
      description: this.description,
      createdAt: this.createdAt
    };
    if (this._id) doc._id = this._id;
    return doc;
  }
}