import Database from '../config/db.js';
import { generateNextId } from '../utils/idGenerator.js';

export default class FinanceRepository {
  async addMovement(data) {
    try {
      const db = Database.getDb();
      const col = db.collection('finances');

      const referenceCode = data.referenceCode || data.codigoReferencia || await generateNextId(col, 'SPF');

      // Validacion de unicidad de codigo de referencia
      const existe = await col.findOne({ referenceCode });
      if (existe) {
        throw new Error(`El codigo de referencia '${referenceCode}' ya existe.`);
      }

      const movimiento = {
        _id: referenceCode,
        projectId: data.projectId,
        clientId: data.clientId || null,
        type: data.type || data.tipo,
        amount: parseFloat(data.amount || data.monto),
        referenceCode: referenceCode,
        description: data.description || data.concepto || '',
        createdAt: new Date()
      };

      console.log("Guardando movimiento financiero...");
      return await col.insertOne(movimiento);
    } catch (error) {
      console.log("Error al registrar movimiento:", error.message);
      throw error;
    }
  }

  async getBalanceByClient(clientId) {
    try {
      const db = Database.getDb();

      const pipeline = [
        { $match: { clientId: clientId } },
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
            _id: 1,
            balanceNeto: { $subtract: ["$totalIngresos", "$totalEgresos"] }
          }
        }
      ];

      const result = await db.collection('finances').aggregate(pipeline).toArray();
      return result.length > 0 ? result[0].balanceNeto : 0;
    } catch (error) {
      console.log("Error al calcular balance del cliente:", error.message);
      return 0;
    }
  }

  async processPaymentWithTransaction(paymentData) {
    const session = Database.startSession();
    const db = Database.getDb();
    const col = db.collection('finances');
    let exito = false;

    try {
      await session.withTransaction(async () => {
        const referenceCode = paymentData.referenceCode || await generateNextId(col, 'SPF');

        const pagoExistente = await col.findOne(
          { referenceCode },
          { session }
        );

        if (pagoExistente) {
          throw new Error(`El codigo de referencia '${referenceCode}' ya esta registrado.`);
        }

        const nuevoPago = {
          _id: referenceCode,
          projectId: paymentData.projectId,
          clientId: paymentData.clientId || null,
          type: 'ingreso',
          amount: parseFloat(paymentData.amount),
          referenceCode: referenceCode,
          description: paymentData.description || 'Pago de proyecto',
          createdAt: new Date()
        };

        await col.insertOne(nuevoPago, { session });
        exito = true;
      });
    } catch (error) {
      console.log("Error en la transaccion de pago:", error.message);
      exito = false;
    } finally {
      await session.endSession();
    }

    return exito;
  }
}