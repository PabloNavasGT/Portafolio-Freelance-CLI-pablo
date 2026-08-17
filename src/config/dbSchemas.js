// 1. COLECCIÓN: clients
export const clientsSchema = {
    $jsonSchema: {
        bsonType: "object",
        required: ["name", "email"],
        properties: {
            _id: { bsonType: "objectId" },
            name: { bsonType: "string", minLength: 1 },
            email: {
                bsonType: "string",
                pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
            }
        }
    }
};

// 2. COLECCIÓN: proposals
export const proposalsSchema = {
    $jsonSchema: {
        bsonType: "object",
        required: ["title", "price", "status"],
        properties: {
            _id: { bsonType: "objectId" },
            title: { bsonType: "string", minLength: 1 },
            price: { bsonType: ["double", "int", "decimal"], minimum: 0 },
            status: { enum: ["pendiente", "aceptada", "rechazada"] },
            clientId: { bsonType: ["objectId", "null"] },
            createdAt: { bsonType: "date" }
        }
    }
};

// 3. COLECCIÓN: contracts
export const contractsSchema = {
    $jsonSchema: {
        bsonType: "object",
        required: ["code", "title", "totalValue", "startDate", "endDate", "status", "createdAt"],
        properties: {
            _id: { bsonType: "objectId" },
            code: { bsonType: "string", pattern: "^C-\\d{3,}$" },
            title: { bsonType: "string", minLength: 1 },
            conditions: { bsonType: "string" },
            totalValue: { bsonType: ["double", "int", "decimal"], minimum: 0 },
            startDate: { bsonType: "date" },
            endDate: { bsonType: "date" },
            projectId: { bsonType: ["objectId", "null"] },
            status: { enum: ["activo", "pendiente", "finalizado", "cancelado"] },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
        }
    }
};

// 4. COLECCIÓN: projects
export const projectsSchema = {
    $jsonSchema: {
        bsonType: "object",
        required: ["name", "clientId", "status", "progress", "budget", "createdAt"],
        properties: {
            _id: { bsonType: "objectId" },
            name: { bsonType: "string", minLength: 1 },
            description: { bsonType: "string" },
            clientId: { bsonType: "objectId" },
            contractId: { bsonType: ["objectId", "null"] },
            status: { enum: ["activo", "pausado", "finalizado", "cancelado"] },
            progress: { bsonType: ["double", "int"], minimum: 0, maximum: 100 },
            budget: { bsonType: ["double", "int", "decimal"], minimum: 0 },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
        }
    }
};

// 5. COLECCIÓN: deliverables
export const deliverablesSchema = {
    $jsonSchema: {
        bsonType: "object",
        required: ["title", "projectId", "dueDate", "status", "createdAt"],
        properties: {
            _id: { bsonType: "objectId" },
            title: { bsonType: "string", minLength: 1 },
            projectId: { bsonType: "objectId" },
            dueDate: { bsonType: "date" },
            status: { enum: ["pendiente", "entregado", "aprobado", "rechazado"] },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
        }
    }
};

// 6. COLECCIÓN: finances
export const financesSchema = {
    $jsonSchema: {
        bsonType: "object",
        required: ["projectId", "type", "amount", "referenceCode", "createdAt"],
        properties: {
            _id: { bsonType: "objectId" },
            projectId: { bsonType: "objectId" },
            clientId: { bsonType: ["objectId", "null"] },
            type: { enum: ["ingreso", "egreso"] },
            amount: { bsonType: ["double", "int", "decimal"], exclusiveMinimum: 0 },
            referenceCode: { bsonType: "string", minLength: 1 },
            description: { bsonType: "string" },
            createdAt: { bsonType: "date" }
        }
    }
};

// Mapa que relaciona el nombre de cada colección con su esquema
export const schemasMap = {
    clients: clientsSchema,
    proposals: proposalsSchema,
    contracts: contractsSchema,
    projects: projectsSchema,
    deliverables: deliverablesSchema,
    finances: financesSchema
};