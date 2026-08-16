class proposalModel {

constructor(clientId, title, description, price, deadline, status = 'pendiente') {
    this.clientId = clientId
    this.title = title
    this.description = description
    this.price = price
    this.deadline = deadline
    this.status = status
  }

  validarReglasBase() {
    if (this.price < 0) {
      console.log("nada de numero negativos porfavor")
      return false
    }

    let estadosBuenos = ['pendiente', 'aceptada', 'rechazada']
    if (!estadosBuenos.includes(this.status)) {
      console.log(" propuesta no existente")
      return false
    }

    return true
  }

  convertirAProyecto() {
    if (this.status == 'aceptada') {
      let datosParaProyecto = {
        clientId: this.clientId,
        proposalId: this._id,
        nombre: 'Proyecto generado de: ' + this.title,
        descripcionOriginal: this.description,
        estado: 'activo',
        porcentajeAvance: 0,
        presupuesto: this.price,
        fechaInicio: new Date()
      }
      return datosParaProyecto
    } else {
      console.log("La propuesta tendra que se afirmada por proyectos")
      return null
    }
  }}

module.exports = proposalModel