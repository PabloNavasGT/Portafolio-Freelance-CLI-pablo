import { ObjectId } from 'mongodb';

export default class Client {
  constructor({ name, email, password = null, phone = null, _id = null }) {
    this._id = _id ? new ObjectId(_id) : null;
    this.name = name;
    this.email = email;
    this.password = password;
    this.phone = phone;
    this.createdAt = new Date();
  }

  // Sanitización de datos
  limpiarDatos() {
    if (this.name) this.name = this.name.trim();
    if (this.email) this.email = this.email.toLowerCase().trim();
  }

  // Validaciones de negocio
  validarContrasena() {
    if (!this.password) {
      console.log("La contraseña es requerida");
      return false;
    }
    if (this.password.length < 6) {
      console.log("La contraseña debe tener mínimo 6 caracteres");
      return false;
    }
    return true;
  }

  validarDatosCompletos() {
    let esValido = true;

    if (!this.name || this.name.trim() === "") {
      console.log("El nombre es obligatorio");
      esValido = false;
    }

    if (!this.email || !this.email.includes("@")) {
      console.log("El correo electrónico no es válido");
      esValido = false;
    }

    if (this.password && !this.validarContrasena()) {
      esValido = false;
    }

    return esValido;
  }

  // Exportación estructurada para MongoDB
  toDocument() {
    this.limpiarDatos();
    const doc = {
      name: this.name,
      email: this.email,
      createdAt: this.createdAt
    };
    if (this._id) doc._id = this._id;
    return doc;
  }
}