import { ObjectId } from 'mongodb';

export default class Deliverable {

    //Crea un hito de entrega.

    constructor({ title, projectId, dueDate = null, deadline = null, status = 'pendiente', _id = null }) {
        this._id = _id ? new ObjectId(_id) : null;
        this.title = title;
        this.projectId = new ObjectId(projectId);
        // Sincronización entre nombres de propiedades según el menú utilizado
        this.dueDate = dueDate ? new Date(dueDate) : (deadline ? new Date(deadline) : new Date());
        this.deadline = deadline ? new Date(deadline) : this.dueDate;
        this.status = status;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    //Mapea el objeto hacia el documento ejecutable por el driver de MongoDB.
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