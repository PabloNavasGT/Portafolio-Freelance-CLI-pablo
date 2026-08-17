import { ObjectId } from 'mongodb';

export default class Contract {
    //Construye un nuevo contrato.
    constructor({ code, title, conditions = '', totalValue, startDate = null, endDate, projectId = null, status = 'activo', _id = null }) {
        this._id = _id ? new ObjectId(_id) : null;
        this.code = code;
        this.title = title;
        this.conditions = conditions;
        this.totalValue = Number(totalValue) || 0;
        this.startDate = startDate ? new Date(startDate) : new Date();
        this.endDate = new Date(endDate);
        this.projectId = projectId ? new ObjectId(projectId) : null;
        this.status = status;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    //Prepara el contrato para inserción o actualización en MongoDB.
    toDocument() {
        const doc = {
            code: this.code,
            title: this.title,
            conditions: this.conditions,
            totalValue: this.totalValue,
            startDate: this.startDate,
            endDate: this.endDate,
            projectId: this.projectId,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
        if (this._id) doc._id = this._id;
        return doc;
    }
}