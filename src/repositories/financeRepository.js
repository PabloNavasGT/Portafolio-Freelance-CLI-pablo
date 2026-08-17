import { ObjectId } from 'mongodb';
import Database from '../config/db.js';

export default class FinanceRepository {
  //Crea un nuevo registro de movimiento financiero (ingreso o egreso).
  async addMovement(data) {
    try {
      const db = Database.getDb();
      const movimiento = {
        projectId: new ObjectId(data.projectId),
        clientId: data.clientId ? new ObjectId(data.clientId) : null,
        type: data.type || data.tipo,
        amount: parseFloat(data.amount || data.monto),
        referenceCode: data.referenceCode || data.codigoReferencia,
        description: data.description || data.concepto || '',
        createdAt: new Date()
      };

      console.log("Guardando movimiento financiero...");
      return await db.collection('finances').insertOne(movimiento);
    } catch (error) {
      console.log("Error al registrar movimiento:", error.message);
      throw error;
    }
  }

  //Ejecuta un pipeline de agregación para calcular el balance neto (Ingresos - Egresos) de un cliente.
  async getBalanceByClient(clientId) {
    try {
      const db = Database.getDb();
      const id = new ObjectId(clientId);

      // Pipeline de agregación: filtra por cliente, suma por tipo de movimiento y resta egresos a ingresos
      const pipeline = [
        { $match: { clientId: id } },
        {
          $group: {
            _id: "$clientId",
            totalIngresos: {
              $sum: {
                $cond: [{ $eq: ["$type", "ingreso"] }, "$amount", 0]
              }
            },
            totalEgresos: {
              $sum: {
                $cond: [{ $eq: ["$type", "egreso"] }, "$amount", 0]
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            saldoTotal: { $subtract: ["$totalIngresos", "$totalEgresos"] }
          }
        }
      ];

      const resultado = await db.collection('finances').aggregate(pipeline).toArray();
      return resultado.length > 0 ? resultado[0].saldoTotal : 0;
    } catch (error) {
      console.log("Error al calcular saldo:", error.message);
      return 0;
    }
  }

  //Registra un pago asegurando atomicidad mediante una transacción transaccional ACID en MongoDB.
  async processPaymentWithTransaction(paymentData) {
    const session = Database.startSession();
    const db = Database.getDb();
    const col = db.collection('finances');
    let exito = false;

    try {
      // Control de transacción atómica
      await session.withTransaction(async () => {
        // 1. Validar que la referencia de pago no exista previamente
        const pagoExistente = await col.findOne(
          { referenceCode: paymentData.referenceCode },
          { session }
        );

        if (pagoExistente) {
          throw new Error("El código de referencia ya está registrado");
        }

        // 2. Insertar el nuevo pago dentro del contexto transaccional
        const nuevoPago = {
          projectId: new ObjectId(paymentData.projectId),
          clientId: paymentData.clientId ? new ObjectId(paymentData.clientId) : null,
          type: 'ingreso',
          amount: parseFloat(paymentData.amount),
          referenceCode: paymentData.referenceCode,
          description: paymentData.description || 'Pago de proyecto',
          createdAt: new Date()
        };

        await col.insertOne(nuevoPago, { session });
        exito = true;
      });
    } catch (error) {
      console.log("Error en la transacción de pago:", error.message);
      exito = false;
    } finally {
      await session.endSession();
    }

    return exito;
  }
}