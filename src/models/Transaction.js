class financeModel {
  constructor(tipo, monto, codigoReferencia) {
    this.tipo = tipo
    this.monto = monto
    this.codigoReferencia = codigoReferencia
  }

  validarTipo() {
    if (this.tipo == 'ingreso' || this.tipo == 'egreso') {
      return true
    } else {
      console.log("El tipo solo puede ser ingreso o egreso")
      return false
    }}
  verificarReferencia() {
    if (this.codigoReferencia == null || this.codigoReferencia == "") {
      console.log("numero de deposito o codigo obligatorio ")
      return false
    }
    return true
  }
  calcularConImpuesto(porcentajeImpuesto) {
    let impuesto = this.monto * (porcentajeImpuesto / 100)
    let totalConImpuesto = this.monto + impuesto
    return totalConImpuesto
  }

  esBalancePositivo(ingresosTotales, egresosTotales) {
    let resultado = ingresosTotales - egresosTotales
    
    if (resultado >= 0) {
      return true
    } else {
      return false
    }
  }
}

module.exports = financeModel