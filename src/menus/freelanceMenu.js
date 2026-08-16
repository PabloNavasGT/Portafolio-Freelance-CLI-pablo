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

    // submodulo gestion de propuestas
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