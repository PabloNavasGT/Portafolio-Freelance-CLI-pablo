import { select, text, password, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import validator from 'validator';
import { ObjectId } from 'mongodb';

import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import Table from 'cli-table3';
import cliProgress from 'cli-progress';
import dayjs from 'dayjs';
import figures from 'figures';
import logSymbols from 'log-symbols';
import ora from 'ora';

import Database from '../config/db.js';
import { UI } from '../utils/ui.js';

/**
 * Submenú exclusivo para el Rol de Cliente con autenticación previa.
 */
export class ClientMenu {
    constructor() {
        this.currentClient = null; // Almacena el usuario autenticado en sesión
    }

    get db() { return Database.getDb(); }
    get clientsCollection() { return this.db.collection('clients'); }
    get proposalsCollection() { return this.db.collection('proposals'); }
    get projectsCollection() { return this.db.collection('projects'); }
    get contractsCollection() { return this.db.collection('contracts'); }
    get deliverablesCollection() { return this.db.collection('deliverables'); }
    get financesCollection() { return this.db.collection('finances'); }

    /**
     * Auxiliar UI: Genera insignias de estado coloridas con íconos Unicode.
     */
    renderBadge(status) {
        if (!status) return chalk.bgGray.white(' N/A ');
        const st = status.toLowerCase();

        switch (st) {
            case 'aceptada':
            case 'aprobado':
            case 'activo':
            case 'completado':
                return chalk.bgGreen.black(` ${figures.tick} ${status.toUpperCase()} `);
            case 'pendiente':
            case 'en proceso':
                return chalk.bgYellow.black(` ${figures.warning} ${status.toUpperCase()} `);
            case 'rechazada':
            case 'rechazado':
            case 'cancelado':
                return chalk.bgRed.white.bold(` ${figures.cross} ${status.toUpperCase()} `);
            case 'ingreso':
                return chalk.bgGreen.black(` + INGRESO `);
            case 'egreso':
                return chalk.bgRed.white.bold(` - EGRESO `);
            default:
                return chalk.bgBlue.white(` ${status.toUpperCase()} `);
        }
    }

    /**
     * Auxiliar UI: Genera una barra de progreso gráfica visual en ASCII/Unicode.
     */
    renderProgressBar(progressPercent) {
        const pct = Math.max(0, Math.min(100, Number(progressPercent) || 0));
        const totalBlocks = 10;
        const filledBlocks = Math.round((pct / 100) * totalBlocks);
        const bar = '█'.repeat(filledBlocks) + '░'.repeat(totalBlocks - filledBlocks);
        
        return `${chalk.cyan(bar)} ${pct}%`;
    }

    /**
     * Auxiliar UI: Renderiza una pantalla estilizada de Estado Vacío (Empty State).
     */
    renderEmptyState(title, message) {
        const content = [
            chalk.yellow.bold(`${figures.info} ${title}`),
            '',
            chalk.gray(message)
        ].join('\n');

        console.log(
            boxen(content, {
                padding: 1,
                margin: { top: 1, bottom: 1 },
                borderStyle: 'round',
                borderColor: 'yellow',
                align: 'center'
            })
        );
    }

    /**
     * Capa de validación e inicio de sesión antes de dar acceso al submenú.
     */
    async login() {
        UI.displayHeader('Portal de Clientes > Autenticación');

        const email = await text({
            message: 'Correo electrónico:',
            validate(val) { if (!validator.isEmail(val)) return 'Ingrese un correo electrónico válido.'; }
        });
        if (isCancel(email)) return false;

        const pass = await password({
            message: 'Contraseña de acceso:'
        });
        if (isCancel(pass)) return false;

        const spinner = UI.createSpinner('Verificando credenciales...').start();
        try {
            const client = await this.clientsCollection.findOne({
                email: email.trim().toLowerCase(),
                password: pass // Validación directa de contraseña
            });

            if (!client) {
                spinner.fail(chalk.red('Credenciales incorrectas o el cliente no existe.'));
                await text({ message: 'Presiona ENTER para continuar...' });
                return false;
            }

            this.currentClient = client;
            spinner.succeed(chalk.green(`¡Bienvenido/a, ${client.name}!`));
            await text({ message: 'Presiona ENTER para ingresar al panel...' });
            return true;
        } catch (e) {
            spinner.fail('Error durante la autenticación.');
            return false;
        }
    }

    /**
     * Bucle del menú ejecutado únicamente si la validación es exitosa.
     */
    async show() {
        const isAuthenticated = await this.login();
        if (!isAuthenticated) return; // Regresa al menú principal si falla o se cancela

        let inSubmenu = true;

        while (inSubmenu) {
            UI.displayHeader(`Portal de Clientes > Panel Principal (${this.currentClient.name})`);

            const option = await select({
                message: '¿Qué acción deseas realizar?',
                options: [
                    { value: 'profile', label: `${UI.icons.bullet} 1. Mi Perfil (Ver y actualizar mis datos)` },
                    { value: 'proposals', label: `${UI.icons.bullet} 2. Mis Propuestas (Revisar, Aceptar o Rechazar)` },
                    { value: 'projects', label: `${UI.icons.bullet} 3. Estado de mis Proyectos y Avances` },
                    { value: 'contracts', label: `${UI.icons.bullet} 4. Mis Contratos` },
                    { value: 'deliverables', label: `${UI.icons.bullet} 5. Revisión y Aprobación de Entregables` },
                    { value: 'finances', label: `${UI.icons.bullet} 6. Estado de Cuenta y Registro de Pagos` },
                    { value: 'logout', label: `${UI.icons.arrowLeft} 7. Cerrar Sesión / Volver` }
                ]
            });

            if (isCancel(option) || option === 'logout') {
                this.currentClient = null; // Limpieza de sesión
                inSubmenu = false;
                break;
            }

            await this.handleOption(option);
        }
    }

    async handleOption(option) {
        switch (option) {
            case 'profile':
                await this.profileModule();
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

    // 1. PERFIL
    async profileModule() {
        UI.displayHeader('Portal de Clientes > Mi Perfil');

        const profileCard = [
            `${chalk.green.bold(`${figures.squareSmallFilled} SESIÓN ACTIVA`)} ${chalk.gray('(Cliente Autenticado)')}`,
            '──────────────────────────────────────────────',
            `${chalk.cyan.bold('• ID MongoDB:')} ${this.currentClient._id}`,
            `${chalk.cyan.bold('• Nombre:')}     ${this.currentClient.name}`,
            `${chalk.cyan.bold('• Correo:')}     ${this.currentClient.email}`,
            `${chalk.cyan.bold('• Teléfono:')}   ${this.currentClient.phone || 'N/A'}`
        ].join('\n');

        console.log(
            boxen(profileCard, {
                padding: 1,
                margin: { top: 1, bottom: 1 },
                borderStyle: 'round',
                borderColor: 'cyan',
                title: chalk.bold('👤 PERFIL DE USUARIO'),
                titleAlignment: 'center'
            })
        );

        const updatePhone = await text({ message: 'Actualizar teléfono (dejar vacío para mantener):' });
        if (!isCancel(updatePhone) && updatePhone.trim()) {
            const spinner = UI.createSpinner('Actualizando teléfono...').start();
            await this.clientsCollection.updateOne(
                { _id: this.currentClient._id },
                { $set: { phone: updatePhone.trim() } }
            );
            this.currentClient.phone = updatePhone.trim();
            spinner.succeed(chalk.green('Teléfono actualizado.'));
        }

        await text({ message: 'Presiona ENTER para continuar...' });
    }

    // 2. MIS PROPUESTAS RECIBIDAS
    async proposalsModule() {
        UI.displayHeader('Portal de Clientes > Mis Propuestas');

        const spinner = UI.createSpinner('Cargando propuestas...').start();
        try {
            const proposals = await this.proposalsCollection.find({ clientId: this.currentClient._id }).toArray();
            spinner.stop();

            if (proposals.length === 0) {
                this.renderEmptyState('SIN PROPUESTAS REGISTRADAS', 'No se encontraron propuestas enviadas a tu cuenta en este momento.');
                await text({ message: 'Presiona ENTER para continuar...' });
                return;
            }

            const rows = proposals.map(p => [
                p._id.toString(),
                p.title,
                `$${p.price}`,
                this.renderBadge(p.status),
                p.deadline ? dayjs(p.deadline).format('YYYY-MM-DD') : 'N/A'
            ]);
            UI.renderTable(['ID Propuesta', 'Título', 'Precio', 'Estado', 'Plazo'], rows);

            const propId = await text({ message: 'ID de la propuesta a responder (dejar vacío para omitir):' });
            if (!propId || isCancel(propId) || !ObjectId.isValid(propId)) return;

            const response = await select({
                message: '¿Deseas aceptar o rechazar la propuesta?',
                options: [
                    { value: 'aceptada', label: 'Aceptar (Se creará automáticamente el proyecto)' },
                    { value: 'rechazada', label: 'Rechazar propuesta' }
                ]
            });
            if (isCancel(response)) return;

            const updateSpinner = UI.createSpinner('Procesando propuesta...').start();
            await this.proposalsCollection.updateOne({ _id: new ObjectId(propId) }, { $set: { status: response } });

            if (response === 'aceptada') {
                const prop = await this.proposalsCollection.findOne({ _id: new ObjectId(propId) });
                const autoProj = {
                    proposalId: prop._id,
                    clientId: this.currentClient._id,
                    name: prop.title,
                    description: prop.description,
                    budget: prop.price,
                    status: 'activo',
                    progress: 0,
                    createdAt: new Date()
                };
                const projRes = await this.projectsCollection.insertOne(autoProj);
                updateSpinner.succeed(chalk.green(`¡Propuesta ACEPTADA! Se generó el proyecto ID: ${projRes.insertedId}`));
            } else {
                updateSpinner.succeed(chalk.yellow('Propuesta rechazada.'));
            }

        } catch (e) {
            spinner.fail('Error al procesar propuestas.');
        }

        await text({ message: 'Presiona ENTER para continuar...' });
    }

    // 3. ESTADO DE PROYECTOS Y AVANCES
    async projectsModule() {
        UI.displayHeader('Portal de Clientes > Mis Proyectos');

        const spinner = UI.createSpinner('Cargando tus proyectos...').start();
        try {
            const projects = await this.projectsCollection.find({ clientId: this.currentClient._id }).toArray();
            spinner.stop();

            if (projects.length === 0) {
                this.renderEmptyState('SIN PROYECTOS ACTIVOS', 'No tienes proyectos en desarrollo vinculados a tu cuenta actualmente.');
            } else {
                const rows = projects.map(p => [
                    p._id.toString(),
                    p.name,
                    this.renderBadge(p.status),
                    this.renderProgressBar(p.progress || 0)
                ]);
                UI.renderTable(['ID Proyecto', 'Nombre Proyecto', 'Estado', 'Avance'], rows);
            }
        } catch (e) {
            spinner.fail('Error al consultar proyectos.');
        }

        await text({ message: 'Presiona ENTER para continuar...' });
    }

    // 4. MIS CONTRATOS
    async contractsModule() {
        UI.displayHeader('Portal de Clientes > Mis Contratos');

        const spinner = UI.createSpinner('Cargando proyectos y contratos...').start();
        try {
            const projects = await this.projectsCollection.find({ clientId: this.currentClient._id }).toArray();
            const projectIds = projects.map(p => p._id);

            const contracts = await this.contractsCollection.find({ projectId: { $in: projectIds } }).toArray();
            spinner.stop();

            if (contracts.length === 0) {
                this.renderEmptyState('SIN CONTRATOS VIGENTES', 'No se encontraron contratos vigentes vinculados a tus proyectos.');
            } else {
                const rows = contracts.map(c => [
                    c._id.toString(),
                    c.projectId.toString(),
                    `$${c.totalValue}`,
                    c.startDate ? dayjs(c.startDate).format('YYYY-MM-DD') : 'N/A',
                    c.endDate ? dayjs(c.endDate).format('YYYY-MM-DD') : 'N/A'
                ]);
                UI.renderTable(['ID Contrato', 'ID Proyecto', 'Valor Total', 'Inicio', 'Fin'], rows);
            }
        } catch (e) {
            spinner.fail('Error al obtener contratos.');
        }

        await text({ message: 'Presiona ENTER para continuar...' });
    }

    // 5. REVISIÓN Y APROBACIÓN DE ENTREGABLES
    async deliverablesModule() {
        UI.displayHeader('Portal de Clientes > Entregables de Mis Proyectos');

        const spinner = UI.createSpinner('Buscando proyectos...').start();
        try {
            const projects = await this.projectsCollection.find({ clientId: this.currentClient._id }).toArray();
            spinner.stop();

            if (projects.length === 0) {
                this.renderEmptyState('SIN PROYECTOS ACTIVOS', 'No cuentas con proyectos activos para revisar entregables.');
                await text({ message: 'Presiona ENTER para continuar...' });
                return;
            }

            const projectIds = projects.map(p => p._id);
            const deliverables = await this.deliverablesCollection.find({ projectId: { $in: projectIds } }).toArray();

            if (deliverables.length === 0) {
                this.renderEmptyState('SIN ENTREGABLES PENDIENTES', 'No existen entregables asignados para revisión en tus proyectos.');
                await text({ message: 'Presiona ENTER para continuar...' });
                return;
            }

            const rows = deliverables.map(d => [
                d._id.toString(),
                d.projectId.toString(),
                d.title,
                this.renderBadge(d.status),
                d.deadline ? dayjs(d.deadline).format('YYYY-MM-DD') : (d.dueDate ? dayjs(d.dueDate).format('YYYY-MM-DD') : 'N/A')
            ]);
            UI.renderTable(['ID Entregable', 'ID Proyecto', 'Título', 'Estado', 'Fecha Límite'], rows);

            const delivId = await text({ message: 'ID del entregable a evaluar (dejar vacío para volver):' });
            if (!delivId || isCancel(delivId) || !ObjectId.isValid(delivId)) return;

            const choice = await select({
                message: 'Respuesta sobre el entregable:',
                options: [
                    { value: 'aprobado', label: 'Aprobar entregable' },
                    { value: 'rechazado', label: 'Rechazar entregable' }
                ]
            });
            if (isCancel(choice)) return;

            const updateSpinner = UI.createSpinner('Actualizando entregable...').start();
            await this.deliverablesCollection.updateOne({ _id: new ObjectId(delivId) }, { $set: { status: choice } });
            updateSpinner.succeed(chalk.green(`Entregable actualizado a '${choice}'.`));

        } catch (e) {
            spinner.fail('Error al procesar los entregables.');
        }

        await text({ message: 'Presiona ENTER para continuar...' });
    }

    // 6. ESTADO DE CUENTA Y REGISTRO DE PAGOS
    async financesModule() {
        UI.displayHeader('Portal de Clientes > Estado de Cuenta y Pagos');

        const spinner = UI.createSpinner('Cargando historial financiero...').start();
        try {
            const projects = await this.projectsCollection.find({ clientId: this.currentClient._id }).toArray();
            const projectIds = projects.map(p => p._id);

            const finances = await this.financesCollection.find({ projectId: { $in: projectIds } }).toArray();
            spinner.stop();

            if (finances.length > 0) {
                const rows = finances.map(r => [
                    r._id.toString(),
                    r.concept || r.description || 'N/A',
                    `$${r.amount}`,
                    this.renderBadge(r.type),
                    UI.formatDate ? UI.formatDate(r.date || r.createdAt) : dayjs(r.date || r.createdAt).format('YYYY-MM-DD')
                ]);
                UI.renderTable(['ID Transacción', 'Concepto', 'Monto', 'Tipo', 'Fecha'], rows);
            } else {
                this.renderEmptyState('SIN HISTORIAL FINANCIERO', 'No hay registros financieros o pagos previos vinculados a tus proyectos.');
            }

            const makePayment = await select({
                message: '¿Deseas efectuar un nuevo pago?',
                options: [
                    { value: 'pay', label: 'Registrar pago seguro (Transacción ACID)' },
                    { value: 'no', label: 'Volver' }
                ]
            });

            if (makePayment === 'pay') {
                const projId = await text({ message: 'ID del proyecto a pagar:' });
                if (isCancel(projId) || !ObjectId.isValid(projId)) return;

                const amountStr = await text({ message: 'Monto a pagar ($):' });
                const ref = await text({ message: 'Referencia / No. de depósito:' });

                const session = Database.startSession();
                const txSpinner = UI.createSpinner('Procesando pago seguro...').start();

                try {
                    await session.withTransaction(async () => {
                        const dup = await this.financesCollection.findOne({ reference: ref.trim() }, { session });
                        if (dup) throw new Error('Esta referencia de pago ya fue procesada anteriormente.');

                        await this.financesCollection.insertOne({
                            projectId: new ObjectId(projId),
                            type: 'ingreso',
                            amount: parseFloat(amountStr) || 0,
                            concept: 'Pago directo registrado por el cliente',
                            reference: ref.trim(),
                            date: new Date()
                        }, { session });
                    });

                    txSpinner.succeed(chalk.green('Pago verificado y registrado exitosamente.'));

                    // Obtención del proyecto para personalizar el comprobante impreso
                    const targetProject = projects.find(p => p._id.toString() === projId.trim());
                    const projectName = targetProject ? targetProject.name : projId.trim();

                    // Impresión del Comprobante / Recibo Digital
                    const receiptContent = [
                        chalk.bold.cyan('🧾 COMPROBANTE DE TRANSACCIÓN ATÓMICA'),
                        '────────────────────────────────────────────────────────',
                        `• Proyecto:     ${projectName}`,
                        `• Referencia:   ${ref.trim()}`,
                        `• Monto Abonado: $ ${parseFloat(amountStr).toFixed(2)} USD`,
                        `• Fecha:        ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
                        `• Estado:       ${chalk.green.bold('[✔ REGISTRADO EN MONGODB]')}`,
                        '────────────────────────────────────────────────────────'
                    ].join('\n');

                    console.log(
                        boxen(receiptContent, {
                            padding: 1,
                            margin: { top: 1, bottom: 1 },
                            borderStyle: 'double',
                            borderColor: 'green'
                        })
                    );

                } catch (e) {
                    txSpinner.fail(`Error al procesar el pago: ${e.message}`);
                } finally {
                    await session.endSession();
                }
            }

        } catch (e) {
            spinner.fail('Error al consultar movimientos financieros.');
        }

        await text({ message: 'Presiona ENTER para continuar...' });
    }
}