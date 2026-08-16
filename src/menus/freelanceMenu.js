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

// metodo de arranque purincipal ejecutado desde el enrutador de perfiles.
async show() {
    return await this.mainMenu();
}

    
    //Genera etiquetas (Badges) estilizadas utilizando UI.symbols y colores Chalk.
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

    
    //Renderiza una barra de progreso gráfica ASCII dentro de celdas de tabla.
    renderInlineProgressBar(percentage = 0, length = 10) {
        const validPercent = Math.min(100, Math.max(0, Number(percentage) || 0));
        const filledLength = Math.round((validPercent / 100) * length);
        const emptyLength = length - filledLength;

        const filledBar = chalk.cyan('█'.repeat(filledLength));
        const emptyBar = chalk.gray('░'.repeat(emptyLength));

        return `[${filledBar}${emptyBar}] ${chalk.bold(validPercent)}%`;
    }

    
    //Imprime cajas estilizadas con boxen cuando una colección no contiene registros.
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

    
    //Carga dinámica de documentos y menú interactivo de selección (Select) para Clientes.
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

    
    //Carga dinámica y menú interactivo de selección (Select) para Proyectos
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

    
    //Carga dinámica y menú interactivo de selección (Select) para Entregables.
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

    //Menú Principal del Modo Freelancer
    
    async mainMenu() {
        while (true) {
            // Ruta de Navegación (Breadcrumbs)
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

    // submodulo: gestion de clientes
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
            validate: val => val.trim().length === 0 ? 'El nombre es requerido' : undefined
        });
        if (isCancel(name)) return;

        const email = await text({
            message: 'Correo Electrónico:',
            validate: val => !validator.isEmail(val) ? 'Ingrese un email válido' : undefined
        });
        if (isCancel(email)) return;

        const phone = await text({ message: 'Teléfono (Opcional):' });
        if (isCancel(phone)) return;

        const spinner = UI.createSpinner('Guardando cliente en base de datos...').start();
        await this.clientsCollection.insertOne({
            name,
            email,
            phone: phone || 'N/A',
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
            validate: val => (val.trim() && !validator.isEmail(val)) ? 'Ingrese un email válido' : undefined
        });
        if (isCancel(email)) return;

        const phone = await text({ message: 'Nuevo Teléfono (Dejar en blanco para mantener actual):' });
        if (isCancel(phone)) return;

        const updateData = {};
        if (name.trim()) updateData.name = name.trim();
        if (email.trim()) updateData.email = email.trim();
        if (phone.trim()) updateData.phone = phone.trim();

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

    async proposalsSubMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Gestion de Propuestas');

            const action = await select({
                message: 'Operaciones de Propuestas:',
                options: [
                    { value: 'list', label: 'Listar Propuestas' },
                    { value: 'back', label: 'Volver' }
                ]
            });

            if (isCancel(action) || action === 'back') break;

            if (action === 'list') await this.listProposals();
        }
    }

    async listProposals() {
        UI.displayHeader('> Modo Freelancer > Gestion de Propuestas > Listar Propuestas');
        const proposals = await this.proposalsCollection.find().toArray();

        if (!proposals.length) {
            this.renderEmptyStateBox('propuestas', 'No existen propuestas registradas actualmente.');
        } else {
            const headers = ['ID', 'Título / Nombre', 'Estado'];
            const rows = proposals.map(pr => [
                pr._id.toString(),
                pr.title || pr.name || 'Sin título',
                this.getBadge('proposals', pr.status)
            ]);
            UI.renderTable(headers, rows);
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    // submodulo: gestion de proyectos
    async projectsSubMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Gestion de Proyectos');

            const action = await select({
                message: 'Operaciones de Proyectos:',
                options: [
                    { value: 'list', label: 'Listar Proyectos (Con Progreso Visual)' },
                    { value: 'update_progress', label: 'Actualizar Avance de Proyecto' },
                    { value: 'back', label: 'Volver' }
                ]
            });

            if (isCancel(action) || action === 'back') break;

            if (action === 'list') await this.listProjects();
            if (action === 'update_progress') await this.updateProjectProgress();
        }
    }

    async listProjects() {
        UI.displayHeader('> Modo Freelancer > Gestion de Proyectos > Listar Proyectos');
        const projects = await this.projectsCollection.find().toArray();

        if (!projects.length) {
            this.renderEmptyStateBox('proyectos', 'Utiliza la opción de registro de proyectos para vincular uno nuevo.');
        } else {
            const headers = ['ID Proyecto', 'Nombre', 'Estado', 'Progreso de Avance'];
            const rows = projects.map(pr => [
                pr._id.toString(),
                pr.name || 'Sin título',
                this.getBadge('projects', pr.status),
                this.renderInlineProgressBar(pr.progress || 0, 12)
            ]);
            UI.renderTable(headers, rows);
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async updateProjectProgress() {
        UI.displayHeader('> Modo Freelancer > Gestion de Proyectos > Actualizar Avance');

        const projectId = await this.selectProjectInteractive();
        if (!projectId) return;

        const newProgress = await text({
            message: 'Ingrese el nuevo porcentaje de avance (0 - 100):',
            validate: val => {
                const num = Number(val);
                if (isNaN(num) || num < 0 || num > 100) return 'Ingrese un número válido entre 0 y 100';
            }
        });
        if (isCancel(newProgress)) return;

        const spinner = UI.createSpinner('Actualizando estado del proyecto...').start();
        await this.projectsCollection.updateOne(
            { _id: new ObjectId(projectId) },
            { $set: { progress: Number(newProgress), updatedAt: new Date() } }
        );
        spinner.succeed(chalk.green(`${UI.symbols.success} Avance de proyecto actualizado correctamente.`));

        await text({ message: 'Presione ENTER para continuar...' });
    }

    // submodulo: gestion de entregables

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

        // Ticket visual de transacción impreso con Boxen
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

    // submodulo: gestion financiera
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

        // Tarjeta resumen formateada con Boxen
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