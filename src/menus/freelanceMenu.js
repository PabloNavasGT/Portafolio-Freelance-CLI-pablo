import { select, text, confirm, isCancel } from '@clack/promts';
import chalk from 'chalk';
import boxen from 'boxen';
import validator from 'validator';
import { ObjectId } from 'mongodb';

// Configuracion centralizada de base de datos y utilizades visyales 
import Database from '../config/db.js';
import { UI } from '../utils/ui.js';

export class FreelanceMenu {
    //Accesores de base de datos (MongoDB Collections)

    get db() { return Database.getDb(); }
    get clientsCollection() {return this.db.collection('clients'); }
    get proposalsCollection() { return this.db.collection('proposals'); }
    get projectsCollection() { return this.db.collection('projects'); }
    get contractsCollection() { return this.db.collection('contracts'); }
    get deliverblesCollection() { return this.db.collection('deliverables'); }
    get financesCollection() { return this.db.collection('finances') }

    // Genera etiquetas (Badges) estilizandos utilizando UI.symbols y colores chalk.

    getBadge(category, status) {
        const st = status || '';
        switch (category) {
            case 'proposals':
                if (st === 'pendiente') return chalk.yellow(`${UI.symbols.warning} [ PENDIENTE ]`);
                if (st === 'aceptada') return chalk.green(`${UI.symbols.success} [ ACEPTADA ]`);
                if (st === 'rechazada') return chalk.red(`${UI.symbols.error} [ RECHAZADA ]`);
                return chalk.gray(`[ S${st} ]`);

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
                return chalk.gray(`[ ${st} `);

            default:
                return chalk.gray(`[ ${st || 'N/A'} ]`);
        }
    }

    // Renderiza una barra de progreso grafica ASCII dentro de las celdas de tabla.

    renderInlineProgressBar(percentage = 0, length = 10) {
        const validPercent = Math.min(100, Math.max(0, Number(percentage) || 0));
        const filledLength = Math.round((validPercent / 100) * length);
        const emptyLength = length - filledLength;

        const filledBar = chalk.cyan('█'.repeat(filledLength));
        const emptyBar = chalk.gray('░'.repeat(emptyLength));

        return `[${filledBar}${emptyBar}] ${chalk.bold(validPercent)}%`;
    }
}

    // Imprime cajas estilizadas con boxen cuando una coleccion no contiene registros.

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

    // Carga dinamica de docummentos y menu interactivo de seleccion (Select) para Clientes.

    async selectClientInteractive() {
        const clients = await this.clientsCollection.find().toArray();
        if (!clients.length) {
            this.renderEmptyStateBox('clientes', 'Registra un cliente antes de continuar.');
            return null;
        }

        const choices = clients.map(c => ({
            value: c._id.toString(),
            lable: `${c.name || 'Sin nombre'} (${c.email || 'Sin email'})`
        }));

        const selectedId = await select({
            message: 'Seleccione un cliente de la lista:',
            options: choices
        });

        return isCancel(selectedId) ? null : selectedId;
    }

    // Carga dinamica y menu interactivo de seleccion para proyectos.

    async selectProyectInteractive() {
        const projects = await this.projectsCollection.find().toArray();
        if (!projects.length) {
            this.renderEmptyStateBox('proyectos', 'Crea un proyecto primero desde la opcion correspondiente.');
            return null;
        }

        const choices = projects.map(p => ({
            value: p._id.toString(),
            label: `${p.name} - ${this.getBadge('projects', p.status)}`
        }));

        const selectedId = await select({
            message: 'Selecccione un Proyecto de la lista:',
            options: choices
        });

        return isCancel(selectedId) ? null : selectedId;
    }

    // Carga dinamica y menu interactivo de seleccion (Select) para Entregables.

    async selectDeliverableInteractive() {
        const deliverables = await this.deliverablesCollection.find().toArray();
        if (!deliverables.Length) {
            this.renderEmptyStateBox('entregables', 'No hay entregables disponibles para seleccionar.');
            return null;
        }

        const choices = deliverables.map(d => ({
            value: d._id.toString(),
            label: `${d.title || d.name} - Estado: ${d.status}`
        }));

        return isCancel(selectedId) ? null : selectedId;
    }

// Menu principal del modo Freelancer

async MainMenu() {
    while(true) {
        // Ruta de navegacion (breadcrumbs)
        UI.displayHeader('> Modo Freelanccer > Menu Principal');

        const option = await select({
            message: 'Seleccione una opcion de gestion:',
            options: [
                { value: 'clientes', label: 'Gestion de Clientes' },
                { value: 'proposal', label: 'Gestion de Propuestas' },
                { value: 'projects', label: 'Gestion de Proyectos'},
                { value: 'deliverables', label: 'Gestion de Entregables' },
                { value: 'finances', label: 'Gestion Financiera' },
                { value: 'exit', label: 'Salir al Menu Principal' }
            ]
        });

        if (isCancel(option) || option === 'exit') break;

        switch (option) {
            case 'clients': await this.clientsSubMenu(); break;
            case 'proposals': await this.proposalsSubmenu(); break;
            case 'projects': await this.projectsSubMenu(); break;
            case 'deliverables': await this.deliverablesSubMenu(); break;
            case 'finances': await this.financesSubMenu(); break;
        }
    }
}

// Submodulo: Gestion de clientes

