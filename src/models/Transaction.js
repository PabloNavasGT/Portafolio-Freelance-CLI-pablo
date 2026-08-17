import { ObjectId } from 'mongodb';
export default class Transaction {

  //Inicializa un movimiento financiero.
  constructor({ projectId, type, amount, referenceCode = null, reference = null, clientId = null, description = '', concept = '', date = null, _id = null }) {
    this._id = _id ? new ObjectId(_id) : null;
    this.projectId = projectId ? new ObjectId(projectId) : null;
    this.clientId = clientId ? new ObjectId(clientId) : null;
    this.type = type;
    this.amount = Number(amount) || 0;
    
    // Homologación de campos alternativos utilizados según el menú correspondiente
    this.referenceCode = referenceCode || reference;
    this.reference = reference || referenceCode;
    this.description = description || concept;
    this.concept = concept || description;
    
    this.createdAt = date ? new Date(date) : new Date();
  }

  //Verifica que el tipo de movimiento sea contablemente válido.
  validarTipo() {
    if (this.type === 'ingreso' || this.type === 'egreso') {
      return true;
    }
    console.log("El tipo solo puede ser 'ingreso' o 'egreso'");
    return false;
  }

  //Comprueba que exista un código de comprobante bancario o referencia.
  verificarReferencia() {
    const ref = this.referenceCode || this.reference;
    if (!ref || ref.trim() === "") {
      console.log("El código de referencia es obligatorio");
      return false;
    }
    return true;
  }

  //Calcula el total incluyendo la tasa impositiva indicada.
  calcularConImpuesto(porcentajeImpuesto) {
    const impuesto = this.amount * (porcentajeImpuesto / 100);
    return this.amount + impuesto;
  }

  //Genera el documento serializable conteniendo ambas propiedades de referencia para no violar esquemas.
  toDocument() {
    const doc = {
      projectId: this.projectId,
      clientId: this.clientId,
      type: this.type,
      amount: this.amount,
      referenceCode: this.referenceCode,
      reference: this.reference,
      description: this.description,
      concept: this.concept,
      createdAt: this.createdAt
    };
    if (this._id) doc._id = this._id;
    return doc;
  }
}