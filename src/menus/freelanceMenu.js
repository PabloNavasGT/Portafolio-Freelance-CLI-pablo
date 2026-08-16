import { select, text, confirm, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import boxen from 'boxen';
import validator from 'validator';
import { ObjectId } from 'mongodb';

// Configuración centralizada de base de datos y utilidades visuales
import Database from '../config/db.js';
import { UI } from '../utils/ui.js';

export class FreelanceMenu {
    // ACCESORES DE BASE DE DATOS (MongoDB Collections)
    get db() { return Database.getDb(); }
    get clientsCollection() { return this.db.collection('clients'); }
    get proposalsCollection() { return this.db.collection('proposals'); }
    get projectsCollection() { return this.db.collection('projects'); }
    get contractsCollection() { return this.db.collection('contracts'); }
    get deliverablesCollection() { return this.db.collection('deliverables'); }
    get financesCollection() { return this.db.collection('finances'); }

    // Método de arranque principal
    async show() {
        return await this.mainMenu();
    }

    // Genera etiquetas (Badges) estilizadas
    getBadge(category, status) {
        const st = status || '';
        switch (category) {
            case 'proposals':
                if (st === 'pendiente') return chalk.yellow(`${UI.symbols.warning} [ PENDIENTE ]`);
                if (st === 'aceptada') return chalk.green(`${UI.symbols.success} [ ACEPTADA ]`);
                if (st === 'rechazada') return chalk.red(`${UI.symbols.error} [ RECHAZADA ]`);
                return chalk.gray(`[ ${st} ]`);

            case 'projects':
                if (st === 'activo') return chalk.green(`${UI.symbols.info} [ ACTIVO ]`);
                if (st === 'pausado') return chalk.yellow(`${UI.symbols.warning} [ PAUSADO ]`);
                if (st === 'finalizado') return chalk.blue(`${UI.symbols.success} [ FINALIZADO ]`);
                if (st === 'cancelado') return chalk.red(`${UI.symbols.error} [ CANCELADO ]`);
                return chalk.gray(`[ ${st} ]`);

            case 'deliverables':
                if (st === 'pendiente') return chalk.white(`${UI.symbols.warning} [ PENDIENTE ]`);
                if (st === 'entregado') return chalk.yellow(`${UI.symbols.info} [ ENTREGADO ]`);
                if (st === 'aprobado') return chalk.green(`${UI.symbols.success} [ APROBADO ]`);
                if (st === 'rechazado') return chalk.red(`${UI.symbols.error} [ RECHAZADO ]`);
                return chalk.gray(`[ ${st} ]`);

            case 'finances':
                if (st === 'ingreso') return chalk.green(`${UI.symbols.success} [ INGRESO (+) ]`);
                if (st === 'egreso') return chalk.red(`${UI.symbols.error} [ EGRESO (-) ]`);
                return chalk.gray(`[ ${st} ]`);

            default:
                return chalk.gray(`[ ${st || 'N/A'} ]`);
        }
    }

    // Renderiza una barra de progreso gráfica ASCII
    renderInlineProgressBar(percentage = 0, length = 10) {
        const validPercent = Math.min(100, Math.max(0, Number(percentage) || 0));
        const filledLength = Math.round((validPercent / 100) * length);
        const emptyLength = length - filledLength;

        const filledBar = chalk.cyan('█'.repeat(filledLength));
        const emptyBar = chalk.gray('░'.repeat(emptyLength));

        return `[${filledBar}${emptyBar}] ${chalk.bold(validPercent)}%`;
    }

    // Imprime cajas estilizadas cuando una colección está vacía
    renderEmptyStateBox(entityName, actionTip) {
        const message = `${UI.symbols.warning} ${chalk.yellow('No existen ' + entityName + ' registrados actualmente.')}\n${chalk.gray(actionTip)}`;
        console.log(
            boxen(message, {
                padding: 1,
                margin: { top: 1, bottom: 1 },
                borderStyle: 'round',
                borderColor: 'yellow',
                align: 'center'
            })
        );
    }

    // SELECTORES INTERACTIVOS

    async selectClientInteractive() {
        const clients = await this.clientsCollection.find().toArray();
        if (!clients.length) {
            this.renderEmptyStateBox('clientes', 'Registra un cliente antes de continuar.');
            return null;
        }

        const choices = clients.map(c => ({
            value: c._id.toString(),
            label: `${c.name || 'Sin nombre'} (${c.email || 'Sin email'})`
        }));

        const selectedId = await select({
            message: 'Seleccione un Cliente de la lista:',
            options: choices
        });

        return isCancel(selectedId) ? null : selectedId;
    }

    async selectProjectInteractive() {
        const projects = await this.projectsCollection.find().toArray();
        if (!projects.length) {
            this.renderEmptyStateBox('proyectos', 'Crea un proyecto primero desde la opción correspondiente.');
            return null;
        }

        const choices = projects.map(p => ({
            value: p._id.toString(),
            label: `${p.name} - ${this.getBadge('projects', p.status)}`
        }));

        const selectedId = await select({
            message: 'Seleccione un Proyecto de la lista:',
            options: choices
        });

        return isCancel(selectedId) ? null : selectedId;
    }

    async selectDeliverableInteractive() {
        const deliverables = await this.deliverablesCollection.find().toArray();
        if (!deliverables.length) {
            this.renderEmptyStateBox('entregables', 'No hay entregables disponibles para seleccionar.');
            return null;
        }

        const choices = deliverables.map(d => ({
            value: d._id.toString(),
            label: `${d.title || d.name} - Estado: ${d.status}`
        }));

        const selectedId = await select({
            message: 'Seleccione un Entregable de la lista:',
            options: choices
        });

        return isCancel(selectedId) ? null : selectedId;
    }

    async selectProposalInteractive() {
        const proposals = await this.proposalsCollection.find().toArray();
        if (!proposals.length) {
            this.renderEmptyStateBox('propuestas', 'Crea una propuesta primero.');
            return null;
        }

        const choices = proposals.map(p => ({
            value: p._id.toString(),
            label: `${p.title || 'Sin título'} - $${p.price || 0} - ${this.getBadge('proposals', p.status)}`
        }));

        const selectedId = await select({
            message: 'Seleccione una Propuesta de la lista:',
            options: choices
        });

        return isCancel(selectedId) ? null : selectedId;
    }

    // MENÚ PRINCIPAL

    async mainMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Menu Principal');

            const option = await select({
                message: 'Seleccione una opción de gestión:',
                options: [
                    { value: 'clients', label: 'Gestion de Clientes' },
                    { value: 'proposals', label: 'Gestion de Propuestas' },
                    { value: 'projects', label: 'Gestion de Proyectos' },
                    { value: 'deliverables', label: 'Gestion de Entregables' },
                    { value: 'finances', label: 'Gestion Financiera' },
                    { value: 'exit', label: 'Salir al Menu Principal' }
                ]
            });

            if (isCancel(option) || option === 'exit') break;

            switch (option) {
                case 'clients': await this.clientsSubMenu(); break;
                case 'proposals': await this.proposalsSubMenu(); break;
                case 'projects': await this.projectsSubMenu(); break;
                case 'deliverables': await this.deliverablesSubMenu(); break;
                case 'finances': await this.financesSubMenu(); break;
            }
        }
    }

    // SUBMÓDULO: GESTIÓN DE CLIENTES

    async clientsSubMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Gestion de Clientes');

            const action = await select({
                message: 'Operaciones de Clientes:',
                options: [
                    { value: 'list', label: 'Listar Clientes' },
                    { value: 'create', label: 'Crear Nuevo Cliente' },
                    { value: 'update', label: 'Actualizar Cliente' },
                    { value: 'delete', label: 'Eliminar Cliente' },
                    { value: 'back', label: 'Volver' }
                ]
            });

            if (isCancel(action) || action === 'back') break;

            if (action === 'list') await this.listClients();
            if (action === 'create') await this.createClient();
            if (action === 'update') await this.updateClient();
            if (action === 'delete') await this.deleteClient();
        }
    }

    async listClients() {
        UI.displayHeader('> Modo Freelancer > Gestion de Clientes > Listar Clientes');
        const clients = await this.clientsCollection.find().toArray();

        if (!clients.length) {
            this.renderEmptyStateBox('clientes', 'Utiliza la opción "Crear Nuevo Cliente" para comenzar.');
        } else {
            const headers = ['ID', 'Nombre', 'Email', 'Teléfono'];
            const rows = clients.map(c => [
                c._id.toString(),
                c.name || 'N/A',
                c.email || 'N/A',
                c.phone || 'N/A'
            ]);
            UI.renderTable(headers, rows);
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async createClient() {
        UI.displayHeader('> Modo Freelancer > Gestion de Clientes > Crear Nuevo Cliente');

        const name = await text({
            message: 'Nombre del Cliente:',
            validate: val => (!val || val.trim().length === 0) ? 'El nombre es requerido' : undefined
        });
        if (isCancel(name)) return;

        const email = await text({
            message: 'Correo Electrónico:',
            validate: val => (!val || !validator.isEmail(val)) ? 'Ingrese un email válido' : undefined
        });
        if (isCancel(email)) return;

        const phone = await text({ message: 'Teléfono (Opcional):' });
        if (isCancel(phone)) return;

        const spinner = UI.createSpinner('Guardando cliente en base de datos...').start();
        await this.clientsCollection.insertOne({
            name: name.trim(),
            email: email.trim(),
            phone: phone?.trim() || 'N/A',
            createdAt: new Date()
        });
        spinner.succeed(chalk.green(`${UI.symbols.success} Cliente registrado con éxito.`));

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async updateClient() {
        UI.displayHeader('> Modo Freelancer > Gestion de Clientes > Actualizar Cliente');

        const clientId = await this.selectClientInteractive();
        if (!clientId) return;

        const name = await text({ message: 'Nuevo Nombre del Cliente (Dejar en blanco para mantener actual):' });
        if (isCancel(name)) return;

        const email = await text({
            message: 'Nuevo Correo Electrónico (Dejar en blanco para mantener actual):',
            validate: val => (val && val.trim() !== '' && !validator.isEmail(val)) ? 'Ingrese un email válido' : undefined
        });
        if (isCancel(email)) return;

        const phone = await text({ message: 'Nuevo Teléfono (Dejar en blanco para mantener actual):' });
        if (isCancel(phone)) return;

        const updateData = {};
        if (name && name.trim()) updateData.name = name.trim();
        if (email && email.trim()) updateData.email = email.trim();
        if (phone && phone.trim()) updateData.phone = phone.trim();

        if (Object.keys(updateData).length === 0) {
            await text({ message: 'No se realizaron cambios. Presione ENTER para continuar...' });
            return;
        }

        updateData.updatedAt = new Date();

        const spinner = UI.createSpinner('Actualizando información del cliente...').start();
        await this.clientsCollection.updateOne(
            { _id: new ObjectId(clientId) },
            { $set: updateData }
        );
        spinner.succeed(chalk.green(`${UI.symbols.success} Cliente actualizado con éxito.`));

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async deleteClient() {
        UI.displayHeader('> Modo Freelancer > Gestion de Clientes > Eliminar Cliente');

        const clientId = await this.selectClientInteractive();
        if (!clientId) return;

        const confirmDelete = await confirm({
            message: '¿Está seguro de que desea eliminar este cliente?'
        });
        if (!confirmDelete || isCancel(confirmDelete)) return;

        const spinner = UI.createSpinner('Eliminando cliente de la base de datos...').start();
        await this.clientsCollection.deleteOne({ _id: new ObjectId(clientId) });
        spinner.succeed(chalk.green(`${UI.symbols.success} Cliente eliminado con éxito.`));

        await text({ message: 'Presione ENTER para continuar...' });
    }

    // SUBMÓDULO: GESTIÓN DE PROPUESTAS

    async proposalsSubMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Gestion de Propuestas');

            const action = await select({
                message: 'Operaciones de Propuestas:',
                options: [
                    { value: 'list', label: 'Listar Propuestas' },
                    { value: 'create', label: 'Crear Nueva Propuesta' },
                    { value: 'change_status', label: 'Cambiar Estado de Propuesta' },
                    { value: 'back', label: 'Volver' }
                ]
            });

            if (isCancel(action) || action === 'back') break;

            if (action === 'list') await this.listProposals();
            if (action === 'create') await this.createProposal();
            if (action === 'change_status') await this.changeProposalStatus();
        }
    }

    async listProposals() {
        UI.displayHeader('> Modo Freelancer > Gestion de Propuestas > Listar Propuestas');
        const proposals = await this.proposalsCollection.find().toArray();

        if (!proposals.length) {
            this.renderEmptyStateBox('propuestas', 'No existen propuestas registradas actualmente.');
        } else {
            const headers = ['ID', 'Título', 'Precio ($)', 'Plazo', 'Estado'];
            const rows = proposals.map(pr => [
                pr._id.toString(),
                pr.title || 'Sin título',
                `$${(pr.price || 0).toFixed(2)}`,
                pr.deadline || 'N/A',
                this.getBadge('proposals', pr.status)
            ]);
            UI.renderTable(headers, rows);
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async createProposal() {
        UI.displayHeader('> Modo Freelancer > Gestion de Propuestas > Crear Propuesta');

        const clientId = await this.selectClientInteractive();
        if (!clientId) return;

        const title = await text({
            message: 'Título de la Propuesta:',
            validate: val => (!val || val.trim().length === 0) ? 'El título es requerido' : undefined
        });
        if (isCancel(title)) return;

        const description = await text({
            message: 'Descripción del Trabajo / Alcance:',
            validate: val => (!val || val.trim().length === 0) ? 'La descripción es requerida' : undefined
        });
        if (isCancel(description)) return;

        const price = await text({
            message: 'Precio estimado ($):',
            validate: val => {
                const num = Number(val);
                if (isNaN(num) || num <= 0) return 'Ingrese un precio válido mayor a 0';
            }
        });
        if (isCancel(price)) return;

        const deadline = await text({
            message: 'Plazo de entrega (ej. "15 días", "2026-09-30"):',
            validate: val => (!val || val.trim().length === 0) ? 'El plazo es requerido' : undefined
        });
        if (isCancel(deadline)) return;

        const status = await select({
            message: 'Estado inicial de la propuesta:',
            options: [
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'aceptada', label: 'Aceptada (Generará proyecto automáticamente)' },
                { value: 'rechazada', label: 'Rechazada' }
            ]
        });
        if (isCancel(status)) return;

        const client = Database.getClient();
        const session = client.startSession();
        const spinner = UI.createSpinner('Guardando propuesta...').start();

        try {
            session.startTransaction();

            const proposalDoc = {
                clientId: new ObjectId(clientId),
                title: title.trim(),
                description: description.trim(),
                price: Number(price),
                deadline: deadline.trim(),
                status,
                createdAt: new Date()
            };

            const propResult = await this.proposalsCollection.insertOne(proposalDoc, { session });

            let projectCreated = false;
            if (status === 'aceptada') {
                await this.projectsCollection.insertOne({
                    name: title.trim(),
                    clientId: new ObjectId(clientId),
                    proposalId: propResult.insertedId,
                    status: 'activo',
                    progress: 0,
                    budget: Number(price),
                    createdAt: new Date()
                }, { session });
                projectCreated = true;
            }

            await session.commitTransaction();
            const successMsg = projectCreated 
                ? 'Propuesta creada y Proyecto activado automáticamente.' 
                : 'Propuesta guardada exitosamente.';
            spinner.succeed(chalk.green(`${UI.symbols.success} ${successMsg}`));
        } catch (error) {
            await session.abortTransaction();
            spinner.fail(chalk.red(`${UI.symbols.error} Error al guardar propuesta: ${error.message}`));
        } finally {
            await session.endSession();
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async changeProposalStatus() {
        UI.displayHeader('> Modo Freelancer > Gestion de Propuestas > Cambiar Estado');

        const proposalId = await this.selectProposalInteractive();
        if (!proposalId) return;

        const proposal = await this.proposalsCollection.findOne({ _id: new ObjectId(proposalId) });
        if (!proposal) return;

        const newStatus = await select({
            message: `Estado actual: ${proposal.status}. Seleccione el nuevo estado:`,
            options: [
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'aceptada', label: 'Aceptada (Generará proyecto)' },
                { value: 'rechazada', label: 'Rechazada' }
            ]
        });
        if (isCancel(newStatus) || newStatus === proposal.status) {
            await text({ message: 'Sin cambios. Presione ENTER para continuar...' });
            return;
        }

        const client = Database.getClient();
        const session = client.startSession();
        const spinner = UI.createSpinner('Actualizando estado de la propuesta...').start();

        try {
            session.startTransaction();

            await this.proposalsCollection.updateOne(
                { _id: new ObjectId(proposalId) },
                { $set: { status: newStatus, updatedAt: new Date() } },
                { session }
            );

            let projectCreated = false;

            if (newStatus === 'aceptada') {
                const existingProject = await this.projectsCollection.findOne(
                    { proposalId: new ObjectId(proposalId) },
                    { session }
                );

                if (!existingProject) {
                    await this.projectsCollection.insertOne({
                        name: proposal.title || 'Proyecto desde Propuesta',
                        clientId: proposal.clientId,
                        proposalId: new ObjectId(proposalId),
                        status: 'activo',
                        progress: 0,
                        budget: proposal.price || 0,
                        createdAt: new Date()
                    }, { session });
                    projectCreated = true;
                }
            }

            await session.commitTransaction();

            const msg = projectCreated
                ? 'Propuesta ACEPTADA y Proyecto automático generado.'
                : 'Estado de propuesta actualizado correctamente.';

            spinner.succeed(chalk.green(`${UI.symbols.success} ${msg}`));
        } catch (error) {
            await session.abortTransaction();
            spinner.fail(chalk.red(`${UI.symbols.error} Error en transacción: ${error.message}`));
        } finally {
            await session.endSession();
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }


// selectores interactivos auxiliares
async selectProjectInteractive() {
    const projects = await this.projectsCollection.find().toArray();
    if (!projects.length) {
        this.renderEmptyStateBox('proyectos', 'No hay proyectos registrados.');
        await text({ message: 'Presione ENTER para continuar...' });
        return null;
    }

    const choices = projects.map(p => ({
        value: p._id.toString(),
        label: `${p.name} [${p.status.toUpperCase()}]`
    }));

    const selectedId = await select({
        message: 'Seleccione un Proyecto:',
        options: choices
    });

        if (isCancel(selectedId)) return null;
        return selectedId;
    }

// Gestion de proyectos

async selectContractInteractive() {
    const contracts = await this.contractsCollection.find().toArray();
    if (!contracts.length) return null;

    const choices = [
        { value: 'none', label: 'Sin contrato vinculado' },
        ...contracts.map(c => ({
            value: c._id.toString(),
            label: `Contrato: ${c.title || c.code || c._id.toString()}`
        }))
    ];

const selectedId = await select({
    message: 'Seleccione un Contrato para vincular (Opcional):',
    options: choices
});

    if (isCancel(selectedId) || selectedId === 'none') return null;
    return selectedId;
}
    // SUBMÓDULO: GESTIÓN DE PROYECTOS

async selectProjectInteractive() {
    const projects = await this.projectsCollection.find().toArray();
    if (!projects.length) {
        this.renderEmptyStateBox('proyectos', 'No hay proyectos registrados.');
        await text({ message: 'Presione ENTER para continuar...' });
        return null;
    }

    const choices = projects.map(p => ({
        value: p._id.toString(),
        label: `${p.name} [${p.status.toUpperCase()}]`
    }));

    const selectedId = await select({
        message: 'Seleccione un Proyecto:',
        options: choices
    });

    if (isCancel(selectedId)) return null;
    return selectedId;
}

async selectContractInteractive() {
    const contracts = await this.contractsCollection.find().toArray();
    if (!contracts.length) return null;

    const choices = [
        { value: 'none', label: 'Sin contrato vinculado' },
        ...contracts.map(c => ({
            value: c._id.toString(),
            label: `Contrato: ${c.title || c.code || c._id.toString()}`
        }))
    ];

    const selectedId = await select({
        message: 'Seleccione un Contrato para vincular (Opcional):',
        options: choices
    });

    if (isCancel(selectedId) || selectedId === 'none') return null;
    return selectedId;
}

// SUBMÓDULO: GESTIÓN DE PROYECTOS 

async projectsSubMenu() {
    while (true) {
        UI.displayHeader('> Modo Freelancer > Gestion de Proyectos');

        const action = await select({
            message: 'Operaciones de Proyectos:',
            options: [
                { value: 'list', label: 'Listar Proyectos y Detalles' },
                { value: 'create', label: 'Crear Nuevo Proyecto' },
                { value: 'update', label: 'Actualizar Proyecto / Estado' },
                { value: 'progress', label: 'Registrar Avances' },
                { value: 'delete', label: 'Eliminar Proyecto' },
                { value: 'back', label: 'Volver' }
            ]
        });

        if (isCancel(action) || action === 'back') break;

        if (action === 'list') await this.listProjects();
        if (action === 'create') await this.createProject();
        if (action === 'update') await this.updateProject();
        if (action === 'progress') await this.updateProjectProgress();
        if (action === 'delete') await this.deleteProject();
    }
}

async listProjects() {
    UI.displayHeader('> Modo Freelancer > Gestion de Proyectos > Listar Proyectos');
    const projects = await this.projectsCollection.find().toArray();

    if (!projects.length) {
        this.renderEmptyStateBox('proyectos', 'Crea un nuevo proyecto para comenzar.');
        await text({ message: 'Presione ENTER para continuar...' });
        return;
    }

    const clients = await this.clientsCollection.find().toArray();
    const contracts = await this.contractsCollection.find().toArray();
    const deliverables = await this.deliverablesCollection.find().toArray();

    const clientMap = new Map(clients.map(c => [c._id.toString(), c.name]));
    const contractMap = new Map(contracts.map(c => [c._id.toString(), c.title || 'Contrato sin título']));

    const headers = ['ID', 'Proyecto', 'Cliente', 'Contrato', 'Entregables', 'Estado', 'Progreso'];
    
    const rows = projects.map((p, index) => {
        const clientName = p.clientId ? (clientMap.get(p.clientId.toString()) || 'Desconocido') : 'Sin cliente';
        const contractTitle = p.contractId ? (contractMap.get(p.contractId.toString()) || 'Vinculado') : 'Sin contrato';
        const linkedDeliverables = deliverables.filter(d => d.projectId && d.projectId.toString() === p._id.toString()).length;

        return [
            `P-${String(index + 1).padStart(3, '0')}`,
            p.name || 'Sin nombre',
            clientName,
            contractTitle,
            `${linkedDeliverables} asoc.`,
            this.getBadge('projects', p.status),
            this.renderInlineProgressBar(p.progress || 0)
        ];
    });

    UI.renderTable(headers, rows);
    await text({ message: 'Presione ENTER para continuar...' });
}

async createProject() {
    UI.displayHeader('> Modo Freelancer > Gestion de Proyectos > Crear Proyecto');

    const clientId = await this.selectClientInteractive();
    if (!clientId) return;

    const name = await text({
        message: 'Nombre del Proyecto:',
        validate: val => (!val || val.trim().length === 0) ? 'El nombre es requerido' : undefined
    });
    if (isCancel(name)) return;

    const description = await text({
        message: 'Descripción o alcance del proyecto (Opcional):'
    });
    if (isCancel(description)) return;

    const budget = await text({
        message: 'Presupuesto asignado ($):',
        validate: val => {
            if (val && val.trim() !== '') {
                const num = Number(val);
                if (isNaN(num) || num < 0) return 'Ingrese un monto numérico válido';
            }
        }
    });
    if (isCancel(budget)) return;

    const status = await select({
        message: 'Estado inicial del proyecto:',
        options: [
            { value: 'activo', label: 'Activo' },
            { value: 'pausado', label: 'Pausado' },
            { value: 'finalizado', label: 'Finalizado' },
            { value: 'cancelado', label: 'Cancelado' }
        ]
    });
    if (isCancel(status)) return;

    const contractId = await this.selectContractInteractive();

    const spinner = UI.createSpinner('Guardando proyecto en la base de datos...').start();

    const newProject = {
        name: name.trim(),
        description: description?.trim() || '',
        clientId: new ObjectId(clientId),
        contractId: contractId ? new ObjectId(contractId) : null,
        status,
        progress: 0,
        budget: budget ? Number(budget) : 0,
        createdAt: new Date()
    };

    await this.projectsCollection.insertOne(newProject);
    spinner.succeed(chalk.green(`${UI.symbols.success} Proyecto creado exitosamente.`));

    await text({ message: 'Presione ENTER para continuar...' });
}

async updateProject() {
    UI.displayHeader('> Modo Freelancer > Gestion de Proyectos > Actualizar Proyecto');

    const projectId = await this.selectProjectInteractive();
    if (!projectId) return;

    const project = await this.projectsCollection.findOne({ _id: new ObjectId(projectId) });
    if (!project) return;

    const name = await text({
        message: `Nuevo nombre (Actual: "${project.name}") [ENTER para mantener]:`
    });
    if (isCancel(name)) return;

    const status = await select({
        message: `Estado del proyecto (Actual: ${project.status}):`,
        options: [
            { value: 'activo', label: 'Activo' },
            { value: 'pausado', label: 'Pausado' },
            { value: 'finalizado', label: 'Finalizado' },
            { value: 'cancelado', label: 'Cancelado' }
        ]
    });
    if (isCancel(status)) return;

    const updateData = { status, updatedAt: new Date() };
    if (name && name.trim()) updateData.name = name.trim();

    const rebindContract = await confirm({
        message: '¿Desea modificar la vinculación del contrato?'
    });
    
    if (!isCancel(rebindContract) && rebindContract) {
        const newContractId = await this.selectContractInteractive();
        updateData.contractId = newContractId ? new ObjectId(newContractId) : null;
    }

    const spinner = UI.createSpinner('Actualizando proyecto...').start();
    await this.projectsCollection.updateOne(
        { _id: new ObjectId(projectId) },
        { $set: updateData }
    );
    spinner.succeed(chalk.green(`${UI.symbols.success} Proyecto actualizado con éxito.`));

    await text({ message: 'Presione ENTER para continuar...' });
}

async updateProjectProgress() {
    UI.displayHeader('> Modo Freelancer > Gestion de Proyectos > Registrar Avance');

    const projectId = await this.selectProjectInteractive();
    if (!projectId) return;

    const project = await this.projectsCollection.findOne({ _id: new ObjectId(projectId) });
    if (!project) return;

    console.log(chalk.cyan(`Progreso actual: ${this.renderInlineProgressBar(project.progress || 0, 15)}`));

    const newProgress = await text({
        message: 'Ingrese el nuevo porcentaje de avance (0 - 100):',
        validate: val => {
            const num = Number(val);
            if (isNaN(num) || num < 0 || num > 100) return 'Ingrese un número entero o decimal entre 0 y 100';
        }
    });
    if (isCancel(newProgress)) return;

    const progressNum = Number(newProgress);
    const updateData = {
        progress: progressNum,
        updatedAt: new Date()
    };

    if (progressNum === 100 && project.status !== 'finalizado') {
        const autoFinish = await confirm({
            message: 'El avance llegó al 100%. ¿Desea cambiar el estado a FINALIZADO?'
        });
        if (autoFinish && !isCancel(autoFinish)) {
            updateData.status = 'finalizado';
        }
    }

    const spinner = UI.createSpinner('Registrando avance...').start();
    await this.projectsCollection.updateOne(
        { _id: new ObjectId(projectId) },
        { $set: updateData }
    );
    spinner.succeed(chalk.green(`${UI.symbols.success} Avance actualizado a ${progressNum}%.`));

    await text({ message: 'Presione ENTER para continuar...' });
}

async deleteProject() {
    UI.displayHeader('> Modo Freelancer > Gestion de Proyectos > Eliminar Proyecto');

    const projectId = await this.selectProjectInteractive();
    if (!projectId) return;

    const linkedDeliverables = await this.deliverablesCollection.countDocuments({
        projectId: new ObjectId(projectId)
    });

    if (linkedDeliverables > 0) {
        console.log(chalk.yellow(`${UI.symbols.warning} Atención: Este proyecto tiene ${linkedDeliverables} entregables asociados.`));
    }

    const confirmDelete = await confirm({
        message: '¿Está seguro de que desea eliminar este proyecto?'
    });
    if (!confirmDelete || isCancel(confirmDelete)) return;

    const spinner = UI.createSpinner('Eliminando proyecto...').start();
    await this.projectsCollection.deleteOne({ _id: new ObjectId(projectId) });
    spinner.succeed(chalk.green(`${UI.symbols.success} Proyecto eliminado con éxito.`));

    await text({ message: 'Presione ENTER para continuar...' });
}

    // SUBMÓDULO: GESTIÓN DE ENTREGABLES

    async deliverablesSubMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Gestion de Entregables');

            const action = await select({
                message: 'Operaciones de Entregables:',
                options: [
                    { value: 'delete_acid', label: 'Eliminar Entregable con Transaccion ACID' },
                    { value: 'back', label: 'Volver' }
                ]
            });

            if (isCancel(action) || action === 'back') break;

            if (action === 'delete_acid') await this.deleteDeliverableWithTransaction();
        }
    }

    async deleteDeliverableWithTransaction() {
        UI.displayHeader('> Modo Freelancer > Gestion de Entregables > Eliminacion Atomica ACID');

        const deliverableId = await this.selectDeliverableInteractive();
        if (!deliverableId) return;

        const confirmDelete = await confirm({
            message: `¿Está seguro de ejecutar la eliminación atómica del entregable ID #${deliverableId}?`
        });
        if (!confirmDelete || isCancel(confirmDelete)) return;

        const client = Database.getClient();
        const session = client.startSession();

        let statusText = '';
        let reasonText = '';
        let isSuccess = false;

        const spinner = UI.createSpinner('Ejecutando sesión de transacción atómica ACID...').start();

        try {
            session.startTransaction();

            const deleteResult = await this.deliverablesCollection.deleteOne(
                { _id: new ObjectId(deliverableId) },
                { session }
            );

            if (deleteResult.deletedCount === 1) {
                await session.commitTransaction();
                isSuccess = true;
                statusText = chalk.green('[ COMMIT / ELIMINACION EXITOSA ]');
                reasonText = 'Entregable y referencias desvinculadas correctamente';
                spinner.succeed(chalk.green(`${UI.symbols.success} Transacción atómica completada.`));
            } else {
                await session.abortTransaction();
                isSuccess = false;
                statusText = chalk.red('[ ABORTED / ROLLBACK EJECUTADO ]');
                reasonText = 'Entregable no encontrado o ya desvinculado';
                spinner.fail(chalk.yellow(`${UI.symbols.warning} Transacción abortada. Aplicando Rollback.`));
            }
        } catch (error) {
            await session.abortTransaction();
            isSuccess = false;
            statusText = chalk.red('[ ABORTED / ROLLBACK ERROR ]');
            reasonText = `Excepción en DB: ${error.message}`;
            spinner.fail(chalk.red(`${UI.symbols.error} Error crítico en transacción.`));
        } finally {
            await session.endSession();
        }

        const ticketContent = [
            chalk.bold.cyan('RESULTADO DE OPERACION ATOMICA (TRANSACTION SESSION)'),
            '─'.repeat(58),
            `Status:      ${statusText}`,
            `Operaciones: Eliminación de Entregable #${deliverableId.substring(0, 10)}...`,
            `Razón:       ${reasonText}`,
            `Integridad:  ${isSuccess ? chalk.green('[ BASE DE DATOS ACTUALIZADA ]') : chalk.yellow('[ BASE DE DATOS PROTEGIDA SIN CAMBIOS ]')}`
        ].join('\n');

        console.log(
            boxen(ticketContent, {
                padding: 1,
                margin: { top: 1, bottom: 1 },
                borderStyle: 'round',
                borderColor: isSuccess ? 'green' : 'red'
            })
        );

        await text({ message: 'Presione ENTER para continuar...' });
    }

    // SUBMÓDULO: GESTIÓN FINANCIERA

    async financesSubMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Gestion Financiera');

            const action = await select({
                message: 'Operaciones Financieras:',
                options: [
                    { value: 'balance', label: 'Balance Financiero por Cliente' },
                    { value: 'back', label: 'Volver' }
                ]
            });

            if (isCancel(action) || action === 'back') break;

            if (action === 'balance') await this.calculateBalanceByClient();
        }
    }

    async calculateBalanceByClient() {
        UI.displayHeader('> Modo Freelancer > Gestion Financiera > Balance Financiero');

        const clientId = await this.selectClientInteractive();
        if (!clientId) return;

        const spinner = UI.createSpinner('Calculando balance financiero del cliente...').start();

        const client = await this.clientsCollection.findOne({ _id: new ObjectId(clientId) });
        const transactions = await this.financesCollection.find({ clientId: new ObjectId(clientId) }).toArray();

        let totalIncome = 0;
        let totalExpense = 0;

        transactions.forEach(t => {
            const amount = Number(t.amount) || 0;
            if (t.type === 'ingreso') totalIncome += amount;
            if (t.type === 'egreso') totalExpense += amount;
        });

        const netBalance = totalIncome - totalExpense;
        spinner.stop();

        const formattedIncome = chalk.green(`+$${totalIncome.toFixed(2)}`);
        const formattedExpense = chalk.red(`-$${totalExpense.toFixed(2)}`);
        const formattedBalance = netBalance >= 0 
            ? chalk.bold.green(`+$${netBalance.toFixed(2)}`) 
            : chalk.bold.red(`-$${Math.abs(netBalance).toFixed(2)}`);

        const cardContent = [
            chalk.bold.cyan('TARJETA DE BALANCE FINANCIERO'),
            '─'.repeat(45),
            `Cliente:          ${chalk.bold(client?.name || 'Cliente N/A')}`,
            `Email:            ${client?.email || 'N/A'}`,
            '─'.repeat(45),
            `Total Ingresos:   ${formattedIncome}`,
            `Total Egresos:    ${formattedExpense}`,
            '─'.repeat(45),
            `Balance Neto:     ${formattedBalance}`
        ].join('\n');

        console.log(
            boxen(cardContent, {
                padding: 1,
                margin: { top: 1, bottom: 1 },
                borderStyle: 'double',
                borderColor: 'cyan'
            })
        );

        await text({ message: 'Presione ENTER para continuar...' });
    }
}