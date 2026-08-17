/**
 * @file proposalService.js
 * @description Capa de servicio encargada de las propuestas comerciales y su conversión en proyectos activos.
 */

export default class ProposalService {
  /**
   * @param {Object} proposalRepository - Repositorio de propuestas.
   * @param {Object} projectRepository - Repositorio de proyectos.
   * @param {Object} clientRepository - Repositorio de clientes.
   */
  constructor(proposalRepository, projectRepository, clientRepository) {
    this.proposalRepo = proposalRepository;
    this.projectRepo = projectRepository;
    this.clientRepo = clientRepository;
  }

  //Crea una propuesta comercial verificando que el cliente asignado exista.
  async createProposal(data) {
    console.log("Verificando existencia del cliente...");
    const clientes = await this.clientRepo.findAll();
    const clienteExiste = clientes.some(c => c._id.toString() === data.clientId.toString());

    if (!clienteExiste) {
      console.log("Error: El cliente especificado no existe en la base de datos.");
      return false;
    }

    return await this.proposalRepo.create(data);
  }

  //Acepta una propuesta comercial.
  async acceptProposal(proposalId) {
    console.log("Aceptando propuesta y convirtiéndola en proyecto activo vía transacción ACID...");
    const exito = await this.proposalRepo.acceptProposal(proposalId);

    if (exito) {
      console.log("Propuesta aceptada y proyecto creado automáticamente con éxito.");
      return true;
    } else {
      console.log("Fallo al aceptar la propuesta.");
      return false;
    }
  }
}