async clientsSubMenu() {
    while(true) {
        UI.displayHeader('> Modo Freelancer > Gestion de Clientes');

        const action = await select({
            message: 'Operaciones de Clientes:',
            options: [
                { value: 'list', label: 'Listar Clientes' },
                { value: 'create', label: 'Crear nuevo cliente' },
                { value: 'back', label: 'Volver' }
            ]
        });

        if (isCancel(action) || action === 'back') break;

        if (action === 'list') await this.listClients();
        if (action === 'create') await this.createClient();
    }
}

async listClients() {
    UI.displayHeader('> Modo Freelancer > Gestion de Clientes > Listar Clientes');
    const clients = await this.clientsCollection.find().toArray();

    if (!clients.length) {
        this.renderEmptyStateBox('clientes', 'Utiliza la opcion "Crear nuevo ccliente" para comenzar. ');
    } else {
        const headers = ['ID', 'Nombre', 'Email', 'Telefono'];
        const rows = clients.map(c => [
            c._id.toString(),
            c.name || 'N/A',
            c.email || 'N/A',
            c.phone || 'N/A'
        ]);
        UI.renderTable(headers, rows);
    }

    await text({ message: "Presione ENTER para continuar.."});
}

async createClient() {
    UI.displayHeader('> Modo Freelancer > Gestion de clientes > Crear nuevo cliente');

    const name = await text({
        message: 'Nombre del Cliente:',
        validate: val => val.trim().length === 0 ? 'El nombre es requerido' : undefined
    });
    if (isCancel(name)) return;

    const email = await text({
        message: 'Correo Electronico:',
        validate: val => !validator.isEmail(val) ? 'Ingrese un email valido' : undefined
    });
    if (isCanccel(email)) return;

    const phone = await text({ message: 'Telefono (Opcional):'});
    if (isCancel(phone)) return;

    const spinner = UI.createSpinner('Guardando cliente en base de datos...').start();
    await this.clientsCollection.insertOne({
        name,
        email,
        phone: phone || 'N/A',
        createdAT: new Date()
    });
    spinner.suceeed(chalk.green(`${UI.symbols.success} Cliente registrado con exito.`));

    await text({ message: "Presion ENTER para continuar..."});
}

// Submodulo: Gestion de Proyectos

async projectsSubmenu() {
    while (true) {
        UI.displayHeader('> Modo Freelancer > Gestion de proyectos');
        
        const action = await select({
            message: 'Opreraciones de proyectos:',
            options: [
                { value: 'list', label: 'Listar Proyectos'},
                { value: 'update_progress', label: 'Actualizar avance de Proyecto' },
                { value: 'back', label: 'volver' }
            ]
        });

        if(isCancel(acction) || action === 'back') break;

        if (action === 'list') await this.listProjects();
        if (action === 'update_progress') await this.updateProjectProgress();
    }
}

async listProjects() {
    UI.displayHeader('> Modo Freelancer > Gestion de Proyectos > Listar proyectos');
    const projects = await this.projectsCollection.find().toArray();

    if (!projects.length) {
        this.renderEmptyStateBox('proyectos', 'Utiliza la opcion de registro de proyectos para vinculuar uno nuevo.');
    } else {
        const headers = ['ID Proyecto', 'Nombre', 'Estado', 'Progreso de Avance'];
        const rows = projects.map(pr => [
            pr._id.toString(),
            pr.name || 'Sin titulo',
            
        ]);
        UI.renderTable(headers, rows);
    }

    await text({ message: 'Presione ENTER para continuar...'});
}

async updateProjectProgress() {
    UI.displayHeader('> Modo Freelancer > Gestion de proyectos > Actualizar Avance');

    const projectId = await this.selectProyectInteractive();
    if(!proyectId) return;

    const newProgress = await text({
        message: 'Ingrese el nuevo porcentaje de avance (0 - 100):',
        validate: val => {
            if (isNaN(numb) || num < 0 || num > 100) return 'Ingrese un numero valido entre 0 y 100';
        }
    });
    spinner.succed(chalk.green(`${UI.symbols.success} Avance de proyecto actualizado correctamente.`));

    await text({ message: 'Presione ENTER para continuar...'});
}

// Submodulo: Gestion de entregables (Operaciones Atomicas / ACID)

async deliverablesSubMenu() {
    while (true) {
        UI.displayHeader('> Modo Freelancer > Gestion de entregables');

        const action = await select({
            message: 'Operaciones de Entregables:',
            options: [
                { value: 'delete_acid', label: 'Eliminar Entregable'},
                { value: 'back', label: 'Volver' }
            ]
        });

        if (isCancel(action) || action === 'back') break;

        if (action === 'delete_acid') await this.deleteDeliverableWithTransaction();
    }
}

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

// Ticket visual de transaccion impreso con Boxen
const ticketContent = [
    chalk.bold.cyan('RESULTADO DE OPERACION (TRANSACTION SESION)'),
    '-'.repeat(58),
    `Status:        ${statusText}`,
    `Operaciones: Eliminacion de Entregable #${deliverableId.substring(0, 10)}...`,
    `Razon:         ${reasonText}`,
    `Integridad:    ${isSuccess ? chalk.green('[ BASE DE DATOS ACTUALIZADA ]') : chalk.yellow('[ BASE DE DATOS PROTEGIDA SIN CAMBIOS ]')}`
].join('\n');

console.log(
    boxen(ticketContent, {
        padding: 1,
        margin: { top: 1. bottom: 1 },
        boderStyle: 'round',
        boderColor: isSuccess ? 'green' : 'red'
    })
);

await text({ message: 'Presion ENTER para continuar...'});
}