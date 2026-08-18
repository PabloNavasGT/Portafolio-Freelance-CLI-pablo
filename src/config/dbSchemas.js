export const schemasMap = {
    // Validación para la colección de Clientes
    clients: {
        $jsonSchema: {
            bsonType: "object",
            required: ["name", "email"],
            properties: {
                name: { bsonType: "string" },
                email: { bsonType: "string" },
                password: { bsonType: ["string", "null"] },
                phone: { bsonType: ["string", "null"] },
                createdAt: { bsonType: ["date", "string", "null"] },
                updatedAt: { bsonType: ["date", "string", "null"] }
            }
        }
    },
    // Validación para la colección de Propuestas
    proposals: {
        $jsonSchema: {
            bsonType: "object",
            required: ["title", "price"],
            properties: {
                title: { bsonType: "string" },
                price: { bsonType: "number" },
                status: { bsonType: "string" },
                description: { bsonType: ["string", "null"] },
                deadline: { bsonType: ["date", "string", "null"] },
                clientId: { bsonType: ["objectId", "string", "null"] }, // Permite String u ObjectId
                createdAt: { bsonType: ["date", "string", "null"] },
                updatedAt: { bsonType: ["date", "string", "null"] }
            }
        }
    },
    // Validación para la colección de Proyectos
    projects: {
        $jsonSchema: {
            bsonType: "object",
            required: ["name"],
            properties: {
                name: { bsonType: "string" },
                budget: { bsonType: "number" },
                status: { bsonType: "string" },
                progress: { bsonType: "number" },
                clientId: { bsonType: ["objectId", "string", "null"] },
                contractId: { bsonType: ["objectId", "string", "null"] },
                proposalId: { bsonType: ["objectId", "string", "null"] },
                description: { bsonType: ["string", "null"] },
                logs: { bsonType: "array" },
                createdAt: { bsonType: ["date", "string", "null"] },
                updatedAt: { bsonType: ["date", "string", "null"] }
            }
        }
    },
    // Validación para la colección de Contratos
    contracts: {
        $jsonSchema: {
            bsonType: "object",
            required: ["code", "title"],
            properties: {
                code: { bsonType: "string" },
                title: { bsonType: "string" },
                totalValue: { bsonType: "number" },
                status: { bsonType: "string" },
                projectId: { bsonType: ["objectId", "string", "null"] },
                createdAt: { bsonType: ["date", "string", "null"] },
                updatedAt: { bsonType: ["date", "string", "null"] }
            }
        }
    },
    // Validación para la colección de Entregables
    deliverables: {
        $jsonSchema: {
            bsonType: "object",
            required: ["title", "projectId"],
            properties: {
                title: { bsonType: "string" },
                projectId: { bsonType: ["objectId", "string"] },
                status: { bsonType: "string" },
                deadline: { bsonType: ["date", "string", "null"] },
                dueDate: { bsonType: ["date", "string", "null"] },
                createdAt: { bsonType: ["date", "string", "null"] },
                updatedAt: { bsonType: ["date", "string", "null"] }
            }
        }
    },
    // Validación para la colección de Finanzas/Transacciones
    finances: {
        $jsonSchema: {
            bsonType: "object",
            required: ["projectId", "type", "amount"],
            properties: {
                projectId: { bsonType: ["objectId", "string"] },
                clientId: { bsonType: ["objectId", "string", "null"] },
                type: { bsonType: "string" },
                amount: { bsonType: "number" },
                reference: { bsonType: ["string", "null"] },
                referenceCode: { bsonType: ["string", "null"] },
                concept: { bsonType: ["string", "null"] },
                description: { bsonType: ["string", "null"] },
                date: { bsonType: ["date", "string", "null"] },
                createdAt: { bsonType: ["date", "string", "null"] },
                updatedAt: { bsonType: ["date", "string", "null"] }
            }
        }
    }
};