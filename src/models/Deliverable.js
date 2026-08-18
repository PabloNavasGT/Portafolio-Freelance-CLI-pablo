import { ObjectId } from 'mongodb';

export default class Deliverable {
    // Crea un hito de entrega.
    constructor({ title, projectId, dueDate = null, deadline = null, status = 'pendiente', _id = null }) {
        this._id = _id ? new ObjectId(_id) : null;
        this.title = title ? String(title).trim() : '';
        this.projectId = new ObjectId(projectId);

        // Lógica de fecha: Si viene en blanco o nulo, se le asigna la fecha actual (mismo día de creación)
        const fechaActual = new Date();
        
        const parseFecha = (fechaInput) => {
            if (!fechaInput || String(fechaInput).trim() === '') return null;
            const d = new Date(fechaInput);
            return isNaN(d.getTime()) ? null : d;
        };

        const fechaFinal = parseFecha(dueDate) || parseFecha(deadline) || fechaActual;

        this.dueDate = fechaFinal;
        this.deadline = fechaFinal;
        this.status = status;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    // Mapea el objeto hacia el documento ejecutable por el driver de MongoDB.
    toDocument() {
        const doc = {
            title: this.title,
            projectId: this.projectId,
            dueDate: this.dueDate,
            deadline: this.deadline,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
        if (this._id) doc._id = this._id;
        return doc;
    }
}