class clientService {

  constructor(clientRepository, clientModel) {
    this.clientRepo = clientRepository
    this.modelo = clientModel
  }

  // Autenticar cliente
  async authenticateClient(email, password) {
    console.log("Buscando el cliente para iniciar sesion...")
    let clienteEncontrado = await this.clientRepo.findByEmail(email)

    if (clienteEncontrado == null) {
      console.log("El cliente no existe en la base de datos")
      return false
    }

    if (clienteEncontrado.password == password) {
      console.log("Sesion iniciada con exito")
      return clienteEncontrado
    } else {
      console.log("Contraseña incorrecta")
      return false
    }
  }
  async registerClient(clientData) {
    console.log("Validando si el correo ya existe...")
    let existeCorreo = await this.clientRepo.findByEmail(clientData.email)

    if (existeCorreo) {
      console.log("correo duplicado por lo tanto denegado")
      return false
    }

    var nuevoCliente = new this.modelo(
      clientData.name, 
      clientData.email, 
      clientData.password, 
      clientData.phone
    )

    let reultado = await this.clientRepo.create(nuevoCliente)
    return reultado
  }
}

module.exports = clientService