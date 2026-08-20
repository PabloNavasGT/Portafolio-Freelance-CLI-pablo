import { ObjectId } from 'mongodb';
import { select, text, confirm, isCancel, password } from '@clack/prompts';
import chalk from 'chalk';
import boxen from 'boxen';
import validator from 'validator';

import dayjs from 'dayjs';
import Table from 'cli-table3';
import ora from 'ora';

import Database from '../config/db.js';
import { UI } from '../utils/ui.js';

import Client from '../models/Client.js';
import Contract from '../models/Contract.js';
import Deliverable from '../models/Deliverable.js';
import Project from '../models/Project.js';
import Proposal from '../models/Proposal.js';
import Transaction from '../models/Transaction.js';

import ClientRepository from '../repositories/clientRepository.js';
import ProjectRepository from '../repositories/projectRepository.js';
import ProposalRepository from '../repositories/proposalRepository.js';
import FinanceRepository from '../repositories/financeRepository.js';
import { generateNextId } from '../utils/idGenerator.js';
import AppValidator from '../utils/validators.js';

export class FreelanceMenu {
    constructor() {
        this.clientRepo = new ClientRepository();
        this.projectRepo = new ProjectRepository();
        this.proposalRepo = new ProposalRepository();
        this.financeRepo = new FinanceRepository();
    }

    get db() { return Database.getDb(); }
    get clientsCollection() { return this.db.collection('clients'); }
    get proposalsCollection() { return this.db.collection('proposals'); }
    get projectsCollection() { return this.db.collection('projects'); }
    get contractsCollection() { return this.db.collection('contracts'); }
    get deliverablesCollection() { return this.db.collection('deliverables'); }
    get financesCollection() { return this.db.collection('finances'); }

    getBadge(category, status) {
        const st = status || '';
        switch (category) {
            case 'proposals':
                if (st === 'pendiente') return chalk.yellow(`[ PENDIENTE ]`);
                if (st === 'aceptada') return chalk.green(`[ ACEPTADA ]`);
                if (st === 'rechazada') return chalk.red(`[ RECHAZADA ]`);
                return chalk.gray(`[ ${st.toUpperCase()} ]`);
            case 'contracts':
                if (st === 'activo') return chalk.green(`[ ACTIVO ]`);
                if (st === 'pendiente') return chalk.yellow(`[ PENDIENTE ]`);
                if (st === 'finalizado') return chalk.blue(`[ FINALIZADO ]`);
                if (st === 'cancelado') return chalk.red(`[ CANCELADO ]`);
                return chalk.gray(`[ ${st.toUpperCase()} ]`);
            case 'projects':
                if (st === 'activo') return chalk.green(`[ ACTIVO ]`);
                if (st === 'pausado') return chalk.yellow(`[ PAUSADO ]`);
                if (st === 'completado') return chalk.blue(`[ COMPLETADO ]`);
                if (st === 'cancelado') return chalk.red(`[ CANCELADO ]`);
                return chalk.gray(`[ ${st.toUpperCase()} ]`);
            case 'deliverables':
                if (st === 'pendiente') return chalk.yellow(`[ PENDIENTE ]`);
                if (st === 'en proceso') return chalk.blue(`[ EN PROCESO ]`);
                if (st === 'completado' || st === 'aprobado') return chalk.green(`[ ${st.toUpperCase()} ]`);
                return chalk.gray(`[ ${st.toUpperCase()} ]`);
            case 'finances':
                if (st === 'ingreso') return chalk.green(`[ INGRESO ]`);
                if (st === 'egreso') return chalk.red(`[ EGRESO ]`);
                return chalk.gray(`[ ${st.toUpperCase()} ]`);
            default:
                return chalk.gray(`[ ${st.toUpperCase()} ]`);
        }
    }

    renderProgressBar(percentage = 0) {
        const p = Math.min(100, Math.max(0, percentage));
        const filled = Math.round((p / 100) * 20);
        const empty = 20 - filled;
        const bar = chalk.bold.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
        return `[${bar}] ${p}%`;
    }

    async show() {
        return await this.mainMenu();
    }

    async mainMenu() {
        while (true) {
            UI.displayHeader('> Modulo Freelancer > Menu Principal');
            await this.renderFreelanceNotificationsBanner();
            const option = await select({
                message: 'Seleccione una opcion:',
                options: [
                    { value: 'clients', label: 'Gestion de Clientes' },
                    { value: 'proposals', label: 'Gestion de Propuestas' },
                    { value: 'contracts', label: 'Gestion de Contratos' },
                    { value: 'projects', label: 'Gestion de Proyectos' },
                    { value: 'deliverables', label: 'Gestion de Entregables' },
                    { value: 'finances', label: 'Gestion Financiera' },
                    { value: 'exit', label: 'Volver al Menu Principal' }
                ]
            });

            if (isCancel(option) || option === 'exit') break;

            switch (option) {
                case 'clients':
                    await this.clientsMenu();
                    break;
                case 'proposals':
                    await this.proposalsMenu();
                    break;
                case 'contracts':
                    await this.contractsMenu();
                    break;
                case 'projects':
                    await this.projectsMenu();
                    break;
                case 'deliverables':
                    await this.deliverablesMenu();
                    break;
                case 'finances':
                    await this.financesMenu();
                    break;
            }
        }
    }

