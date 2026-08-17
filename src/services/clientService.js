export default class ClientService {

  constructor(clientRepository, ClientModel) {
    this.clientRepo = clientRepository;
    this.ClientModel = ClientModel;
  }

  //Autentica a un cliente validando sus credenciales de acceso.
  async authenticateClient(email, password) {
    console.log("Buscando el cliente para iniciar sesión...");
    
    // Búsqueda directa por credenciales en el repositorio
    const clienteEncontrado = await this.clientRepo.findByCredentials(email, password);

    if (!clienteEncontrado) {
      console.log("Credenciales inválidas o el cliente no existe.");
      return false;
    }

    console.log("Sesión iniciada con éxito.");
    return clienteEncontrado;
  }

  //Registra un nuevo cliente verificando previamente que el correo no esté duplicado.
  async registerClient(clientData) {
    console.log("Validando disponibilidad del correo electrónico...");
    
    // Verificación de duplicados antes de instanciar el modelo
    const listaClientes = await this.clientRepo.findAll();
    const existeCorreo = listaClientes.some(c => c.email === clientData.email);

    if (existeCorreo) {
      console.log("Error: El correo electrónico ya se encuentra registrado.");
      return false;
    }

    // Instanciación del modelo de dominio si se proporciona la clase
    const nuevoCliente = this.ClientModel 
      ? new this.ClientModel(clientData.name, clientData.email, clientData.password, clientData.phone)
      : clientData;

    const resultado = await this.clientRepo.create(nuevoCliente);
    return resultado;
  }
}