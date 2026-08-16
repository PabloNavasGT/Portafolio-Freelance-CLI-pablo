const mongodb = require('mongodb')
const ObjectId = mongodb.ObjectId

class financeRepository {
    construtor(Db, client){ 
    this. db = db 
    this.client = client}
};

//Registra un documento de tipo ingreso o egreso

   async = addMovement(data) {
    var col = this.db.collection('finances')

    let movimiento = {
      clientId: new ObjectId(data.clientId),
      projectId: data.projectId ? new ObjectId(data.projectId) : null,
      tipo: data.tipo,
      monto: parseFloat(data.monto),
      concepto: data.concepto,
      fecha: new Date()
    }

    console.log("Guardando movimiento financiero...")
    let reultado = await col.insertOne(movimiento)
    return reultado
  }

  // Calcular saldo del cliente
async = getBalanceByClient(clientId) {
    var col = this.db.collection('finances')
    let id = new ObjectId(clientId)

    let pipeline = [
      { $match: { clientId: id } },
      {
        $group: {
          _id: "$clientId",
          totalIngresos: {
            $sum: {
              $cond: [{ $eq: ["$tipo", "ingreso"] }, "$monto", 0]
            }
          },
          totalEgresos: {
            $sum: {
              $cond: [{ $eq: ["$tipo", "egreso"] }, "$monto", 0]
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
    ]

    let reultado = await col.aggregate(pipeline).toArray()

    if (reultado.length > 0) {
      return reultado[0].saldoTotal
    } else {
      return 0
    }
  }
// Procesar pago seguro con transaccion
  async = processPaymentWithTransaction(paymentData) {
    let sesion = this.client.startSession()
    var col = this.db.collection('finances')

    let exito = false

    try {
      await sesion.withTransaction(async () => {
        let pagoExistente = await col.findOne(
          { codigoReferencia: paymentData.codigoReferencia },
          { session: sesion }
        )

        if (pagoExistente) {
          console.log("El codigo de referencia ya esta registrado")
          throw new Error("Codigo de pago duplicado")
        }

        let nuevoPago = {
          clientId: new ObjectId(paymentData.clientId),
          projectId: paymentData.projectId ? new ObjectId(paymentData.projectId) : null,
          tipo: 'ingreso',
          monto: parseFloat(paymentData.monto),
          codigoReferencia: paymentData.codigoReferencia,
          concepto: paymentData.concepto || 'Pago de proyecto',
          fecha: new Date()
        }

        await col.insertOne(nuevoPago, { session: sesion })
        exito = true
      })
    } catch (error) {
      console.log("Error en la transaccion de pago:", error.message)
      exito = false
    } finally {
      await sesion.endSession()
    }

    return exito
  }


module.exports = financeRepository