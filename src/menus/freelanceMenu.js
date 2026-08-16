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
                    { value: 'contracts', label: 'Gestion de Contratos' },
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
                case 'contracts': await this.contractsSubMenu(); break
                case 'finances': await this.financesSubMenu(); break;
            }
        }
    }

    // SUBMÓDULO: GESTIÓN DE CLIENTES

async contractsSubMenu() {
    while (true) {
        UI.displayHeader('> Modo Freelancer > Gestion de contratos');

        const action = await select({
            message: 'Operaciones de Contratos:',
            options: [
                { value: 'list', label: 'Listar Contratos y Detalles' },
                { value: 'create', label: 'Crear Nuevo contrato' },
                { value: 'update', label: 'Actualizar Contrato / Estado' },
                { value: 'delete', label: 'Eliminar Contrato' },
                { value: 'back', label: 'Volver' }
            ]
        });

        if (isCancel(action) || action === 'back') break;

        if (action === 'list') await this.listContracts();
        if (action === 'create') await this.createContract();
        if (action === 'update') await this.updateContract();
        if (action === 'delete') await this.deleteContract();
    }
}

async selectContractInteractive() {
    const contracts = await this.contractsCollection.find().toArray();
    if (!contracts.length) return null;

    const choices = [
        { value: 'none', label: 'Sin contrato vinculado' },
        ...contracts.map(c => ({
            value: c._id.toString(),
            label: `[${c.code}] ${c.title || 'Sin titulo'}`
        }))
    ];

    const selectedId = await select({
        message: 'Seleccione un Contrato para vincular:',
        options: choices
    });

    if (isCancel(selectedId) || selectedId === 'none') return null;
    return selectedId;
}

