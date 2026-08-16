class financeService {

  constructor(financeRepository, projectRepository) {
    this.financeRepo = financeRepository
    this.projectRepo = projectRepository
  }
  async processSecurePayment(paymentData) {
    console.log("Iniciando transaccion")
    
    let pagoExitoso = await this.financeRepo.processPaymentWithTransaction(paymentData)

    if (pagoExitoso) {
      console.log("Pago registrado y actualizando")
      await this.projectRepo.updateTotalPaid(paymentData.projectId, paymentData.monto)
      return true
    } else {
      console.log("El pago fallo (pudo estar duplicado)")
      return false
    }
  }
  async getClientFinancialBalance(clientId) {
    console.log("Calculando el balance general del cliente")
    let totalBalance = await this.financeRepo.getBalanceByClient(clientId)
    return totalBalance
  }
}

module.exports = financeService