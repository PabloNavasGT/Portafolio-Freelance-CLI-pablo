class projectModel {
    
  constructor(clientId, proposalId, name, status = 'activo', progress = 0) {
    this.clientId = clientId
    this.proposalId = proposalId
    this.name = name
    this.status = status
    this.progress = progress
    this.logs = []
    this.createdAt = new Date()
  }

  // Control de estados
  validarEstado(nuevoEstado) {
    var estadosPermitidos = ['activo', 'pausado', 'finalizado', 'cancelado']

    if (estadosPermitidos.includes(nuevoEstado)) {
      return true
    } else {
      console.log("El estado no es valido")
      return false
    }
  }

  cambiarEstado(nuevoEstado) {
    if (this.validarEstado(nuevoEstado)) {
      this.status = nuevoEstado
      return true
    }
    return false
  }

  // Validacion de progreso
  validarPorcentaje(porcentaje) {
    if (typeof porcentaje !== 'number') {
      console.log("El porcentaje debe ser un valor numerico")
      return false
    }

    if (porcentaje >= 0 && porcentaje <= 100) {
      return true
    } else {
      console.log("El porcentaje de avance debe estar estrictamente entre 0 y 100")
      return false
    }}
  // Formateo de Logs
  formatearLog(note, percentage) {
    if (!this.validarPorcentaje(percentage)) {
      return null
    }

    let nuevoLog = {
      note: note,
      percentage: percentage,
      date: new Date()
    }

    return nuevoLog
  }
  // Reistrar avance en bitacora
  registrarAvance(note, percentage) {
    let logEstructurado = this.formatearLog(note, percentage)

    if (logEstructurado != null) {
      this.progress = percentage
      this.logs.push(logEstructurado)
      console.log("Avance registrado con exito, felicidadeeees!")
      return true
    }

    return false
  }}

module.exports = projectModel