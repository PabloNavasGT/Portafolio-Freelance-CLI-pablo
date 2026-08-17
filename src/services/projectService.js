export default class ProjectService {

  constructor(projectRepository, contractRepository = null) {
    this.projectRepo = projectRepository;
    this.contractRepo = contractRepository;
  }

  //Actualiza el porcentaje de avance validando que el valor no sea regresivo.
  async updateProgress(projectId, newPercentage, note) {
    console.log("Verificando el porcentaje de avance previo...");
    const proyectoViejo = await this.projectRepo.findById(projectId);

    if (!proyectoViejo) {
      console.log("Proyecto no encontrado.");
      return false;
    }

    // Alineado con la propiedad 'progress' definida en el esquema de la base de datos
    const progresoActual = proyectoViejo.progress ?? proyectoViejo.porcentajeAvance ?? 0;

    if (newPercentage < progresoActual) {
      console.log(`El nuevo porcentaje (${newPercentage}%) no puede ser menor al avance actual (${progresoActual}%).`);
      return false;
    }

    return await this.projectRepo.updateProgress(projectId, newPercentage, note);
  }

  //Adjunta un contrato firmado a un proyecto existente.
  async attachContract(projectId, contractData) {
    if (!this.contractRepo) {
      console.log("Repositorio de contratos no configurado.");
      return false;
    }

    console.log("Creando el nuevo documento de contrato...");
    const contratoCreado = await this.contractRepo.create(contractData);

    if (contratoCreado && contratoCreado._id) {
      console.log("Contrato creado. Vinculando ID de contrato al proyecto...");
      return await this.projectRepo.updateContractReference(projectId, contratoCreado._id);
    }
    
    return false;
  }
}