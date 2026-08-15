class clientModel {

  // Constructor
  constructor(name, email, password, phone) {
    this.name = name
    this.email = email
    this.password = password
    this.phone = phone
    this.createdAt = new Date()
  }

  // Sanitizacion de datos
  limpiarDatos() {
    if (this.name) {
      this.name = this.name.trim()
    }

    if (this.email) {
      this.email = this.email.toLowerCase().trim()
    }
  }

  // Validaciones de negocio
  validarContrasena() {
    if (!this.password) {
      console.log("La contraseña es requerida")
      return false
    }

    if (this.password.length < 6) {
      console.log("La contraseña debe tener minimo 6 caracteres")
      return false
    }

    return true
  }

  // Validar campos requeridos
  validarDatosCompletos() {
    var esValido = true

    if (!this.name || this.name == "") {
      console.log("El nombre es obligatorio")
      esValido = false
    }

    if (!this.email || !this.email.includes("@")) {
      console.log("El correo electronico no es valido")
      esValido = false
    }

    if (!this.validarContrasena()) {
      esValido = false
    }

    return esValido
  }
}

module.exports = clientModel