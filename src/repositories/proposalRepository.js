import { ObjectId } from 'mongodb';
import Database from '../config/db.js';

export class ProposalRepository {
    get db() {
        return Database.getDb();
    }

    get proposalsCollection() {
        return this.db.collection('proposals');
    }

    get projectsCollection() {
        return this.db.collection('projects');
    }

    /**
     * Crea una nueva propuesta garantizando los tipos de datos correctos
     * para la validación de esquema en MongoDB.
     */
    async createProposal({ clientId, title, description, price }) {
        try {
            // Si el ID es un ObjectId de 24 caracteres hex se convierte, si es un ID personalizado ("C-001") se mantiene como string
            const isBsonObjectId = typeof clientId === 'string' && ObjectId.isValid(clientId) && clientId.length === 24;
            const formattedClientId = isBsonObjectId ? new ObjectId(clientId) : String(clientId);

            const newProposal = {
                clientId: formattedClientId,
                title: String(title).trim(),
                description: String(description).trim(),
                price: Number(parseFloat(price)), // Número flotante
                status: 'pendiente',
                createdAt: new Date()
            };

            const result = await this.proposalsCollection.insertOne(newProposal);
            return { success: true, insertedId: result.insertedId };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Transacción Atómica con Rollback: Acepta una propuesta y crea automáticamente el proyecto.
     */
    async acceptProposal(proposalId) {
        const session = Database.startSession();

        try {
            let result = false;

            await session.withTransaction(async () => {
                const isBsonObjectId = typeof proposalId === 'string' && ObjectId.isValid(proposalId) && proposalId.length === 24;
                const targetId = isBsonObjectId ? new ObjectId(proposalId) : proposalId;

                const proposal = await this.proposalsCollection.findOne(
                    { _id: targetId },
                    { session }
                );

                if (!proposal) {
                    throw new Error('La propuesta especificada no existe.');
                }

                if (proposal.status === 'aceptada') {
                    throw new Error('La propuesta ya fue aceptada previamente.');
                }

                // proposalRepository.js
                const updateResult = await this.proposalsCollection.updateOne(
                    { _id: targetId },
                    { $set: { status: 'aceptada' } }, // Evitar updatedAt si el esquema de proposals no lo declara
                    { session }
                );

                if (updateResult.modifiedCount === 0) {
                    throw new Error('No se pudo actualizar el estado de la propuesta.');
                }

                const newProject = {
                    clientId: proposal.clientId,
                    proposalId: proposal._id,
                    name: proposal.title,
                    description: proposal.description,
                    budget: Number(parseFloat(proposal.price)),
                    progress: 0,
                    status: 'activo',
                    createdAt: new Date()
                };

                await this.projectsCollection.insertOne(newProject, { session });
                result = true;
            });

            return result;
        } catch (error) {
            console.error(`Error en transacción (Rollback ejecutado): ${error.message}`);
            return false;
        } finally {
            await session.endSession();
        }
    }
}

export default ProposalRepository;