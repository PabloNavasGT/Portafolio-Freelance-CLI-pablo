export default class FinanceService {
  constructor(financeRepository, projectRepository) {
    this.financeRepo = financeRepository;
    this.projectRepo = projectRepository;
  }

  //Procesa un pago transaccional ACID asegurando que no existan códigos de referencia duplicados.
  async processSecurePayment(paymentData) {
    console.log("Iniciando transacción financiera segura...");
    
    // Normalización del campo 'amount' en lugar de 'monto' para cumplir con el esquema BSON
    const datosNormalizados = {
      ...paymentData,
      amount: paymentData.amount || paymentData.monto
    };

    const pagoExitoso = await this.financeRepo.processPaymentWithTransaction(datosNormalizados);

    if (pagoExitoso) {
      console.log("Pago registrado exitosamente mediante transacción ACID.");
      return true;
    } else {
      console.log("El pago falló o la referencia ya fue procesada anteriormente.");
      return false;
    }
  }

  //Calcula el balance financiero acumulado de un cliente (Ingresos - Egresos).
  async getClientFinancialBalance(clientId) {
    console.log("Calculando el balance general del cliente...");
    return await this.financeRepo.getBalanceByClient(clientId);
  }
}