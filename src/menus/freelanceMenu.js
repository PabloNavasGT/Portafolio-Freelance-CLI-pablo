// Selección interactiva y captura de datos en la consola mediante @clack/prompts[cite: 3]
import { select, text, password, confirm, note, isCancel } from '@clack/prompts';
// Formato de texto y validación de formatos[cite: 3]
import chalk from 'chalk';
import validator from 'validator';
import { ObjectId } from 'mongodb';

// Configuración centralizada de base de datos y utilidades visuales
import Database from '../config/db.js';
import { UI } from '../utils/ui.js';


//Submenú completo para las operaciones del Freelancer (Administración total de la plataforma).

export class FreelanceMenu {
    // Getters para acceder a las colecciones de MongoDB
    get db() { return Database.getDb(); }
    get clientsCollection() { return this.db.collection('clients'); }
    get proposalsCollection() { return this.db.collection('proposals'); }
    get projectsCollection() { return this.db.collection('projects'); }
    get contractsCollection() { return this.db.collection('contracts'); }
    get deliverablesCollection() { return this.db.collection('deliverables'); }
    get financesCollection() { return this.db.collection('finances'); }

    //Bucle del menú interactivo con los 6 módulos requeridos para el Freelancer.
    async show() {
        let inSubmenu = true;

        while (inSubmenu) {
            UI.displayHeader('Panel de Control - Modo Freelancer');

            // Selección del módulo a administrar mediante @clack/prompts[cite: 3]
            const option = await select({
                message: 'Selecciona el módulo a gestionar:',
                options: [
                    { value: 'clients', label: `${UI.icons.bullet} 1. Gestión de Clientes (CRUD y Asociación)` },
                    { value: 'proposals', label: `${UI.icons.bullet} 2. Gestión de Propuestas (Crear y Auto-generar Proyecto)` },
                    { value: 'projects', label: `${UI.icons.bullet} 3. Gestión de Proyectos (CRUD, Estados y Avances)` },
                    { value: 'contracts', label: `${UI.icons.bullet} 4. Contratos (Asociación, Valores y Fechas)` },
                    { value: 'deliverables', label: `${UI.icons.bullet} 5. Entregables (Estados y Rollback con Transacciones)` },
                    { value: 'finances', label: `${UI.icons.bullet} 6. Gestión Financiera (Ingresos/Egresos, Balances y Pagos)` },
                    { value: 'back', label: `${UI.icons.arrowLeft} 7. Volver al menú principal` }
                ]
            });

            if (isCancel(option) || option === 'back') {
                inSubmenu = false;
                break;
            }

            await this.handleOption(option);
        }
    }

    
    //Deriva la ejecución al módulo correspondiente.
    
    async handleOption(option) {
        switch (option) {
            case 'clients':
                await this.clientsModule();
                break;
            case 'proposals':
                await this.proposalsModule();
                break;
            case 'projects':
                await this.projectsModule();
                break;
            case 'contracts':
                await this.contractsModule();
                break;
            case 'deliverables':
                await this.deliverablesModule();
                break;
            case 'finances':
                await this.financesModule();
                break;
        }
    }

