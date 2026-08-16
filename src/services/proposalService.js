class proposalService {

  constructor(proposalRepository, projectRepository, clientRepository) {
    this.proposalRepo = proposalRepository
    this.projectRepo = projectRepository
    this.clientRepo = clientRepository
  }

  async createProposal(data) {
    console.log("existencia del cliente")
    let clienteExiste = await this.clientRepo.findById(data.clientId)

    if (clienteExiste == null) {
      console.log("cliente no existente")
      return false
    }

    let propuestaNueva = await this.proposalRepo.create(data)
    return propuestaNueva
  }
  async acceptProposal(proposalId) {
    console.log("Aceptando propuesta y creando el proyecto")
    let propuestaAceptada = await this.proposalRepo.acceptProposal(proposalId)

    if (propuestaAceptada) {
      console.log("La propuesta se acepto, porfavor manda los datos al repositorio de proyectos")
      let propuestaCompleta = await this.proposalRepo.findById(proposalId)
      let proyectoCreado = await this.projectRepo.createFromProposal(propuestaCompleta)
      return proyectoCreado
    } else {
      console.log("Fallo la aceptacion de la propuesta")
      return false
    }
  }
}

module.exports = proposalService