    async renderFreelanceNotificationsBanner() {
        try {
            const proposals = await this.proposalsCollection.find({ status: { $in: ['aceptada', 'rechazada'] } }).toArray();
            const deliverables = await this.deliverablesCollection.find({ status: { $in: ['aprobado', 'rechazado'] } }).toArray();
            const projects = await this.projectsCollection.find({ status: { $in: ['completado', 'rechazado'] } }).toArray();
            const payments = await this.financesCollection.find({ type: { $in: ['ingreso', 'INGRESO', 'pago'] } }).limit(5).toArray();

            const notifications = [];

            proposals.forEach(p => {
                if (p.status === 'aceptada') {
                    notifications.push(chalk.green(`[✔ ACEPTADA] Propuesta [${p._id}] "${p.title}" fue aceptada.`));
                } else if (p.status === 'rechazada') {
                    notifications.push(chalk.red(`[✖ RECHAZADA] Propuesta [${p._id}] "${p.title}". Motivo: "${p.rejectionReason || 'No especificado'}"`));
                }
            });

            deliverables.forEach(d => {
                if (d.status === 'aprobado') {
                    notifications.push(chalk.green(`[✔ APROBADO] Entregable [${d._id}] "${d.title}" fue aprobado por el cliente.`));
                } else if (d.status === 'rechazado') {
                    notifications.push(chalk.red(`[✖ RECHAZADO] Entregable [${d._id}] "${d.title}". Motivo: "${d.rejectionReason || 'Sin motivo registrado'}"`));
                }
            });

            projects.forEach(prj => {
                if (prj.status === 'completado') {
                    notifications.push(chalk.blue(`[✔ PROYECTO CERRADO] Proyecto [${prj._id}] "${prj.name}" fue aprobado final.`));
                } else if (prj.status === 'rechazado') {
                    notifications.push(chalk.red(`[✖ RECHAZADO] Proyecto [${prj._id}] "${prj.name}". Motivo: "${prj.rejectionReason || 'Sin motivo'}"`));
                }
            });

            payments.forEach(pay => {
                notifications.push(chalk.cyan(`[💰 PAGO RECIBIDO] $${parseFloat(pay.amount || 0).toFixed(2)} USD (Ref: ${pay.reference || pay.referenceCode || 'N/A'})`));
            });

            if (notifications.length > 0) {
                const cardContent = [
                    chalk.bold.cyan(' 🔔 CENTRO DE NOTIFICACIONES FREELANCER '),
                    '------------------------------------------------------------',
                    ...notifications.slice(-8)
                ].join('\n');

                console.log(
                    boxen(cardContent, {
                        padding: 1,
                        margin: { top: 1, bottom: 1 },
                        borderStyle: 'double',
                        borderColor: 'cyan'
                    })
                );
            }
        } catch (e) {
            // Manejo silencioso de errores de renderizado
        }
    }

    async clientsMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Gestion de Clientes');

            const option = await select({
                message: 'Seleccione una operacion:',
                options: [
                    { value: 'create', label: 'Registrar Nuevo Cliente' },
                    { value: 'list', label: 'Listar Todos los Clientes' },
                    { value: 'update', label: 'Actualizar Informacion del Cliente' },
                    { value: 'delete', label: 'Eliminar Cliente' },
                    { value: 'back', label: 'Volver al Menu Principal' }
                ]
            });

            if (isCancel(option) || option === 'back') break;