    // 1. GESTIÓN DE CLIENTES
    async clientsModule() {
        UI.displayHeader('1. Gestión de Clientes');

        const action = await select({
            message: 'Operación de Clientes:',
            options: [
                { value: 'create', label: 'Crear nuevo cliente' },
                { value: 'list', label: 'Listar todos los clientes' },
                { value: 'update', label: 'Actualizar cliente' },
                { value: 'delete', label: 'Eliminar cliente' },
                { value: 'associate', label: 'Asociar cliente a proyecto o propuesta' },
                { value: 'back', label: 'Volver' }
            ]
        });

        if (isCancel(action) || action === 'back') return;

        if (action === 'create') await this.createClient();
        if (action === 'list') await this.listClients();
        if (action === 'update') await this.updateClient();
        if (action === 'delete') await this.deleteClient();
        if (action === 'associate') await this.associateClient();

        await text({ message: 'Presiona ENTER para continuar...' });
    }

async createClient() {
    const name = await text({
        message: 'Nombre completo o Empresa:',
        validate(val) { if (!val || val.trim().length < 3) return 'Mínimo 3 caracteres.'; }
    });
    if (isCancel(name)) return;

    const email = await text({
        message: 'Correo de contacto:',
        validate(val) { if (!validator.isEmail(val)) return 'Ingrese un correo válido.'; }
    });
    if (isCancel(email)) return;

    const phone = await text({ message: 'Teléfono de contacto:' });
    if (isCancel(phone)) return;

    const clientPassword = await password({
        message: 'Asignar contraseña al cliente:'
    });
    if (isCancel(clientPassword)) return;

    const spinner = UI.createSpinner('Guardando cliente...').start();
    try {
        const doc = { 
            name: name.trim(), 
            email: email.trim().toLowerCase(), 
            phone: phone.trim(), 
            password: clientPassword,
            createdAt: new Date() 
        };
        const res = await this.clientsCollection.insertOne(doc);
        spinner.succeed(chalk.green(`Cliente creado con ID: ${res.insertedId}`));
    } catch (e) {
        spinner.fail('Error al guardar el cliente.');
        note(e.message, 'Error de MongoDB');
    }
}

    async listClients() {
        const spinner = UI.createSpinner('Cargando clientes...').start();
        try {
            const clients = await this.clientsCollection.find({}).toArray();
            spinner.stop();

            if (clients.length === 0) {
                console.log(chalk.yellow('\nNo hay clientes registrados.\n'));
                return;
            }

            const rows = clients.map(c => [c._id.toString(), c.name, c.email, c.phone || 'N/A', UI.formatDate(c.createdAt)]);
            UI.renderTable(['ID MongoDB', 'Nombre', 'Email', 'Teléfono', 'Fecha Registro'], rows);
        } catch (e) {
            spinner.fail('Error al consultar clientes.');
        }
    }

