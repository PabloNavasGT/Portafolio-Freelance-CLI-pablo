class projectService {

  constructor(projectRepository, contractRepository) {
    this.projectRepo = projectRepository
    this.contractRepo = contractRepository
  }
  async updateProgress(projectId, newPercentage, note) {
    console.log("viendo cuanto avance tenia antes")
    let proyectoViejo = await this.projectRepo.findById(projectId)

    if (newPercentage < proyectoViejo.porcentajeAvance) {
      console.log("el porcentaje nuevo no puede ser menor al que ya tenia :(")
      return false
    }

    let exito = await this.projectRepo.updateProgress(projectId, newPercentage, note)
    return exito
  }
  async attachContract(projectId, contractData) {
    console.log("creando el contrato nuevo...")
    let contratoCreado = await this.contractRepo.create(contractData)

    if (contratoCreado) {
      console.log("Contrato creado, vinculando al proyecto")
      let exito = await this.projectRepo.updateContractReference(projectId, contratoCreado._id)
      return exito
    }
    
    return false
  }
}

module.exports = projectService