async listContracts() {
    UI.displayHeader('> Modo Freelancer > Gestion de contratos > Listar contratos');
    const contracts = await this.contractsCollection.find().toArray();

    if (!contracts.length) {
        this.renderEmptyStateBox('contratos', 'No hay contratos registrados.');
        await text({ message: 'Presione ENTER para continuar...' });
        return;
    }

    const projects = await this.projectsCollection.find().toArray();
    const projectMap = new Map(projects.map(p => [p._id.toString(), p.name]));

    const headers = ['ID', 'Título', 'Proyecto', 'Valor Total', 'Inicio', 'Fin', 'Estado'];

    const rows = contracts.map(c => {
        const projectName = c.projectId ? (projectMap.get(c.projectId.toString()) || 'No encontrado') : 'Sin proyecto';
        const formattedValue = c.totalValue ? `$${Number(c.totalValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00';
        const startDate = c.startDate ? new Date(c.startDate).toLocaleDateString() : 'N/A';
        const endDate = c.endDate ? new Date(c.endDate).toLocaleDateString() : 'N/A';

        return [
            c.code || 'C-000',
            c.title || 'Sin titulo',
            projectName,
            formattedValue,
            startDate,
            endDate,
            this.getBadge('contracts', c.status)
        ];
    });

    UI.renderTable(headers, rows);
    await text({ message: 'Presione ENTER para continuar...' });
}

async createContract() {
    UI.displayHeader('> Modo Freelancer > Gestion de Contratos > Crear Contrato');

    const projectId = await this.selectProjectInteractive();

    const title = await text({
        message: 'Titulo o asunto del Contrato:',
        validate: val => (!val || val.trim().length === 0) ? 'El titulo es requerido' : undefined
    });
    if (isCancel(title)) return;

    const conditions = await text({
        message: 'Condiciones / Alcance del contrato:'
    });
    if (isCancel(conditions)) return;

    const totalValue = await text({
        message: 'Valor total acordado ($):',
        validate: val => {
            const num = Number(val);
            if (isNaN(num) || num < 0) return 'Ingrese un monto numerico valido';
        }
    });
    if (isCancel(totalValue)) return;

    const startDate = await text({
        message: 'Fecha de inicio (YYYY-MM-DD) [ENTER para hoy]:'
    });
    if (isCancel(startDate)) return;

    const endDate = await text({
        message: 'Fecha estimada de fin (YYYY-MM-DD):',
        validate: val => (!val || val.trim().length === 0) ? 'La fecha de fin es requerida' : undefined
    });
    if (isCancel(endDate)) return;

    const status = await select({
        message: 'Estado inicial del contrato:',
        options: [
            { value: 'activo', label: 'Activo' },
            { value: 'pendiente', label: 'Pendiente de firma' },
            { value: 'finalizado', label: 'Finalizado' },
            { value: 'cancelado', label: 'Cancelado' }
        ]
    });
    if (isCancel(status)) return;

    const spinner = UI.createSpinner('Generando contrato y asignando ID...').start();

    const count = await this.contractsCollection.countDocuments();
    const customCode = `C-${String(count + 1).padStart(3, '0')}`;

    const newContract = {
        code: customCode,
        title: title.trim(),
        conditions: conditions?.trim() || '',
        totalValue: Number(totalValue),
        startDate: startDate?.trim() ? new Date(startDate.trim()) : new Date(),
        endDate: new Date(endDate.trim()),
        projectId: projectId ? new ObjectId(projectId) : null,
        status,
        createdAt: new Date()
    };

    const result = await this.contractsCollection.insertOne(newContract);
    
    // Si se vinculó a un proyecto, sincronizamos la referencia en la colección de proyectos
    if (projectId) {
        await this.projectsCollection.updateOne(
            { _id: new ObjectId(projectId) },
            { $set: { contractId: result.insertedId } }
        );
    }

    spinner.succeed(chalk.green(`${UI.symbols.success} Contrato registrado exitosamente con codigo ${chalk.bold(customCode)}`));
    await text({ message: 'Presione ENTER para continuar...' });
}

async updateContract() {
    UI.displayHeader('> Modo Freelancer > Gestion de contratos > Actualizar Contrato');

    const contractId = await this.selectContractInteractive();
    if (!contractId) return;

    const contract = await this.contractsCollection.findOne({ _id: new ObjectId(contractId) });
    if (!contract) return;

    const title = await text({
        message: `Nuevo titulo (Actual: "${contract.title}") [ENTER para mantener]:`
    });
    if (isCancel(title)) return;

    const totalValue = await text({
        message: `Nuevo valor total (Actual: $${contract.totalValue}) [ENTER para mantener]:`,
        validate: val => {
            if (val && val.trim() !== '') {
                const num = Number(val);
                if (isNaN(num) || num < 0) return 'Ingrese un monto numerico valido';
            }
        }
    });
    if (isCancel(totalValue)) return;

    const status = await select({
        message: `Estado del contrato (Actual: ${contract.status}):`,
        options: [
            { value: 'activo', label: 'Activo' },
            { value: 'pendiente', label: 'Pendiente de firma' },
            { value: 'finalizado', label: 'Finalizado' },
            { value: 'cancelado', label: 'Cancelado' }
        ]
    });
    if (isCancel(status)) return;

    const updateData = { status, updatedAt: new Date() };
    if (title && title.trim()) updateData.title = title.trim();
    if (totalValue && totalValue.trim()) updateData.totalValue = Number(totalValue);

    const spinner = UI.createSpinner('Actualizando contrato...').start();
    await this.contractsCollection.updateOne(
        { _id: new ObjectId(contractId) },
        { $set: updateData }
    );
    spinner.succeed(chalk.green(`${UI.symbols.success} Contrato [${contract.code}] actualizado con exito.`));

    await text({ message: 'Presione ENTER para continuar...' });
}

async deleteContract() {
    UI.displayHeader('> Modo Freelancer > Gestion de contratos > Eliminar contrato');

    const contractId = await this.selectContractInteractive();
    if (!contractId) return;

    const contract = await this.contractsCollection.findOne({ _id: new ObjectId(contractId) });
    if (!contract) return;

    const confirmDelete = await confirm({
        message: `¿Está seguro de que desea eliminar el contrato ${contract.code}?`
    });
    if (!confirmDelete || isCancel(confirmDelete)) return;

    const spinner = UI.createSpinner('Eliminando contrato y desvinculando referencias...').start();

    // Desvincular de cualquier proyecto asociado
    await this.projectsCollection.updateMany(
        { contractId: new ObjectId(contractId) },
        { $set: { contractId: null } }
    );

    await this.contractsCollection.deleteOne({ _id: new ObjectId(contractId) });
    spinner.succeed(chalk.green(`${UI.symbols.success} Contrato [${contract.code}] eliminado con exito.`));

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

// Submodulo: Gestion de contratos

async listContracts() {
    UI.displayHeader('> Modo Freelancer > Gestion de contratos > Listar contratos');
    const contracts = await this.contractsCollection.find().toArray();

    if (!contracts.length) {
        this.renderEmptyStateBox('contratos', 'No hay contratos registrados.');
        await text({ message: 'Presione ENTER para continuar...' });
        return;
    }

    const projects = await this.projectsCollection.find().toArray();
    const projectMap = new Map(projects.map(p => [p._id.toString(), p.name]));

    // Definición de las cabeceras de la tabla
    const headers = ['ID', 'Título', 'Proyecto', 'Valor Total', 'Inicio', 'Fin', 'Estado'];

    const rows = contracts.map(c => {
        const projectName = c.projectId ? (projectMap.get(c.projectId.toString()) || 'No encontrado') : 'Sin proyecto';
        const formattedValue = c.totalValue ? `$${Number(c.totalValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00';
        const startDate = c.startDate ? new Date(c.startDate).toLocaleDateString() : 'N/A';
        const endDate = c.endDate ? new Date(c.endDate).toLocaleDateString() : 'N/A';

        return [
            c.code || 'C-000',
            c.title || 'Sin titulo',
            projectName,
            formattedValue,
            startDate,
            endDate,
            this.getBadge('contracts', c.status)
        ];
    });

    UI.renderTable(headers, rows);
    await text({ message: 'Presione ENTER para continuar...' });
}

// SUBMÓDULO: GESTIÓN DE ENTREGABLES

async deliverablesSubMenu() {
    while (true) {
        UI.displayHeader('> Modo Freelancer > Gestión de Entregables');

        const action = await select({
            message: 'Operaciones de Entregables:',
            options: [
                { value: 'list', label: 'Listar Entregables' },
                { value: 'create', label: 'Crear Entregable' },
                { value: 'update_status_acid', label: 'Cambiar Estado con Transacción ACID (Rollback)' },
                { value: 'delete_acid', label: 'Eliminar Entregable con Transacción ACID' },
                { value: 'back', label: 'Volver' }
            ]
        });

        if (isCancel(action) || action === 'back') break;

        if (action === 'list') await this.listDeliverables();
        if (action === 'create') await this.createDeliverable();
        if (action === 'update_status_acid') await this.updateStatusWithTransaction();
        if (action === 'delete_acid') await this.deleteDeliverableWithTransaction();
    }
}

async selectDeliverableInteractive() {
    const deliverables = await this.deliverablesCollection.find().toArray();
    if (!deliverables.length) {
        this.renderEmptyStateBox('entregables', 'No hay entregables registrados.');
        await text({ message: 'Presione ENTER para continuar...' });
        return null;
    }

    const choices = deliverables.map(d => ({
        value: d._id.toString(),
        label: `${d.title} [${d.status.toUpperCase()}] - Límite: ${d.dueDate ? new Date(d.dueDate).toLocaleDateString() : 'N/A'}`
    }));

    const selectedId = await select({
        message: 'Seleccione un Entregable:',
        options: choices
    });

    if (isCancel(selectedId)) return null;
    return selectedId;
}

async listDeliverables() {
    UI.displayHeader('> Modo Freelancer > Gestión de Entregables > Listar Entregables');
    const deliverables = await this.deliverablesCollection.find().toArray();

    if (!deliverables.length) {
        this.renderEmptyStateBox('entregables', 'No hay entregables registrados.');
        await text({ message: 'Presione ENTER para continuar...' });
        return;
    }

    const projects = await this.projectsCollection.find().toArray();
    const projectMap = new Map(projects.map(p => [p._id.toString(), p.name]));

    const headers = ['ID', 'Entregable', 'Proyecto', 'Fecha Límite', 'Estado'];

    const rows = deliverables.map((d, index) => {
        const projectName = d.projectId ? (projectMap.get(d.projectId.toString()) || 'Sin proyecto') : 'Sin proyecto';
        const dueDate = d.dueDate ? new Date(d.dueDate).toLocaleDateString() : 'N/A';

        return [
            `E-${String(index + 1).padStart(3, '0')}`,
            d.title || 'Sin título',
            projectName,
            dueDate,
            this.getBadge('deliverables', d.status)
        ];
    });

    UI.renderTable(headers, rows);
    await text({ message: 'Presione ENTER para continuar...' });
}

async createDeliverable() {
    UI.displayHeader('> Modo Freelancer > Gestión de Entregables > Crear Entregable');

    const projectId = await this.selectProjectInteractive();
    if (!projectId) return;

    const title = await text({
        message: 'Título del Entregable:',
        validate: val => (!val || val.trim().length === 0) ? 'El título es requerido' : undefined
    });
    if (isCancel(title)) return;

    const dueDate = await text({
        message: 'Fecha límite (YYYY-MM-DD):',
        validate: val => (!val || val.trim().length === 0) ? 'La fecha límite es requerida' : undefined
    });
    if (isCancel(dueDate)) return;

    const status = await select({
        message: 'Estado inicial:',
        options: [
            { value: 'pendiente', label: 'Pendiente' },
            { value: 'entregado', label: 'Entregado' },
            { value: 'aprobado', label: 'Aprobado' },
            { value: 'rechazado', label: 'Rechazado' }
        ]
    });
    if (isCancel(status)) return;

    const spinner = UI.createSpinner('Guardando entregable...').start();

    const newDeliverable = {
        title: title.trim(),
        projectId: new ObjectId(projectId),
        dueDate: new Date(dueDate.trim()),
        status,
        createdAt: new Date()
    };

    await this.deliverablesCollection.insertOne(newDeliverable);
    spinner.succeed(chalk.green(`${UI.symbols.success} Entregable creado exitosamente.`));

    await text({ message: 'Presione ENTER para continuar...' });
}

async updateStatusWithTransaction() {
    UI.displayHeader('> Modo Freelancer > Gestión de Entregables > Cambio de Estado ACID');

    const deliverableId = await this.selectDeliverableInteractive();
    if (!deliverableId) return;

    const deliverable = await this.deliverablesCollection.findOne({ _id: new ObjectId(deliverableId) });
    if (!deliverable) return;

    const newStatus = await select({
        message: `Estado actual: ${deliverable.status.toUpperCase()}. Seleccione nuevo estado:`,
        options: [
            { value: 'pendiente', label: 'Pendiente' },
            { value: 'entregado', label: 'Entregado' },
            { value: 'aprobado', label: 'Aprobado' },
            { value: 'rechazado', label: 'Rechazado' }
        ]
    });
    if (isCancel(newStatus) || newStatus === deliverable.status) return;

    const client = Database.getClient();
    const session = client.startSession();

    let statusText = '';
    let reasonText = '';
    let isSuccess = false;

    const spinner = UI.createSpinner('Ejecutando transacción atómica de actualización...').start();

    try {
        session.startTransaction();

        const updateResult = await this.deliverablesCollection.updateOne(
            { _id: new ObjectId(deliverableId) },
            { $set: { status: newStatus, updatedAt: new Date() } },
            { session }
        );

        if (updateResult.modifiedCount === 1) {
            await session.commitTransaction();
            isSuccess = true;
            statusText = chalk.green('[ COMMIT / ACTUALIZACIÓN EXITOSA ]');
            reasonText = `Estado cambiado exitosamente de ${deliverable.status} a ${newStatus}`;
            spinner.succeed(chalk.green(`${UI.symbols.success} Transacción atómica completada.`));
        } else {
            await session.abortTransaction();
            isSuccess = false;
            statusText = chalk.red('[ ABORTED / ROLLBACK EJECUTADO ]');
            reasonText = 'No se pudo actualizar el registro en la base de datos';
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
        chalk.bold.cyan('RESULTADO DE OPERACIÓN ATÓMICA (TRANSACTION SESSION)'),
        '─'.repeat(58),
        `Status:      ${statusText}`,
        `Operación:   Cambio de Estado Entregable #${deliverableId.substring(0, 10)}...`,
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

async deleteDeliverableWithTransaction() {
    UI.displayHeader('> Modo Freelancer > Gestion de Entregables > Eliminación Atómica ACID');

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
            statusText = chalk.green('[ COMMIT / ELIMINACIÓN EXITOSA ]');
            reasonText = 'Entregable eliminado correctamente';
            spinner.succeed(chalk.green(`${UI.symbols.success} Transacción atómica completada.`));
        } else {
            await session.abortTransaction();
            isSuccess = false;
            statusText = chalk.red('[ ABORTED / ROLLBACK EJECUTADO ]');
            reasonText = 'Entregable no encontrado';
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
        chalk.bold.cyan('RESULTADO DE OPERACIÓN ATÓMICA (TRANSACTION SESSION)'),
        '─'.repeat(58),
        `Status:      ${statusText}`,
        `Operación:   Eliminación de Entregable #${deliverableId.substring(0, 10)}...`,
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