    async updateClient() {
        const id = await text({ message: 'ID del cliente a actualizar:' });
        if (isCancel(id) || !ObjectId.isValid(id)) return;

        const newName = await text({ message: 'Nuevo nombre (dejar vacío para conservar):' });
        const newPhone = await text({ message: 'Nuevo teléfono (dejar vacío para conservar):' });

        const updateDoc = {};
        if (newName && newName.trim()) updateDoc.name = newName.trim();
        if (newPhone && newPhone.trim()) updateDoc.phone = newPhone.trim();

        if (Object.keys(updateDoc).length === 0) return;

        const spinner = UI.createSpinner('Actualizando cliente...').start();
        try {
            await this.clientsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });
            spinner.succeed(chalk.green('Cliente actualizado exitosamente.'));
        } catch (e) {
            spinner.fail('Fallo la actualización.');
        }
    }

    async deleteClient() {
        const id = await text({ message: 'ID del cliente a eliminar:' });
        if (isCancel(id) || !ObjectId.isValid(id)) return;

        const sure = await confirm({ message: '¿Seguro que deseas eliminar este cliente?' });
        if (!sure || isCancel(sure)) return;

        const spinner = UI.createSpinner('Eliminando cliente...').start();
        try {
            await this.clientsCollection.deleteOne({ _id: new ObjectId(id) });
            spinner.succeed(chalk.green('Cliente eliminado de la base de datos.'));
        } catch (e) {
            spinner.fail('Error al eliminar cliente.');
        }
    }

    async associateClient() {
        const clientId = await text({ message: 'ID del Cliente:' });
        const projectId = await text({ message: 'ID del Proyecto o Propuesta:' });
        if (isCancel(clientId) || isCancel(projectId)) return;

        const spinner = UI.createSpinner('Asociando registro...').start();
        try {
            await this.projectsCollection.updateOne(
                { _id: new ObjectId(projectId) },
                { $set: { clientId: new ObjectId(clientId) } }
            );
            spinner.succeed(chalk.green('Cliente asociado correctamente al proyecto.'));
        } catch (e) {
            spinner.fail('Error al realizar la asociación.');
        }
    }

    // 2. GESTIÓN DE PROPUESTAS

    async proposalsModule() {
        UI.displayHeader('2. Gestión de Propuestas');

        const action = await select({
            message: 'Operación de Propuestas:',
            options: [
                { value: 'create', label: 'Crear propuesta (Descripción, Precio, Plazos)' },
                { value: 'status', label: 'Cambiar estado (Pendiente, Aceptada, Rechazada)' },
                { value: 'list', label: 'Listar propuestas' },
                { value: 'back', label: 'Volver' }
            ]
        });

        if (isCancel(action) || action === 'back') return;

        if (action === 'create') await this.createProposal();
        if (action === 'status') await this.updateProposalStatus();
        if (action === 'list') await this.listProposals();

        await text({ message: 'Presiona ENTER para continuar...' });
    }

    async createProposal() {
        const clientId = await text({ message: 'ID del cliente destinatario:' });
        if (isCancel(clientId) || !ObjectId.isValid(clientId)) return;

        const title = await text({ message: 'Título de la propuesta:' });
        const description = await text({ message: 'Descripción del trabajo:' });
        const priceStr = await text({ message: 'Precio estimado ($):' });
        const deadline = await text({ message: 'Plazo / Fecha límite (Ej: 2026-12-31):' });

        const spinner = UI.createSpinner('Registrando propuesta...').start();
        try {
            const proposalDoc = {
                clientId: new ObjectId(clientId),
                title: title.trim(),
                description: description.trim(),
                price: parseFloat(priceStr) || 0,
                deadline: deadline.trim(),
                status: 'pendiente', // pendiente, aceptada, rechazada
                createdAt: new Date()
            };

            const res = await this.proposalsCollection.insertOne(proposalDoc);
            spinner.succeed(chalk.green(`Propuesta guardada con ID: ${res.insertedId}`));
        } catch (e) {
            spinner.fail('Error al registrar la propuesta.');
        }
    }

    async updateProposalStatus() {
        const proposalId = await text({ message: 'ID de la propuesta:' });
        if (isCancel(proposalId) || !ObjectId.isValid(proposalId)) return;

        const newStatus = await select({
            message: 'Selecciona el nuevo estado:',
            options: [
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'aceptada', label: 'Aceptada (Genera Proyecto automáticamente)' },
                { value: 'rechazada', label: 'Rechazada' }
            ]
        });
        if (isCancel(newStatus)) return;

        const spinner = UI.createSpinner('Procesando actualización...').start();
        try {
            // 1. Actualiza el estado de la propuesta
            await this.proposalsCollection.updateOne(
                { _id: new ObjectId(proposalId) },
                { $set: { status: newStatus } }
            );

            // 2. REQUERIMIENTO CLAVE: Al ser aceptada, debe generar automáticamente un proyecto
            if (newStatus === 'aceptada') {
                const proposal = await this.proposalsCollection.findOne({ _id: new ObjectId(proposalId) });

                const autoProject = {
                    proposalId: proposal._id,
                    clientId: proposal.clientId,
                    name: proposal.title,
                    description: proposal.description,
                    budget: proposal.price,
                    status: 'activo', // Estados: activo, pausado, finalizado, cancelado
                    progress: 0,
                    createdAt: new Date()
                };

                const projRes = await this.projectsCollection.insertOne(autoProject);
                spinner.succeed(chalk.green(`Propuesta ACEPTADA. Se ha generado automáticamente el proyecto ID: ${projRes.insertedId}`));
            } else {
                spinner.succeed(chalk.green(`Estado de la propuesta actualizado a '${newStatus}'.`));
            }
        } catch (e) {
            spinner.fail('Error al actualizar el estado de la propuesta.');
        }
    }

    async listProposals() {
        const spinner = UI.createSpinner('Cargando propuestas...').start();
        try {
            const proposals = await this.proposalsCollection.find({}).toArray();
            spinner.stop();

            if (proposals.length === 0) {
                console.log(chalk.yellow('\nNo existen propuestas registradas.\n'));
                return;
            }

            const rows = proposals.map(p => [
                p._id.toString(),
                p.title,
                `$${p.price}`,
                p.status.toUpperCase(),
                p.deadline
            ]);

            UI.renderTable(['ID Propuesta', 'Título', 'Precio', 'Estado', 'Plazo'], rows);
        } catch (e) {
            spinner.fail('Error al consultar propuestas.');
        }
    }

    // 3. GESTIÓN DE PROYECTOS

    async projectsModule() {
        UI.displayHeader('3. Gestión de Proyectos');

        const action = await select({
            message: 'Operación de Proyectos:',
            options: [
                { value: 'list', label: 'Listar proyectos' },
                { value: 'status', label: 'Cambiar estado (activo, pausado, finalizado, cancelado)' },
                { value: 'progress', label: 'Registrar avances del proyecto' },
                { value: 'back', label: 'Volver' }
            ]
        });

        if (isCancel(action) || action === 'back') return;

        if (action === 'list') await this.listProjects();
        if (action === 'status') await this.updateProjectStatus();
        if (action === 'progress') await this.registerProjectProgress();

        await text({ message: 'Presiona ENTER para continuar...' });
    }

    async listProjects() {
        const spinner = UI.createSpinner('Cargando proyectos...').start();
        try {
            const projects = await this.projectsCollection.find({}).toArray();
            spinner.stop();

            if (projects.length === 0) {
                console.log(chalk.yellow('\nNo hay proyectos registrados.\n'));
                return;
            }

            const rows = projects.map(pr => [
                pr._id.toString(),
                pr.name,
                pr.clientId ? pr.clientId.toString() : 'Sin Cliente',
                pr.status.toUpperCase(),
                `${pr.progress || 0}%`
            ]);

            UI.renderTable(['ID Proyecto', 'Nombre', 'ID Cliente', 'Estado', 'Avance'], rows);
        } catch (e) {
            spinner.fail('Error al obtener proyectos.');
        }
    }

    async updateProjectStatus() {
        const projId = await text({ message: 'ID del proyecto:' });
        if (isCancel(projId) || !ObjectId.isValid(projId)) return;

        const status = await select({
            message: 'Nuevo estado del proyecto:',
            options: [
                { value: 'activo', label: 'Activo' },
                { value: 'pausado', label: 'Pausado' },
                { value: 'finalizado', label: 'Finalizado' },
                { value: 'cancelado', label: 'Cancelado' }
            ]
        });
        if (isCancel(status)) return;

        const spinner = UI.createSpinner('Actualizando estado del proyecto...').start();
        try {
            await this.projectsCollection.updateOne({ _id: new ObjectId(projId) }, { $set: { status } });
            spinner.succeed(chalk.green(`Estado del proyecto modificado a '${status}'.`));
        } catch (e) {
            spinner.fail('Error al modificar estado.');
        }
    }

    async registerProjectProgress() {
        const projId = await text({ message: 'ID del proyecto:' });
        if (isCancel(projId) || !ObjectId.isValid(projId)) return;

        const percentageStr = await text({ message: 'Porcentaje de avance (0 - 100):' });
        const noteText = await text({ message: 'Descripción del avance logrado:' });

        const percentage = parseInt(percentageStr, 10);
        const spinner = UI.createSpinner('Registrando avance...').start();

        try {
            await this.projectsCollection.updateOne(
                { _id: new ObjectId(projId) },
                {
                    $set: { progress: percentage },
                    $push: { logs: { note: noteText, percentage, date: new Date() } }
                }
            );
            spinner.succeed(chalk.green(`Avance actualizado al ${percentage}%.`));
        } catch (e) {
            spinner.fail('Error al registrar el avance.');
        }
    }

    // 4. CONTRATOS

    async contractsModule() {
        UI.displayHeader('4. Gestión de Contratos');

        const action = await select({
            message: 'Operación de Contratos:',
            options: [
                { value: 'create', label: 'Registrar nuevo contrato para proyecto' },
                { value: 'list', label: 'Consultar contratos' },
                { value: 'back', label: 'Volver' }
            ]
        });

        if (isCancel(action) || action === 'back') return;

        if (action === 'create') await this.createContract();
        if (action === 'list') await this.listContracts();

        await text({ message: 'Presiona ENTER para continuar...' });
    }

    async createContract() {
        const projectId = await text({ message: 'ID del proyecto asociado:' });
        if (isCancel(projectId) || !ObjectId.isValid(projectId)) return;

        const conditions = await text({ message: 'Condiciones y términos del contrato:' });
        const startDate = await text({ message: 'Fecha de inicio (AAAA-MM-DD):' });
        const endDate = await text({ message: 'Fecha de finalización (AAAA-MM-DD):' });
        const totalValueStr = await text({ message: 'Valor total del contrato ($):' });

        const spinner = UI.createSpinner('Vinculando contrato...').start();
        try {
            const contractDoc = {
                projectId: new ObjectId(projectId),
                conditions: conditions.trim(),
                startDate: startDate.trim(),
                endDate: endDate.trim(),
                totalValue: parseFloat(totalValueStr) || 0,
                createdAt: new Date()
            };

            const res = await this.contractsCollection.insertOne(contractDoc);
            // Vincular contrato en la colección de proyectos
            await this.projectsCollection.updateOne(
                { _id: new ObjectId(projectId) },
                { $set: { contractId: res.insertedId } }
            );

            spinner.succeed(chalk.green(`Contrato vinculado correctamente. ID: ${res.insertedId}`));
        } catch (e) {
            spinner.fail('Error al registrar el contrato.');
        }
    }

    async listContracts() {
        const spinner = UI.createSpinner('Cargando contratos...').start();
        try {
            const contracts = await this.contractsCollection.find({}).toArray();
            spinner.stop();

            if (contracts.length === 0) {
                console.log(chalk.yellow('\nNo existen contratos registrados.\n'));
                return;
            }

            const rows = contracts.map(c => [
                c._id.toString(),
                c.projectId.toString(),
                `$${c.totalValue}`,
                c.startDate,
                c.endDate
            ]);

            UI.renderTable(['ID Contrato', 'ID Proyecto', 'Valor Total', 'Fecha Inicio', 'Fecha Fin'], rows);
        } catch (e) {
            spinner.fail('Error al consultar contratos.');
        }
    }
    
    // 5. ENTREGABLES (Con Transacciones y Rollback)

    async deliverablesModule() {
        UI.displayHeader('5. Gestión de Entregables');

        const action = await select({
            message: 'Operación de Entregables:',
            options: [
                { value: 'create', label: 'Agregar entregable a proyecto' },
                { value: 'status', label: 'Cambiar estado (pendiente, entregado, aprobado, rechazado)' },
                { value: 'delete_rollback', label: 'Eliminar entregable (Garantizado con Transacción)' },
                { value: 'back', label: 'Volver' }
            ]
        });

        if (isCancel(action) || action === 'back') return;

        if (action === 'create') await this.createDeliverable();
        if (action === 'status') await this.updateDeliverableStatus();
        if (action === 'delete_rollback') await this.deleteDeliverableWithTransaction();

        await text({ message: 'Presiona ENTER para continuar...' });
    }

    async createDeliverable() {
        const projectId = await text({ message: 'ID del Proyecto:' });
        if (isCancel(projectId) || !ObjectId.isValid(projectId)) return;

        const title = await text({ message: 'Nombre/Título del entregable:' });
        const deadline = await text({ message: 'Fecha límite (AAAA-MM-DD):' });

        const spinner = UI.createSpinner('Registrando entregable...').start();
        try {
            const doc = {
                projectId: new ObjectId(projectId),
                title: title.trim(),
                deadline: deadline.trim(),
                status: 'pendiente', // pendiente, entregado, aprobado, rechazado
                createdAt: new Date()
            };

            const res = await this.deliverablesCollection.insertOne(doc);
            spinner.succeed(chalk.green(`Entregable registrado con ID: ${res.insertedId}`));
        } catch (e) {
            spinner.fail('Error al registrar entregable.');
        }
    }

    async updateDeliverableStatus() {
        const delivId = await text({ message: 'ID del entregable:' });
        if (isCancel(delivId) || !ObjectId.isValid(delivId)) return;

        const status = await select({
            message: 'Estado del entregable:',
            options: [
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'entregado', label: 'Entregado' },
                { value: 'aprobado', label: 'Aprobado' },
                { value: 'rechazado', label: 'Rechazado' }
            ]
        });
        if (isCancel(status)) return;

        const spinner = UI.createSpinner('Actualizando estado del entregable...').start();
        try {
            await this.deliverablesCollection.updateOne({ _id: new ObjectId(delivId) }, { $set: { status } });
            spinner.succeed(chalk.green(`Estado de entregable cambiado a '${status}'.`));
        } catch (e) {
            spinner.fail('Fallo al modificar entregable.');
        }
    }

    
    //Rollback mediante transacciones ACID de MongoDB.
    async deleteDeliverableWithTransaction() {
        const delivId = await text({ message: 'ID del entregable a eliminar:' });
        if (isCancel(delivId) || !ObjectId.isValid(delivId)) return;

        const session = Database.startSession();
        const spinner = UI.createSpinner('Ejecutando eliminación segura dentro de transacción...').start();

        try {
            await session.withTransaction(async () => {
                // 1. Verificar si existe
                const item = await this.deliverablesCollection.findOne({ _id: new ObjectId(delivId) }, { session });
                if (!item) throw new Error('Entregable no encontrado.');

                // 2. Eliminar entregable
                await this.deliverablesCollection.deleteOne({ _id: new ObjectId(delivId) }, { session });

                // 3. Desvincular de la lista del proyecto asociado
                await this.projectsCollection.updateOne(
                    { _id: item.projectId },
                    { $pull: { deliverables: new ObjectId(delivId) } },
                    { session }
                );
            });

            spinner.succeed(chalk.green('Entregable eliminado con éxito (Transacción ACID completada).'));
        } catch (e) {
            spinner.fail(`Rollback ejecutado: ${e.message}`);
        } finally {
            await session.endSession();
        }
    }


    // 6. GESTIÓN FINANCIERA

    async financesModule() {
        UI.displayHeader('6. Gestión Financiera');

        const action = await select({
            message: 'Operación Financiera:',
            options: [
                { value: 'register', label: 'Registrar Ingreso o Egreso por Proyecto' },
                { value: 'balance_client', label: 'Cálculo de Balance por Cliente' },
                { value: 'payment_transaction', label: 'Registrar pago seguro con Transacción' },
                { value: 'back', label: 'Volver' }
            ]
        });

        if (isCancel(action) || action === 'back') return;

        if (action === 'register') await this.registerFinance();
        if (action === 'balance_client') await this.calculateBalanceByClient();
        if (action === 'payment_transaction') await this.processPaymentTransaction();

        await text({ message: 'Presiona ENTER para continuar...' });
    }

    async registerFinance() {
        const projectId = await text({ message: 'ID del proyecto:' });
        if (isCancel(projectId) || !ObjectId.isValid(projectId)) return;

        const type = await select({
            message: 'Tipo de movimiento:',
            options: [
                { value: 'ingreso', label: 'Ingreso (+)' },
                { value: 'egreso', label: 'Egreso (-)' }
            ]
        });
        if (isCancel(type)) return;

        const amountStr = await text({ message: 'Monto ($):' });
        const concept = await text({ message: 'Concepto / Descripción:' });

        const spinner = UI.createSpinner('Registrando transacción financiera...').start();
        try {
            const doc = {
                projectId: new ObjectId(projectId),
                type,
                amount: parseFloat(amountStr) || 0,
                concept: concept.trim(),
                date: new Date()
            };

            await this.financesCollection.insertOne(doc);
            spinner.succeed(chalk.green(`Movimiento de ${type} registrado con éxito.`));
        } catch (e) {
            spinner.fail('Error al registrar movimiento financiero.');
        }
    }

    async calculateBalanceByClient() {
        const clientId = await text({ message: 'ID del cliente:' });
        if (isCancel(clientId) || !ObjectId.isValid(clientId)) return;

        const spinner = UI.createSpinner('Calculando balance financiero...').start();
        try {
            // 1. Obtener proyectos del cliente
            const projects = await this.projectsCollection.find({ clientId: new ObjectId(clientId) }).toArray();
            const projectIds = projects.map(p => p._id);

            // 2. Obtener movimientos financieros de esos proyectos
            const records = await this.financesCollection.find({ projectId: { $in: projectIds } }).toArray();
            spinner.stop();

            let totalIngresos = 0;
            let totalEgresos = 0;

            records.forEach(r => {
                if (r.type === 'ingreso') totalIngresos += r.amount;
                if (r.type === 'egreso') totalEgresos += r.amount;
            });

            const balance = totalIngresos - totalEgresos;

            console.log(chalk.bold(`\nBalance Financiero del Cliente [ID: ${clientId}]:`));
            console.log(`- Total Ingresos: ${chalk.green(`$${totalIngresos}`)}`);
            console.log(`- Total Egresos:  ${chalk.red(`$${totalEgresos}`)}`);
            console.log(`- Balance Neto:   ${balance >= 0 ? chalk.green(`$${balance}`) : chalk.red(`$${balance}`)}\n`);
        } catch (e) {
            spinner.fail('Error al calcular el balance.');
        }
    }


    // Transacción para registrar pagos, evitar duplicidad y garantizar consistencia.
    async processPaymentTransaction() {
        const projectId = await text({ message: 'ID del proyecto a pagar:' });
        const amountStr = await text({ message: 'Monto del pago ($):' });
        const txRef = await text({ message: 'Código de referencia único del pago:' });

        if (isCancel(projectId) || isCancel(txRef)) return;

        const session = Database.startSession();
        const spinner = UI.createSpinner('Procesando pago atómico mediante transacción...').start();

        try {
            await session.withTransaction(async () => {
                // A. Verificar no duplicidad del código de referencia
                const duplicate = await this.financesCollection.findOne({ reference: txRef.trim() }, { session });
                if (duplicate) {
                    throw new Error('El código de referencia de este pago ya fue procesado previamente.');
                }

                // B. Registrar el ingreso financiero
                await this.financesCollection.insertOne({
                    projectId: new ObjectId(projectId),
                    type: 'ingreso',
                    amount: parseFloat(amountStr) || 0,
                    concept: 'Pago de cliente registrado de forma segura',
                    reference: txRef.trim(),
                    date: new Date()
                }, { session });

                // C. Actualizar estado financiero del proyecto
                await this.projectsCollection.updateOne(
                    { _id: new ObjectId(projectId) },
                    { $inc: { totalPaid: parseFloat(amountStr) || 0 } },
                    { session }
                );
            });

            spinner.succeed(chalk.green('Pago verificado y registrado exitosamente sin duplicación.'));
        } catch (e) {
            spinner.fail(`Fallo en el pago (Transacción abortada): ${e.message}`);
        } finally {
            await session.endSession();
        }
    }
}