            switch (option) {
                case 'create':
                    await this.createClient();
                    break;
                case 'list':
                    await this.listClients();
                    break;
                case 'update':
                    await this.updateClient();
                    break;
                case 'delete':
                    await this.deleteClient();
                    break;
            }
        }
    }

    async createClient() {
        UI.displayHeader('> Modo Freelancer > Clientes > Registrar Nuevo Cliente');

        const name = await text({
            message: 'Nombre completo del cliente:',
            validate: val => (!val || val.trim().length === 0) ? 'El nombre es obligatorio' : undefined
        });
        if (isCancel(name)) return;

        const email = await text({
            message: 'Correo electronico:',
            validate: val => (!val || !validator.isEmail(val)) ? 'Ingrese un email valido' : undefined
        });
        if (isCancel(email)) return;

        const pass = await password({
            message: 'Contrasena (minimo 6 caracteres):',
            mask: '*',
            validate: val => (!val || val.length < 6) ? 'La contrasena debe tener al menos 6 caracteres' : undefined
        });
        if (isCancel(pass)) return;

        const phone = await text({ message: 'Telefono (Opcional):' });
        if (isCancel(phone)) return;

        const spinner = ora('Registrando cliente...').start();

        try {
            const existing = await this.clientsCollection.findOne({ email: email.trim().toLowerCase() });
            if (existing) {
                spinner.fail(chalk.red('El correo electronico ya esta registrado.'));
                await text({ message: 'Presione ENTER para continuar...' });
                return;
            }

            const newClientId = await generateNextId(this.clientsCollection, 'C');

            const newClient = new Client({
                id: newClientId,
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password: pass,
                phone: phone ? phone.trim() : null,
                createdAt: new Date()
            });

            await this.clientsCollection.insertOne(newClient);
            spinner.succeed(chalk.green(`Cliente registrado con exito con ID: ${newClientId}`));
        } catch (e) {
            spinner.fail(chalk.red(`Error al registrar cliente: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async listClients() {
        UI.displayHeader('> Modo Freelancer > Clientes > Listar Clientes');

        try {
            const clients = await this.clientsCollection.find().toArray();

            if (!clients || clients.length === 0) {
                console.log(boxen(chalk.yellow('[!] No hay clientes registrados.'), { padding: 1, margin: 1, borderStyle: 'round' }));
            } else {
                const table = new Table({
                    head: [chalk.cyan('ID'), chalk.cyan('Nombre'), chalk.cyan('Email'), chalk.cyan('Telefono'), chalk.cyan('Fecha Registro')],
                    colWidths: [10, 25, 30, 15, 15]
                });

                clients.forEach(c => {
                    table.push([
                        c._id || 'N/A',
                        c.name || 'Sin nombre',
                        c.email || 'N/A',
                        c.phone || 'N/A',
                        c.createdAt ? dayjs(c.createdAt).format('YYYY-MM-DD') : 'N/A'
                    ]);
                });

                console.log(table.toString());
            }
        } catch (e) {
            console.log(chalk.red(`Error al listar clientes: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async updateClient() {
        UI.displayHeader('> Modo Freelancer > Clientes > Actualizar Informacion');

        const clientId = await this.selectClientInteractive();
        if (!clientId) return;

        const clienteExistente = await this.clientsCollection.findOne({ _id: clientId });
        if (!clienteExistente) {
            console.log(chalk.red('[!] Cliente no encontrado.'));
            await text({ message: 'Presione ENTER para continuar...' });
            return;
        }

        const nameInput = await text({
            message: `Nombre completo [Actual: ${clienteExistente.name}]:`,
            placeholder: 'Presione ENTER para mantener el actual'
        });
        if (isCancel(nameInput)) return;

        const emailInput = await text({
            message: `Correo electrónico [Actual: ${clienteExistente.email}]:`,
            placeholder: 'Presione ENTER para mantener el actual',
            validate: (val) => {
                if (!val || val.trim() === '') return undefined;
                if (!validator.isEmail(val.trim())) return 'Ingrese un correo electrónico válido.';
            }
        });
        if (isCancel(emailInput)) return;

        const phoneInput = await text({
            message: `Teléfono [Actual: ${clienteExistente.phone || 'N/A'}]:`,
            placeholder: 'Presione ENTER para mantener el actual'
        });
        if (isCancel(phoneInput)) return;

        const finalName = (nameInput && nameInput.trim() !== '') ? nameInput.trim() : clienteExistente.name;
        const finalEmail = (emailInput && emailInput.trim() !== '') ? emailInput.trim().toLowerCase() : clienteExistente.email;
        const finalPhone = (phoneInput && phoneInput.trim() !== '') ? phoneInput.trim() : clienteExistente.phone;

        const spinner = ora('Actualizando información del cliente...').start();

        try {
            await this.clientsCollection.updateOne(
                { _id: clientId },
                {
                    $set: {
                        name: finalName,
                        email: finalEmail,
                        phone: finalPhone,
                        updatedAt: new Date()
                    }
                }
            );
            spinner.succeed(chalk.green(`Cliente [${clientId}] actualizado exitosamente.`));
        } catch (e) {
            spinner.fail(chalk.red(`Error al actualizar cliente: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async deleteClient() {
        UI.displayHeader('> Modo Freelancer > Clientes > Eliminar Cliente');

        const clientId = await this.selectClientInteractive();
        if (!clientId) return;

        const confirmDelete = await confirm({
            message: `¿Esta seguro de que desea eliminar al cliente [${clientId}]?`
        });
        if (isCancel(confirmDelete) || !confirmDelete) return;

        const spinner = ora('Eliminando cliente...').start();

        try {
            await this.clientsCollection.deleteOne({ _id: clientId });
            spinner.succeed(chalk.green('Cliente eliminado correctamente.'));
        } catch (e) {
            spinner.fail(chalk.red(`Error al eliminar cliente: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async selectClientInteractive() {
        try {
            const clients = await this.clientsCollection.find().toArray();
            if (!clients || clients.length === 0) {
                console.log(chalk.yellow('[!] No hay clientes registrados en la base de datos.'));
                await text({ message: 'Presione ENTER para continuar...' });
                return null;
            }

            const choices = clients.map(c => ({
                value: c._id,
                label: `[${c._id}] ${c.name} (${c.email})`
            }));

            const selected = await select({
                message: 'Seleccione un cliente:',
                options: choices
            });

            if (isCancel(selected)) return null;
            return selected;
        } catch (e) {
            console.log(chalk.red(`Error al seleccionar cliente: ${e.message}`));
            return null;
        }
    }

    async proposalsMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Gestion de Propuestas');

            const option = await select({
                message: 'Seleccione una operacion:',
                options: [
                    { value: 'create', label: 'Crear Nueva Propuesta' },
                    { value: 'list', label: 'Listar Propuestas por Cliente' },
                    { value: 'back', label: 'Volver al Menu Principal' }
                ]
            });

            if (isCancel(option) || option === 'back') break;

            switch (option) {
                case 'create':
                    await this.createProposalInteractive();
                    break;
                case 'list':
                    await this.listProposalsByClient();
                    break;
            }
        }
    }

    async createProposalInteractive() {
        UI.displayHeader('> Modo Freelancer > Propuestas > Crear Propuesta');

        const clientId = await this.selectClientInteractive();
        if (!clientId) return;

        const title = await text({
            message: 'Ingrese el título de la propuesta:',
            validate: val => (!val || val.trim().length === 0) ? '[!] El título no puede quedar en blanco' : undefined
        });
        if (isCancel(title)) return;

        const description = await text({
            message: 'Ingrese la descripción del servicio:',
            validate: val => (!val || val.trim().length === 0) ? '[!] La descripción no puede quedar en blanco' : undefined
        });
        if (isCancel(description)) return;

        const priceStr = await text({
            message: 'Ingrese el presupuesto estimado (USD):',
            validate: val => {
                if (!val || val.trim().length === 0) return '[!] El presupuesto no puede quedar en blanco';
                if (isNaN(val) || parseFloat(val) < 0) return '[!] Ingrese un monto numérico válido';
                return undefined;
            }
        });
        if (isCancel(priceStr)) return;

        const spinner = ora('Generando ID e insertando propuesta...').start();

        try {
            const newPropId = await generateNextId(this.proposalsCollection, 'P');

            const newProposal = new Proposal({
                id: newPropId,
                clientId: clientId,
                title: title.trim(),
                description: description.trim(),
                price: parseFloat(priceStr),
                status: 'pendiente'
            });

            await this.proposalsCollection.insertOne(newProposal);
            spinner.succeed(chalk.green(`Propuesta creada exitosamente con ID: ${newPropId}`));
        } catch (error) {
            spinner.fail(chalk.red(`[!] Error al crear propuesta: ${error.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async listProposalsByClient() {
        UI.displayHeader('> Modo Freelancer > Propuestas > Listar por Cliente');

        const clientId = await this.selectClientInteractive();
        if (!clientId) return;

        try {
            const proposals = await this.proposalsCollection.find({ clientId: clientId }).toArray();

            if (!proposals || proposals.length === 0) {
                console.log(boxen(chalk.yellow('[!] El cliente no tiene propuestas asociadas.'), { padding: 1, margin: 1, borderStyle: 'round' }));
            } else {
                const table = new Table({
                    head: [chalk.cyan('ID'), chalk.cyan('Titulo'), chalk.cyan('Precio (USD)'), chalk.cyan('Estado'), chalk.cyan('Fecha Creacion')],
                    colWidths: [10, 30, 15, 18, 15]
                });

                proposals.forEach(p => {
                    table.push([
                        p._id || 'N/A',
                        p.title || 'Sin titulo',
                        `$${p.price || 0}`,
                        this.getBadge('proposals', p.status),
                        p.createdAt ? dayjs(p.createdAt).format('YYYY-MM-DD') : 'N/A'
                    ]);
                });

                console.log(table.toString());
            }
        } catch (e) {
            console.log(chalk.red(`Error al consultar propuestas: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async contractsMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Gestion de Contratos');

            const option = await select({
                message: 'Seleccione una operacion:',
                options: [
                    { value: 'create', label: 'Crear Nuevo Contrato' },
                    { value: 'list', label: 'Listar Todos los Contratos' },
                    { value: 'updateStatus', label: 'Cambiar Estado de Contrato' },
                    { value: 'delete', label: 'Eliminar Contrato' },
                    { value: 'back', label: 'Volver al Menu Principal' }
                ]
            });

            if (isCancel(option) || option === 'back') break;

            switch (option) {
                case 'create':
                    await this.createContract();
                    break;
                case 'list':
                    await this.listContracts();
                    break;
                case 'updateStatus':
                    await this.updateContractStatus();
                    break;
                case 'delete':
                    await this.deleteContract();
                    break;
            }
        }
    }

    async createContract() {
        UI.displayHeader('> Modo Freelancer > Contratos > Crear Nuevo Contrato');

        const clientId = await this.selectClientInteractive();
        if (!clientId) return;

        const title = await text({
            message: 'Titulo del contrato:',
            validate: val => (!val || val.trim().length === 0) ? 'El titulo es obligatorio' : undefined
        });
        if (isCancel(title)) return;

        const terms = await text({
            message: 'Terminos y condiciones del contrato:',
            validate: val => (!val || val.trim().length === 0) ? 'Los terminos son requeridos' : undefined
        });
        if (isCancel(terms)) return;

        const amountStr = await text({
            message: 'Monto acordado (USD):',
            validate: val => (!val || isNaN(val) || Number(val) <= 0) ? 'Ingrese un monto valido mayor a 0' : undefined
        });
        if (isCancel(amountStr)) return;

        const startDateInput = await text({
            message: 'Fecha de inicio (YYYY-MM-DD):',
            placeholder: dayjs().format('YYYY-MM-DD'),
            validate: val => (!val || val.trim().length === 0) ? 'La fecha de inicio es requerida' : undefined
        });
        if (isCancel(startDateInput)) return;

        const endDateInput = await text({
            message: 'Fecha de finalización (YYYY-MM-DD):',
            placeholder: dayjs().add(30, 'day').format('YYYY-MM-DD'),
            validate: val => (!val || val.trim().length === 0) ? 'La fecha de finalizacion es requerida' : undefined
        });
        if (isCancel(endDateInput)) return;

        const spinner = ora('Registrando contrato...').start();

        try {
            const newContractId = await generateNextId(this.contractsCollection, 'CT');

            const newContract = new Contract({
                id: newContractId,
                title: title.trim(),
                terms: terms.trim(),
                clientId: clientId,
                amount: parseFloat(amountStr),
                status: 'activo',
                startDate: dayjs(startDateInput.trim()).toDate(),
                endDate: dayjs(endDateInput.trim()).toDate()
            });

            await this.contractsCollection.insertOne(newContract);
            spinner.succeed(chalk.green(`Contrato registrado con exito con ID: ${newContractId}`));
        } catch (e) {
            spinner.fail(chalk.red(`Error al registrar contrato: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async listContracts() {
        UI.displayHeader('> Modo Freelancer > Contratos > Listado General');

        try {
            const contracts = await this.contractsCollection.find().toArray();

            if (!contracts || contracts.length === 0) {
                console.log(boxen(chalk.yellow('[!] No hay contratos registrados.'), { padding: 1, margin: 1, borderStyle: 'round' }));
            } else {
                const table = new Table({
                    head: [chalk.cyan('ID'), chalk.cyan('Titulo'), chalk.cyan('Cliente ID'), chalk.cyan('Monto (USD)'), chalk.cyan('Estado'), chalk.cyan('Inicio'), chalk.cyan('Fin')],
                    colWidths: [10, 25, 12, 15, 15, 15, 15]
                });

                contracts.forEach(c => {
                    table.push([
                        c._id || 'N/A',
                        c.title || 'Sin titulo',
                        c.clientId || 'N/A',
                        `$${Number(c.amount || 0).toFixed(2)}`,
                        this.getBadge('contracts', c.status),
                        c.startDate ? dayjs(c.startDate).format('YYYY-MM-DD') : 'N/A',
                        c.endDate ? dayjs(c.endDate).format('YYYY-MM-DD') : 'N/A'
                    ]);
                });

                console.log(table.toString());
            }
        } catch (e) {
            console.log(chalk.red(`Error al listar contratos: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async updateContractStatus() {
        UI.displayHeader('> Modo Freelancer > Contratos > Cambiar Estado');

        const contractId = await this.selectContractInteractive();
        if (!contractId) return;

        const newStatus = await select({
            message: 'Seleccione el nuevo estado del contrato:',
            options: [
                { value: 'activo', label: 'Activo' },
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'finalizado', label: 'Finalizado' },
                { value: 'cancelado', label: 'Cancelado' }
            ]
        });
        if (isCancel(newStatus)) return;

        const spinner = ora('Actualizando estado del contrato...').start();

        try {
            await this.contractsCollection.updateOne(
                { _id: contractId },
                { $set: { status: newStatus, updatedAt: new Date() } }
            );
            spinner.succeed(chalk.green(`Estado del contrato actualizado a: ${newStatus}`));
        } catch (e) {
            spinner.fail(chalk.red(`Error al actualizar estado del contrato: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async deleteContract() {
        UI.displayHeader('> Modo Freelancer > Contratos > Eliminar Contrato');

        const contractId = await this.selectContractInteractive();
        if (!contractId) return;

        const confirmDelete = await confirm({
            message: `¿Esta seguro de que desea eliminar el contrato [${contractId}]?`
        });
        if (isCancel(confirmDelete) || !confirmDelete) return;

        const spinner = ora('Eliminando contrato...').start();

        try {
            await this.contractsCollection.deleteOne({ _id: contractId });
            spinner.succeed(chalk.green('Contrato eliminado correctamente.'));
        } catch (e) {
            spinner.fail(chalk.red(`Error al eliminar contrato: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async selectContractInteractive() {
        try {
            const contracts = await this.contractsCollection.find().toArray();
            if (!contracts || contracts.length === 0) {
                console.log(chalk.yellow('[!] No hay contratos registrados en la base de datos.'));
                await text({ message: 'Presione ENTER para continuar...' });
                return null;
            }

            const choices = contracts.map(c => ({
                value: c._id,
                label: `[${c._id}] ${c.title || 'Sin titulo'} (Cliente: ${c.clientId})`
            }));

            const selected = await select({
                message: 'Seleccione un contrato:',
                options: choices
            });

            if (isCancel(selected)) return null;
            return selected;
        } catch (e) {
            console.log(chalk.red(`Error al seleccionar contrato: ${e.message}`));
            return null;
        }
    }

    async projectsMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Gestion de Proyectos');

            const option = await select({
                message: 'Seleccione una operacion:',
                options: [
                    { value: 'create', label: 'Crear Nuevo Proyecto' },
                    { value: 'list', label: 'Listar Todos los Proyectos' },
                    { value: 'updateProgress', label: 'Actualizar Avance y Bitacora' },
                    { value: 'updateStatus', label: 'Cambiar Estado del Proyecto' },
                    { value: 'back', label: 'Volver al Menu Principal' }
                ]
            });

            if (isCancel(option) || option === 'back') break;

            switch (option) {
                case 'create':
                    await this.createProject();
                    break;
                case 'list':
                    await this.listProjects();
                    break;
                case 'updateProgress':
                    await this.updateProjectProgress();
                    break;
                case 'updateStatus':
                    await this.updateProjectStatus();
                    break;
            }
        }
    }

    async createProject() {
        UI.displayHeader('> Modo Freelancer > Proyectos > Crear Nuevo Proyecto');

        const clientId = await this.selectClientInteractive();
        if (!clientId) return;

        const name = await text({
            message: 'Nombre del proyecto:',
            validate: val => (!val || val.trim().length === 0) ? 'El nombre del proyecto es obligatorio' : undefined
        });
        if (isCancel(name)) return;

        const description = await text({ message: 'Descripcion del proyecto:' });
        if (isCancel(description)) return;

        const budgetStr = await text({
            message: 'Presupuesto total (USD):',
            validate: val => (!val || isNaN(val) || Number(val) < 0) ? 'Ingrese un presupuesto valido' : undefined
        });
        if (isCancel(budgetStr)) return;

        const spinner = ora('Creando proyecto...').start();

        try {
            const newProjectId = await generateNextId(this.projectsCollection, 'A');

            const newProject = new Project({
                id: newProjectId,
                name: name.trim(),
                description: description ? description.trim() : '',
                clientId: clientId,
                contractId: null,
                status: 'activo',
                progress: 0,
                budget: parseFloat(budgetStr),
                logs: []
            });

            await this.projectsCollection.insertOne(newProject);
            spinner.succeed(chalk.green(`Proyecto creado exitosamente con ID: ${newProjectId}`));
        } catch (e) {
            spinner.fail(chalk.red(`Error al crear proyecto: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async listProjects() {
        UI.displayHeader('> Modo Freelancer > Proyectos > Listado General');

        try {
            const projects = await this.projectsCollection.find().toArray();

            if (!projects || projects.length === 0) {
                console.log(boxen(chalk.yellow('[!] No hay proyectos registrados.'), { padding: 1, margin: 1, borderStyle: 'round' }));
            } else {
                const table = new Table({
                    head: [chalk.cyan('ID'), chalk.cyan('Nombre'), chalk.cyan('Cliente ID'), chalk.cyan('Estado'), chalk.cyan('Progreso'), chalk.cyan('Presupuesto')],
                    colWidths: [10, 25, 12, 15, 15, 15]
                });

                projects.forEach(p => {
                    table.push([
                        p._id || 'N/A',
                        p.name || 'Sin nombre',
                        p.clientId || 'N/A',
                        this.getBadge('projects', p.status),
                        this.renderProgressBar(p.progress || 0),
                        `$${p.budget || 0}`
                    ]);
                });

                console.log(table.toString());
            }
        } catch (e) {
            console.log(chalk.red(`Error al listar proyectos: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async syncProjectProgressFromDeliverables(projectId) {
        if (!projectId) return 0;
        const deliverables = await this.deliverablesCollection.find({ projectId: projectId }).toArray();
        if (!deliverables || deliverables.length === 0) return 0;

        const completed = deliverables.filter(d => ['completado', 'aprobado'].includes(d.status)).length;
        const progressNum = Math.round((completed / deliverables.length) * 100);

        const updateData = { progress: progressNum, updatedAt: new Date() };
        if (progressNum === 100) {
            updateData.status = 'completado';
        } else {
            const project = await this.projectsCollection.findOne({ _id: projectId });
            if (project && project.status === 'completado') {
                updateData.status = 'activo';
            }
        }

        await this.projectsCollection.updateOne({ _id: projectId }, { $set: updateData });

        console.log(chalk.cyan(`\nProgreso del Proyecto [${projectId}]: ${this.renderProgressBar(progressNum)} (${completed}/${deliverables.length} entregables completados/aprobados)\n`));
        return progressNum;
    }

    async updateProjectProgress() {
        UI.displayHeader('> Modo Freelancer > Proyectos > Actualizar Bitacora y Estado');

        const projectId = await this.selectProjectInteractive();
        if (!projectId) return;

        const estadoAvance = await select({
            message: 'Seleccione el estado de avance actual:',
            options: [
                { value: 'en progreso', label: 'En Progreso' },
                { value: 'atrasado', label: 'Atrasado' },
                { value: 'finalizado', label: 'Finalizado' }
            ]
        });
        if (isCancel(estadoAvance)) return;

        const deliverables = await this.deliverablesCollection.find({ projectId: projectId }).toArray();
        let progressNum = 0;

        if (estadoAvance === 'finalizado') {
            progressNum = 100;
        } else if (deliverables.length > 0) {
            const completedCount = deliverables.filter(d => ['completado', 'aprobado'].includes(d.status)).length;
            progressNum = Math.round((completedCount / deliverables.length) * 100);
        }

        const logNote = await text({
            message: 'Nota o detalle del avance para la bitacora:',
            validate: val => (!val || val.trim().length === 0) ? '[!] La nota de la bitacora es requerida' : undefined
        });
        if (isCancel(logNote)) return;

        const spinner = ora('Actualizando avance calculado por entregables...').start();

        try {
            const newLog = {
                note: logNote.trim(),
                state: estadoAvance,
                percentage: progressNum,
                date: new Date()
            };

            const updateData = {
                progress: progressNum,
                updatedAt: new Date()
            };

            if (estadoAvance === 'finalizado') {
                updateData.status = 'completado';
            }

            await this.projectsCollection.updateOne(
                { _id: projectId },
                {
                    $set: updateData,
                    $push: { logs: newLog }
                }
            );
            spinner.succeed(
                chalk.green(
                    `Bitacora actualizada. Avance: ${this.renderProgressBar(progressNum)} (${deliverables.length} entregables).${
                        estadoAvance === 'finalizado' ? ' Proyecto completado.' : ''
                    }`
                )
            );
        } catch (e) {
            spinner.fail(chalk.red(`[!] Error al actualizar avance: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async updateProjectStatus() {
        UI.displayHeader('> Modo Freelancer > Proyectos > Cambiar Estado');

        const projectId = await this.selectProjectInteractive();
        if (!projectId) return;

        const newStatus = await select({
            message: 'Seleccione el nuevo estado:',
            options: [
                { value: 'activo', label: 'Activo' },
                { value: 'pausado', label: 'Pausado' },
                { value: 'completado', label: 'Completado' },
                { value: 'cancelado', label: 'Cancelado' }
            ]
        });
        if (isCancel(newStatus)) return;

        const spinner = ora('Cambiando estado...').start();

        try {
            await this.projectsCollection.updateOne(
                { _id: projectId },
                { $set: { status: newStatus, updatedAt: new Date() } }
            );
            spinner.succeed(chalk.green(`Estado actualizado a: ${newStatus}`));
        } catch (e) {
            spinner.fail(chalk.red(`Error al cambiar estado: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async selectProjectInteractive() {
        try {
            const projects = await this.projectsCollection.find().toArray();
            if (!projects || projects.length === 0) {
                console.log(chalk.yellow('[!] No hay proyectos registrados en la base de datos.'));
                await text({ message: 'Presione ENTER para continuar...' });
                return null;
            }

            const choices = projects.map(p => ({
                value: p._id,
                label: `[${p._id}] ${p.name} (Progreso: ${p.progress || 0}%)`
            }));

            const selected = await select({
                message: 'Seleccione un proyecto:',
                options: choices
            });

            if (isCancel(selected)) return null;
            return selected;
        } catch (e) {
            console.log(chalk.red(`Error al seleccionar proyecto: ${e.message}`));
            return null;
        }
    }

    async deliverablesMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Gestion de Entregables');

            const option = await select({
                message: 'Seleccione una operacion:',
                options: [
                    { value: 'create', label: 'Crear Entregable para Proyecto' },
                    { value: 'list', label: 'Listar Entregables por Proyecto' },
                    { value: 'updateStatus', label: 'Cambiar Estado de Entregable' },
                    { value: 'back', label: 'Volver al Menu Principal' }
                ]
            });

            if (isCancel(option) || option === 'back') break;

            switch (option) {
                case 'create':
                    await this.createDeliverable();
                    break;
                case 'list':
                    await this.listDeliverablesByProject();
                    break;
                case 'updateStatus':
                    await this.updateDeliverableStatus();
                    break;
            }
        }
    }

    async createDeliverable() {
        UI.displayHeader('> Modo Freelancer > Entregables > Crear Entregable');

        const projectId = await this.selectProjectInteractive();
        if (!projectId) return;

        const title = await text({
            message: 'Titulo del entregable:',
            validate: val => (!val || val.trim().length === 0) ? 'El titulo es requerido' : undefined
        });
        if (isCancel(title)) return;

        const durationOption = await select({
            message: 'Seleccione el tiempo de entrega / fecha límite:',
            options: [
                { value: '1_week', label: '📅 1 Semana (7 días)' },
                { value: '1_month', label: '📅 1 Mes (30 días)' },
                { value: 'custom', label: '✍️ Ingresar fecha manualmente (YYYY-MM-DD)' }
            ]
        });
        if (isCancel(durationOption)) return;

        let deadlineDate = null;
        if (durationOption === '1_week') {
            deadlineDate = dayjs().add(7, 'day').toDate();
        } else if (durationOption === '1_month') {
            deadlineDate = dayjs().add(30, 'day').toDate();
        } else {
            const deadlineInput = await text({
                message: 'Fecha limite (YYYY-MM-DD):',
                placeholder: dayjs().add(7, 'day').format('YYYY-MM-DD'),
                validate: val => (!val || val.trim().length === 0) ? 'La fecha es requerida' : undefined
            });
            if (isCancel(deadlineInput)) return;
            deadlineDate = dayjs(deadlineInput.trim()).toDate();
        }

        const spinner = ora('Guardando entregable...').start();

        try {
            const newDeliverableId = await generateNextId(this.deliverablesCollection, 'E');

            const nuevoEntregable = new Deliverable({
                id: newDeliverableId,
                title: title.trim(),
                projectId: projectId,
                deadline: deadlineDate,
                dueDate: deadlineDate,
                status: 'pendiente'
            });

            await this.deliverablesCollection.insertOne(nuevoEntregable);
            await this.syncProjectProgressFromDeliverables(projectId);

            spinner.succeed(chalk.green(`Entregable registrado con exito con ID: ${newDeliverableId}`));
        } catch (e) {
            spinner.fail(chalk.red(`Error al registrar entregable: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async listDeliverablesByProject() {
        UI.displayHeader('> Modo Freelancer > Entregables > Listar por Proyecto');

        const projectId = await this.selectProjectInteractive();
        if (!projectId) return;

        try {
            const deliverables = await this.deliverablesCollection.find({ projectId: projectId }).toArray();

            if (!deliverables || deliverables.length === 0) {
                console.log(boxen(chalk.yellow('[!] No hay entregables asignados a este proyecto.'), { padding: 1, margin: 1, borderStyle: 'round' }));
            } else {
                const table = new Table({
                    head: [chalk.cyan('ID'), chalk.cyan('Titulo'), chalk.cyan('Estado'), chalk.cyan('Fecha Limite')],
                    colWidths: [10, 35, 18, 15]
                });

                deliverables.forEach(d => {
                    const fecha = d.dueDate || d.deadline;
                    table.push([
                        d._id || 'N/A',
                        d.title || 'Sin titulo',
                        this.getBadge('deliverables', d.status),
                        fecha ? dayjs(fecha).format('YYYY-MM-DD') : 'N/A'
                    ]);
                });

                console.log(table.toString());
            }
        } catch (e) {
            console.log(chalk.red(`Error al consultar entregables: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async updateDeliverableStatus() {
        UI.displayHeader('> Modo Freelancer > Entregables > Cambiar Estado');

        const projectId = await this.selectProjectInteractive();
        if (!projectId) return;

        try {
            const deliverables = await this.deliverablesCollection.find({ projectId: projectId }).toArray();

            if (!deliverables || deliverables.length === 0) {
                console.log(chalk.yellow('[!] No hay entregables para este proyecto.'));
                await text({ message: 'Presione ENTER para continuar...' });
                return;
            }

            const choices = deliverables.map(d => ({
                value: d._id,
                label: `[${d._id}] ${d.title} (${d.status})`
            }));

            const deliverableId = await select({
                message: 'Seleccione el entregable:',
                options: choices
            });
            if (isCancel(deliverableId)) return;

            const selectedDeliverable = deliverables.find(d => d._id === deliverableId);

            if (selectedDeliverable && selectedDeliverable.status === 'completado') {
                console.log(chalk.yellow('\n[!] ADVERTENCIA: Este entregable ya se encuentra en estado COMPLETADO.\n'));
            }

            const newStatus = await select({
                message: 'Seleccione el nuevo estado:',
                options: [
                    { value: 'pendiente', label: 'Pendiente' },
                    { value: 'en proceso', label: 'En Proceso' },
                    { value: 'completado', label: 'Completado' }
                ]
            });
            if (isCancel(newStatus)) return;

            const spinner = ora('Actualizando entregable y sincronizando progreso del proyecto...').start();

            await this.deliverablesCollection.updateOne(
                { _id: deliverableId },
                { $set: { status: newStatus, updatedAt: new Date() } }
            );

            spinner.succeed(chalk.green(`Estado de entregable actualizado a: ${newStatus}`));
            await this.syncProjectProgressFromDeliverables(projectId);

        } catch (e) {
            console.log(chalk.red(`Error al actualizar entregable: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async financesMenu() {
        while (true) {
            UI.displayHeader('> Modo Freelancer > Gestion Financiera');

            const option = await select({
                message: 'Seleccione una operacion:',
                options: [
                    { value: 'addTransaction', label: 'Registrar Transaccion (Ingreso / Egreso)' },
                    { value: 'list', label: 'Ver Movimientos Financieros' },
                    { value: 'clientBalance', label: 'Balance Neto por Cliente' },
                    { value: 'back', label: 'Volver al Menu Principal' }
                ]
            });

            if (isCancel(option) || option === 'back') break;

            switch (option) {
                case 'addTransaction':
                    await this.addTransaction();
                    break;
                case 'list':
                    await this.listFinances();
                    break;
                case 'clientBalance':
                    await this.showFinancialBalance();
                    break;
            }
        }
    }

    async addTransaction() {
        UI.displayHeader('> Modo Freelancer > Finanzas > Registrar Transaccion');

        const type = await select({
            message: 'Seleccione el tipo de transacción:',
            options: [
                { value: 'ingreso', label: '💰 Ingreso (Abono / Pago de cliente)' },
                { value: 'egreso', label: '💸 Egreso (Gasto operativo / servicio / insumo)' }
            ]
        });
        if (isCancel(type)) return;

        const concept = await text({
            message: 'Título / Concepto de la transacción:',
            placeholder: type === 'ingreso' ? 'Ej. Abono del 50%' : 'Ej. Compra de Hosting / Dominio',
            validate: val => (!val || val.trim().length === 0) ? 'El concepto es obligatorio' : undefined
        });
        if (isCancel(concept)) return;

        const description = await text({
            message: 'Descripción detallada (opcional):',
            placeholder: 'Ej. Detalles adicionales sobre la transacción'
        });
        if (isCancel(description)) return;

        const projectId = await this.selectProjectInteractive();
        if (!projectId) return;

        const project = await this.projectsCollection.findOne({ _id: projectId });
        if (!project) {
            console.log(chalk.red('[!] Proyecto no encontrado.'));
            await text({ message: 'Presione ENTER para continuar...' });
            return;
        }

        const amountStr = await text({
            message: `Monto en USD (${type.toUpperCase()}):`,
            validate: val => (isNaN(val) || parseFloat(val) <= 0) ? 'Ingrese un monto numérico válido mayor a 0' : undefined
        });
        if (isCancel(amountStr)) return;

        const amount = parseFloat(amountStr);
        const spinner = ora('Registrando transacción...').start();

        try {
            const autoRefId = await generateNextId(this.financesCollection, 'SPF');

            const newTransaction = new Transaction({
                id: autoRefId,
                projectId: projectId,
                clientId: project.clientId || null,
                type: type,
                concept: concept.trim(),
                description: description ? description.trim() : concept.trim(),
                amount: amount,
                referenceCode: autoRefId
            });

            await this.financesCollection.insertOne(newTransaction);

            const sign = type === 'ingreso' ? '+' : '-';
            const color = type === 'ingreso' ? chalk.green : chalk.red;

            spinner.succeed(color(`Transacción de ${type.toUpperCase()} registrada con exito.`));

            console.log(boxen([
                chalk.bold(type === 'ingreso' ? '💰 INGRESO REGISTRADO' : '💸 EGRESO REGISTRADO'),
                '--------------------------------------------------',
                `ID / Ref:     ${autoRefId}`,
                `Proyecto ID:  ${projectId}`,
                `Concepto:     ${concept.trim()}`,
                `Monto:        ${color(`${sign}$${amount.toFixed(2)} USD`)}`,
                `Fecha:        ${dayjs().format('YYYY-MM-DD HH:mm')}`
            ].join('\n'), { padding: 1, margin: 1, borderStyle: 'round', borderColor: type === 'ingreso' ? 'green' : 'red' }));

        } catch (e) {
            spinner.fail(chalk.red(`[!] Error al registrar transaccion: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async listFinances() {
        UI.displayHeader('> Modo Freelancer > Finanzas > Movimientos Registrados');

        try {
            const transactions = await this.financesCollection.find().toArray();

            if (!transactions || transactions.length === 0) {
                console.log(boxen(chalk.yellow('[!] No hay movimientos financieros registrados.'), { padding: 1, margin: 1, borderStyle: 'round' }));
            } else {
                const table = new Table({
                    head: [chalk.cyan('Referencia'), chalk.cyan('Tipo'), chalk.cyan('Proyecto ID'), chalk.cyan('Monto (USD)'), chalk.cyan('Concepto'), chalk.cyan('Fecha')],
                    colWidths: [15, 12, 12, 15, 25, 18]
                });

                transactions.forEach(t => {
                    const isEgreso = t.type === 'egreso';
                    const amountFormatted = isEgreso
                        ? chalk.red(`-$${Number(t.amount || 0).toFixed(2)}`)
                        : chalk.green(`+$${Number(t.amount || 0).toFixed(2)}`);

                    table.push([
                        t.referenceCode || t.reference || t._id || 'N/A',
                        this.getBadge('finances', t.type),
                        t.projectId || 'N/A',
                        amountFormatted,
                        t.concept || t.description || t.concepto || 'Sin concepto',
                        t.createdAt ? dayjs(t.createdAt).format('YYYY-MM-DD HH:mm') : 'N/A'
                    ]);
                });

                console.log(table.toString());
            }
        } catch (e) {
            console.log(chalk.red(`Error al listar finanzas: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async showFinancialBalance() {
        UI.displayHeader('> Modo Freelancer > Finanzas > Balance Neto por Cliente');

        const clientId = await this.selectClientInteractive();
        if (!clientId) return;

        const spinner = ora('Calculando balance neto del cliente...').start();

        try {
            const projects = await this.projectsCollection.find({ clientId }).toArray();
            const projectIds = projects.map(p => p._id);

            const transactions = await this.financesCollection.find({
                $or: [
                    { clientId: clientId },
                    { projectId: { $in: projectIds } }
                ]
            }).toArray();

            let totalIngresos = 0;
            let totalEgresos = 0;

            transactions.forEach(t => {
                const amount = Number(t.amount) || 0;
                if (t.type === 'ingreso' || t.type === 'INCOME') {
                    totalIngresos += amount;
                } else if (t.type === 'egreso') {
                    totalEgresos += amount;
                }
            });

            const netBalance = totalIngresos - totalEgresos;
            spinner.stop();

            const balanceContent = [
                chalk.bold.cyan(`BALANCE FINANCIERO - CLIENTE [${clientId}]`),
                '--------------------------------------------------',
                `Total Ingresos:  ${chalk.green(`+$${totalIngresos.toFixed(2)} USD`)}`,
                `Total Egresos:   ${chalk.red(`-$${totalEgresos.toFixed(2)} USD`)}`,
                '--------------------------------------------------',
                `Balance Neto:    ${netBalance >= 0 ? chalk.bold.green(`$${netBalance.toFixed(2)} USD`) : chalk.bold.red(`-$${Math.abs(netBalance).toFixed(2)} USD`)}`
            ].join('\n');

            console.log(boxen(balanceContent, { padding: 1, margin: 1, borderStyle: 'double', borderColor: 'cyan' }));
        } catch (e) {
            spinner.fail(chalk.red(`Error al calcular el balance: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }
}

export default FreelanceMenu;