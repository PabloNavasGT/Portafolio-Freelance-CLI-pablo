import { ObjectId } from 'mongodb';

export default class Client {
  //Crea una instancia de Client.
  constructor({ name, email, password = null, phone = null, _id = null }) {
    // Si se proporciona un _id, se convierte a ObjectId de MongoDB
    this._id = _id ? new ObjectId(_id) : null;
    this.name = name;
    this.email = email;
    this.password = password;
    this.phone = phone;
    // Fecha automática de creación del registro
    this.createdAt = new Date();
  }

  //Elimina espacios innecesarios y normaliza el correo a minúsculas.

  limpiarDatos() {
    if (this.name) this.name = this.name.trim();
    if (this.email) this.email = this.email.toLowerCase().trim();
  }


  //Valida que la contraseña cumpla con la longitud mínima requerida.
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

  //Realiza una validación integral de todos los campos obligatorios del cliente.
  validarDatosCompletos() {
    let esValido = true;

    // Validación del campo nombre
    if (!this.name || this.name.trim() === "") {
      console.log("El nombre es obligatorio");
      esValido = false;
    }

    // Validación de estructura básica del correo
    if (!this.email || !this.email.includes("@")) {
      console.log("El correo electrónico no es válido, seleccione entre nuestros proveedores autorizados (ej. @gmail");
      esValido = false;
    }

    // Validación condicional de la contraseña si está presente
    if (this.password && !this.validarContrasena()) {
      esValido = false;
    }

    return esValido;
  }

  //Transforma la instancia de la clase a un documento plano listo para insertar en MongoDB
  toDocument() {
    // Limpieza previa de cadenas de texto
    this.limpiarDatos();
    
    const doc = {
      name: this.name,
      email: this.email,
      password: this.password,
      phone: this.phone,
      createdAt: this.createdAt
    };

    // Asigna el _id únicamente si ya existe para evitar sobrescribir con nulos
    if (this._id) doc._id = this._id;
    return doc;
  }
}