import { ObjectId } from 'mongodb';
import { select, text, password, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import validator from 'validator';

import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import Table from 'cli-table3';
import cliProgress from 'cli-progress';
import dayjs from 'dayjs';
import figures from 'figures';
import logSymbols from 'log-symbols';
import ora from 'ora';

import Database from '.././config/db.js';
import { UI } from '../utils/ui.js';
import Deliverable from '../models/Deliverable.js';
import AppValidator from '../utils/validators.js';
import { generateNextId } from '../utils/idGenerator.js';
import ProposalRepository from '../repositories/proposalRepository.js';

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
     * Auxiliar UI: Genera insignias de estado coloridas sin emojis.
     */
    renderBadge(status) {
        if (!status) return chalk.bgGray.white(' N/A ');
        const st = status.toLowerCase();

        switch (st) {
            case 'pendiente':
            case 'en proceso':
                return chalk.bgYellow.black(` [ ${st.toUpperCase()} ] `);
            case 'aceptada':
            case 'aprobado':
            case 'completado':
            case 'activo':
            case 'ingreso':
                return chalk.bgGreen.black(` [ ${st.toUpperCase()} ] `);
            case 'rechazada':
            case 'rechazado':
            case 'cancelado':
            case 'egreso':
                return chalk.bgRed.white(` [ ${st.toUpperCase()} ] `);
            default:
                return chalk.bgBlue.white(` [ ${st.toUpperCase()} ] `);
        }
    }

    renderProgressBar(percentage = 0) {
        const p = Math.min(100, Math.max(0, percentage));
        const filled = Math.round((p / 100) * 20);
        const empty = 20 - filled;
        const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
        return `${bar} ${p}%`;
    }

    async show() {
        while (true) {
            UI.displayHeader('> Modulo de Cliente > Autenticacion');

            const option = await select({
                message: 'Seleccione una opcion para continuar:',
                options: [
                    { value: 'login', label: 'Iniciar Sesion' },
                    { value: 'exit', label: 'Volver al Menu Principal' }
                ]
            });

            if (isCancel(option) || option === 'exit') break;

            if (option === 'login') {
                const loggedIn = await this.login();
                if (loggedIn) {
                    await this.mainMenu();
                }
            } else if (option === 'register') {
                await this.register();
            }
        }
    }

    async login() {
        UI.displayHeader('> Modulo de Cliente > Iniciar Sesion');

        const email = await text({
            message: 'Correo Electronico:',
            validate: val => (!val || !validator.isEmail(val)) ? 'Ingrese un email valido' : undefined
        });
        if (isCancel(email)) return false;

        const pass = await password({
            message: 'Contrasena:',
            mask: '*'
        });
        if (isCancel(pass)) return false;

        const spinner = ora('Verificando credenciales...').start();
        const client = await this.clientRepo.findByCredentials(email.trim().toLowerCase(), pass);

        if (client) {
            this.currentClient = client;
            spinner.succeed(chalk.green(`Bienvenido de nuevo, ${client.name}!`));
            await text({ message: 'Presione ENTER para continuar al panel...' });
            return true;
        } else {
            spinner.fail(chalk.red('Credenciales incorrectas. Intente nuevamente.'));
            await text({ message: 'Presione ENTER para continuar...' });
            return false;
        }
    }

    async register() {
        UI.displayHeader('> Modulo de Cliente > Registro de Nuevo Cliente');

        const name = await text({
            message: 'Nombre completo:',
            validate: val => (!val || val.trim().length === 0) ? 'El nombre es requerido' : undefined
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

        const spinner = ora('Registrando nuevo cliente...').start();

        const existing = await this.clientsCollection.findOne({ email: email.trim().toLowerCase() });
        if (existing) {
            spinner.fail(chalk.red('El correo electronico ya esta registrado.'));
            await text({ message: 'Presione ENTER para continuar...' });
            return;
        }

        const newClientId = await generateNextId(this.clientsCollection, 'C');

        const newClientDoc = {
            _id: newClientId,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: pass,
            phone: phone ? phone.trim() : null,
            createdAt: new Date()
        };

        await this.clientsCollection.insertOne(newClientDoc);
        spinner.succeed(chalk.green(`Cliente registrado con exito con ID: ${newClientId}. Ahora puede iniciar sesion.`));
        await text({ message: 'Presione ENTER para continuar...' });
    }

    async mainMenu() {
        while (true) {
            UI.displayHeader(`> Panel de Cliente > Sesion: ${this.currentClient.name}`);
            await this.renderClientBanner();
            const option = await select({
                message: 'Seleccione una opcion:',
                options: [
                    { value: 'proposals', label: 'Mis Propuestas' },
                    { value: 'projects', label: 'Mis Proyectos y Entregables' },
                    { value: 'finances', label: 'Estado Financiero y Pagos' },
                    { value: 'logout', label: 'Cerrar Sesion' }
                ]
            });

            if (isCancel(option) || option === 'logout') {
                this.currentClient = null;
                break;
            }

            switch (option) {
                case 'proposals':
                    await this.gestionarPropuestas();
                    break;
                case 'projects':
                    await this.gestionarProyectos();
                    break;
                case 'finances':
                    await this.gestionarFinanzas();
                    break;
            }
        }
    }

    //Banner informativo en amarillo para el Menú Principal del Cliente
    async renderClientBanner() {
        try {
            if (!this.currentClient) return;

            // 1. Contador de propuestas pendientes
            const pendingProposals = await this.proposalsCollection.countDocuments({
                clientId: this.currentClient._id,
                status: { $in: ['pendiente', 'PENDIENTE'] }
            });

            // 2. Contador de entregables pendientes de aprobación
            const pendingDeliverables = await this.deliverablesCollection.countDocuments({
                clientId: this.currentClient._id,
                status: { $in: ['pendiente_aprobacion', 'en_revision', 'por_aprobar'] }
            });

            // 3. Contador de proyectos pendientes de aprobación final
            const pendingProjects = await this.projectsCollection.countDocuments({
                clientId: this.currentClient._id,
                status: { $in: ['pendiente_aprobacion', 'por_aprobar'] }
            });

            if (pendingProposals > 0 || pendingDeliverables > 0 || pendingProjects > 0) {
                const bannerLines = [
                    chalk.bold.black.bgYellow(' ⚠️  ACCIONES PENDIENTES DE REVISIÓN '),
                    '---------------------------------------------------'
                ];

                if (pendingProposals > 0) {
                    bannerLines.push(chalk.yellow(`• Tienes ${pendingProposals} propuesta(s) nueva(s) pendiente(s) de revisión.`));
                }
                if (pendingDeliverables > 0) {
                    bannerLines.push(chalk.yellow(`• Tienes ${pendingDeliverables} entregable(s) pendiente(s) de aprobación.`));
                }
                if (pendingProjects > 0) {
                    bannerLines.push(chalk.yellow(`• Tienes ${pendingProjects} proyecto(s) finalizado(s) pendiente(s) de aprobación.`));
                }

                console.log(
                    boxen(bannerLines.join('\n'), {
                        padding: 1,
                        margin: { top: 1, bottom: 1 },
                        borderStyle: 'double',
                        borderColor: 'yellow'
                    })
                );
            }
        } catch (e) {
            // Manejo silencioso para no interrumpir el flujo principal
        }
    }

    // SUBMODULO: PROPUESTAS

    async gestionarPropuestas() {
        while (true) {
            UI.displayHeader('> Panel de Cliente > Gestion de Propuestas');

            const option = await select({
                message: 'Seleccione una operacion:',
                options: [
                    { value: 'list', label: 'Ver Propuestas Recibidas' },
                    { value: 'respond', label: 'Aceptar o Rechazar Propuesta' },
                    { value: 'avances', label: 'Ver Avances y Tareas de Propuestas / Proyectos' },
                    { value: 'back', label: 'Volver al Menu' }
                ]
            });

            if (isCancel(option) || option === 'back') break;

            if (option === 'list') await this.verPropuestas();
            if (option === 'respond') await this.responderPropuesta();
            if (option === 'avances') await this.verAvancesYBitacoraProyectos();
        }
    }

    async verPropuestas() {
        UI.displayHeader('> Panel de Cliente > Propuestas Recibidas');

        try {
            const propuestas = await this.proposalsCollection.find({ clientId: this.currentClient._id }).toArray();

            if (!propuestas || propuestas.length === 0) {
                console.log(
                    boxen(chalk.yellow('[!] No tiene propuestas registradas por el momento.'), { padding: 1, margin: 1, borderStyle: 'round' })
                );
            } else {
                const table = new Table({
                    head: [
                        chalk.cyan('ID'),
                        chalk.cyan('Titulo'),
                        chalk.cyan('Precio (USD)'),
                        chalk.cyan('Estado'),
                        chalk.cyan('Fecha')
                    ],
                    colWidths: [10, 30, 15, 18, 15]
                });

                propuestas.forEach(p => {
                    table.push([
                        p._id || 'N/A',
                        p.title || 'Sin titulo',
                        `$${p.price || 0}`,
                        this.renderBadge(p.status),
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

    //Responder Propuestas con motivo de rechazo obligatorio en caso de negativa
    async responderPropuesta() {
        UI.displayHeader('> Panel de Cliente > Aceptar o Rechazar Propuesta');

        try {
            const pendientes = await this.proposalsCollection.find({
                clientId: this.currentClient._id,
                status: { $in: ['pendiente', 'PENDIENTE'] }
            }).toArray();

            if (!pendientes || pendientes.length === 0) {
                console.log(
                    boxen(chalk.yellow('[ℹ] No tiene propuestas pendientes por responder.'), { padding: 1, margin: 1, borderStyle: 'round' })
                );
                await text({ message: 'Presione ENTER para continuar...' });
                return;
            }

            const choices = pendientes.map(p => ({
                value: p._id.toString(),
                label: `[${p._id}] ${p.title || 'Sin titulo'} - $${p.price || 0}`
            }));

            const selection = await select({
                message: 'Seleccione la propuesta a responder:',
                options: choices
            });

            if (isCancel(selection)) return;

            const action = await select({
                message: '¿Qué respuesta desea dar a esta propuesta?',
                options: [
                    { value: 'aceptar', label: 'Aceptar Propuesta' },
                    { value: 'rechazar', label: 'Rechazar Propuesta' }
                ]
            });

            if (isCancel(action)) return;

            let rejectionReason = null;
            if (action === 'rechazar') {
                rejectionReason = await text({
                    message: 'Ingrese el motivo por el cual rechaza la propuesta (Obligatorio):',
                    validate: (val) => {
                        if (!val || val.trim().length === 0) {
                            return 'Debe especificar la razón del rechazo para notificar al freelancer.';
                        }
                    }
                });
                if (isCancel(rejectionReason)) return;
            }

            const spinner = ora('Procesando respuesta...').start();
            
            // Búsqueda flexible por ObjectId o String
            const targetId = ObjectId.isValid(selection) ? new ObjectId(selection) : selection;
            const propuestaExistente = await this.proposalsCollection.findOne({
                $or: [{ _id: targetId }, { _id: selection }]
            });

            if (!propuestaExistente) {
                spinner.fail(chalk.red('[✖] No se encontró la propuesta seleccionada.'));
                await text({ message: 'Presione ENTER para continuar...' });
                return;
            }

            const actualId = propuestaExistente._id;

            if (action === 'aceptar') {
                const session = Database.startSession();
                try {
                    let newContractId = '';
                    let newProjectId = '';

                    await session.withTransaction(async () => {
                        const numericPrice = Number(parseFloat(propuestaExistente.price || 0));
                        const formattedClientId = (typeof propuestaExistente.clientId === 'string' && ObjectId.isValid(propuestaExistente.clientId))
                            ? new ObjectId(propuestaExistente.clientId)
                            : propuestaExistente.clientId;

                        await this.proposalsCollection.updateOne(
                            { _id: actualId },
                            { 
                                $set: { 
                                    status: 'aceptada',
                                    price: numericPrice,
                                    clientId: formattedClientId,
                                    updatedAt: new Date()
                                } 
                            },
                            { session }
                        );

                        newContractId = await generateNextId(this.contractsCollection, 'CT');
                        const nuevoContrato = {
                            _id: newContractId,
                            code: newContractId,
                            title: String(`Contrato: ${propuestaExistente.title || 'Sin titulo'}`).trim(),
                            terms: `Aprobacion de propuesta ${propuestaExistente._id}`,
                            totalValue: numericPrice,
                            amount: numericPrice,
                            clientId: formattedClientId,
                            proposalId: actualId,
                            status: 'activo',
                            startDate: new Date(),
                            endDate: dayjs().add(1, 'month').toDate(),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        await this.contractsCollection.insertOne(nuevoContrato, { session });

                        newProjectId = await generateNextId(this.projectsCollection, 'A');
                        const nuevoProyecto = {
                            _id: newProjectId,
                            name: String(propuestaExistente.title || 'Sin titulo').trim(),
                            description: String(propuestaExistente.description || '').trim(),
                            clientId: formattedClientId,
                            contractId: newContractId,
                            proposalId: actualId,
                            status: 'activo',
                            progress: 0,
                            budget: numericPrice,
                            logs: [{
                                note: `Proyecto iniciado automaticamente tras aprobacion de propuesta ${propuestaExistente._id}`,
                                state: 'en proceso',
                                percentage: 0,
                                date: new Date()
                            }],
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        await this.projectsCollection.insertOne(nuevoProyecto, { session });

                        // Crear notificación de aprobación para el freelancer
                        await this.db.collection('notifications').insertOne({
                            freelancerId: propuestaExistente.freelancerId || propuestaExistente.userId,
                            proposalId: actualId,
                            title: 'Propuesta Aceptada',
                            message: `El cliente ha aceptado tu propuesta: "${propuestaExistente.title}". Se ha creado el proyecto ${newProjectId}.`,
                            type: 'proposal_accepted',
                            read: false,
                            createdAt: new Date()
                        }, { session });
                    });

                    spinner.succeed(chalk.green('[✔] Propuesta aprobada exitosamente.'));

                    const cardInfo = [
                        chalk.bold.green('[✔] SE HAN CREADO PROYECTO Y CONTRATO AUTOMATICO'),
                        '--------------------------------------------------',
                        `Propuesta ID: ${actualId}`,
                        `Contrato ID:  ${newContractId}`,
                        `Proyecto ID:  ${newProjectId}`,
                        `Cliente ID:   ${this.currentClient._id}`
                    ].join('\n');

                    console.log(boxen(cardInfo, { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'green' }));

                } catch (err) {
                    spinner.fail(chalk.red(`[✖] Error en la transacción: ${err.message}`));
                } finally {
                    await session.endSession();
                }
            } else {
                // RECHAZO DE PROPUESTA
                await this.proposalsCollection.updateOne(
                    { _id: actualId },
                    { 
                        $set: { 
                            status: 'rechazada', 
                            rejectionReason: rejectionReason.trim(),
                            updatedAt: new Date() 
                        } 
                    }
                );

                // Crear registro explícito en la colección de notificaciones
                const notificationsColl = this.db.collection('notifications');
                await notificationsColl.insertOne({
                    freelancerId: propuestaExistente.freelancerId || propuestaExistente.userId,
                    proposalId: actualId,
                    title: 'Propuesta Rechazada',
                    message: `El cliente ${this.currentClient.name || ''} ha rechazado tu propuesta: "${propuestaExistente.title || 'Sin título'}". Motivo: ${rejectionReason.trim()}`,
                    type: 'proposal_rejected',
                    rejectionReason: rejectionReason.trim(),
                    read: false,
                    createdAt: new Date()
                });

                spinner.succeed(chalk.green('[✔] Propuesta rechazada y motivo registrado correctamente.'));
            }
        } catch (e) {
            console.log(chalk.red(`[✖] Error al procesar la operacion: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    //Aprobar o Rechazar Entregables asignados al cliente
    async aprobarORechazarEntregable() {
        UI.displayHeader('> Panel de Cliente > Evaluación de Entregables');
        try {
            const entregables = await this.deliverablesCollection.find({
                clientId: this.currentClient._id,
                status: { $in: ['pendiente_aprobacion', 'en_revision', 'pendiente', 'completado'] }
            }).toArray();

            if (!entregables || entregables.length === 0) {
                console.log(boxen(chalk.yellow('[ℹ] No hay entregables pendientes de aprobación.'), { padding: 1, margin: 1, borderStyle: 'round' }));
                await text({ message: 'Presione ENTER para continuar...' });
                return;
            }

            const choices = entregables.map(d => ({
                value: d._id.toString(),
                label: `[${d._id}] ${d.title} (Estado actual: ${d.status})`
            }));

            const selectedId = await select({ message: 'Seleccione el entregable a evaluar:', options: choices });
            if (isCancel(selectedId)) return;

            const decision = await select({
                message: '¿Qué acción desea tomar sobre este entregable?',
                options: [
                    { value: 'aprobar', label: 'Aprobar Entregable' },
                    { value: 'rechazar', label: 'Rechazar Entregable (Solicitar Ajustes)' }
                ]
            });
            if (isCancel(decision)) return;

            let razonRechazo = null;
            if (decision === 'rechazar') {
                razonRechazo = await text({
                    message: 'Ingrese la razón/motivo por la cual se rechaza el entregable:',
                    validate: val => (!val || val.trim().length === 0) ? 'Debe especificar la razón del rechazo' : undefined
                });
                if (isCancel(razonRechazo)) return;
            }

            const spinner = ora('Actualizando estado del entregable...').start();
            const entregableSel = entregables.find(d => d._id.toString() === selectedId);

            if (decision === 'aprobar') {
                await this.deliverablesCollection.updateOne(
                    { _id: selectedId },
                    { $set: { status: 'aprobado', approvedAt: new Date(), updatedAt: new Date() } }
                );

                if (entregableSel && entregableSel.projectId) {
                    await this.syncProjectProgress(entregableSel.projectId);
                }

                spinner.succeed(chalk.green(`Entregable [${selectedId}] aprobado con éxito.`));
            } else {
                await this.deliverablesCollection.updateOne(
                    { _id: selectedId },
                    { 
                        $set: { 
                            status: 'rechazado', 
                            rejectionReason: razonRechazo.trim(),
                            updatedAt: new Date() 
                        } 
                    }
                );
                spinner.succeed(chalk.red(`Entregable [${selectedId}] rechazado. Motivo registrado.`));
            }
        } catch (e) {
            console.log(chalk.red(`Error al procesar entregable: ${e.message}`));
        }
        await text({ message: 'Presione ENTER para continuar...' });
    }

    async syncProjectProgress(projectId) {
        if (!projectId) return;
        const deliverables = await this.deliverablesCollection.find({ projectId }).toArray();
        if (!deliverables || deliverables.length === 0) return;

        const completed = deliverables.filter(d => ['completado', 'aprobado'].includes(d.status)).length;
        const progressNum = Math.round((completed / deliverables.length) * 100);

        await this.projectsCollection.updateOne(
            { _id: projectId },
            { $set: { progress: progressNum, updatedAt: new Date() } }
        );
    }

    //Aprobar o Rechazar Proyecto Finalizado
    async aprobarORechazarProyecto() {
        UI.displayHeader('> Panel de Cliente > Evaluación de Proyecto Finalizado');
        try {
            const proyectos = await this.projectsCollection.find({
                clientId: this.currentClient._id,
                status: { $in: ['pendiente_aprobacion', 'por_aprobar', 'completado', 'activo'] }
            }).toArray();

            if (!proyectos || proyectos.length === 0) {
                console.log(boxen(chalk.yellow('[ℹ] No hay proyectos pendientes de cierre/aprobación.'), { padding: 1, margin: 1, borderStyle: 'round' }));
                await text({ message: 'Presione ENTER para continuar...' });
                return;
            }

            const choices = proyectos.map(p => ({
                value: p._id.toString(),
                label: `[${p._id}] ${p.name} (Progreso: ${p.progress || 0}%)`
            }));

            const selectedId = await select({ message: 'Seleccione el proyecto a evaluar:', options: choices });
            if (isCancel(selectedId)) return;

            const decision = await select({
                message: '¿Acepta y aprueba la finalización de este proyecto?',
                options: [
                    { value: 'aprobar', label: ' Aprobar y Cerrar Proyecto' },
                    { value: 'rechazar', label: 'Rechazar Finalización (Solicitar Revisiones)' }
                ]
            });
            if (isCancel(decision)) return;

            let razonRechazo = null;
            if (decision === 'rechazar') {
                razonRechazo = await text({
                    message: 'Ingrese la razón/motivo de rechazo del proyecto:',
                    validate: val => (!val || val.trim().length === 0) ? 'Debe especificar el motivo de rechazo' : undefined
                });
                if (isCancel(razonRechazo)) return;
            }

            const spinner = ora('Actualizando estado del proyecto...').start();

            if (decision === 'aprobar') {
                await this.projectsCollection.updateOne(
                    { _id: selectedId },
                    { $set: { status: 'completado', approvedAt: new Date(), updatedAt: new Date() } }
                );
                spinner.succeed(chalk.green(`Proyecto [${selectedId}] aprobado y marcado como COMPLETADO.`));
            } else {
                await this.projectsCollection.updateOne(
                    { _id: selectedId },
                    { 
                        $set: { 
                            status: 'rechazado', 
                            rejectionReason: razonRechazo.trim(),
                            updatedAt: new Date() 
                        } 
                    }
                );
                spinner.succeed(chalk.red(`Proyecto [${selectedId}] rechazado. Motivo guardado.`));
            }
        } catch (e) {
            console.log(chalk.red(`Error al evaluar proyecto: ${e.message}`));
        }
        await text({ message: 'Presione ENTER para continuar...' });
    }

    // SUBMODULO: PROYECTOS Y ENTREGABLES

    async gestionarProyectos() {
        while (true) {
            UI.displayHeader('> Panel de Cliente > Gestion de Proyectos y Entregables');

            const option = await select({
                message: 'Seleccione una operacion:',
                options: [
                    { value: 'list', label: 'Ver Mis Proyectos' },
                    { value: 'deliverable', label: 'Solicitar / Asignar Entregable a Proyecto' },
                    { value: 'evaluarEntregable', label: 'Evaluar / Aprobar Entregables' },
                    { value: 'evaluarProyecto', label: 'Evaluar / Aprobar Cierre de Proyecto' },
                    { value: 'avances', label: 'Ver Bitacora de Avances y Entregables' },
                    { value: 'back', label: 'Volver al Menu' }
                ]
            });

            if (isCancel(option) || option === 'back') break;

            if (option === 'list') await this.verProyectos();
            if (option === 'deliverable') await this.crearEntregableCliente();
            if (option === 'evaluarEntregable') await this.aprobarORechazarEntregable();
            if (option === 'evaluarProyecto') await this.aprobarORechazarProyecto();
            if (option === 'avances') await this.verAvancesYBitacoraProyectos();
        }
    }

    async verProyectos() {
        UI.displayHeader('> Panel de Cliente > Mis Proyectos');

        try {
            const proyectos = await this.projectsCollection.find({ clientId: this.currentClient._id }).toArray();

            if (!proyectos || proyectos.length === 0) {
                console.log(
                    boxen(chalk.yellow('[!] No tiene proyectos activos registrados.'), { padding: 1, margin: 1, borderStyle: 'round' })
                );
            } else {
                const table = new Table({
                    head: [
                        chalk.cyan('ID'),
                        chalk.cyan('Nombre del Proyecto'),
                        chalk.cyan('Estado'),
                        chalk.cyan('Progreso'),
                        chalk.cyan('Presupuesto')
                    ],
                    colWidths: [10, 30, 15, 25, 15]
                });

                proyectos.forEach(p => {
                    table.push([
                        p._id || 'N/A',
                        p.name || 'Sin nombre',
                        this.renderBadge(p.status),
                        this.renderProgressBar(p.progress || 0),
                        `$${p.budget || 0}`
                    ]);
                });

                console.log(table.toString());
            }
        } catch (e) {
            console.log(chalk.red(`Error al cargar proyectos: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async crearEntregableCliente() {
        UI.displayHeader('> Panel de Cliente > Registrar Solicitud de Entregable / Requisito para Freelance');

        try {
            const proyectos = await this.projectsCollection.find({ clientId: this.currentClient._id }).toArray();

            if (!proyectos || proyectos.length === 0) {
                console.log(
                    boxen(chalk.yellow('[!] No tiene proyectos registrados para asignar entregables.'), { padding: 1, margin: 1, borderStyle: 'round' })
                );
                await text({ message: 'Presione ENTER para continuar...' });
                return;
            }

            const choices = proyectos.map(p => ({
                value: p._id,
                label: `[${p._id}] ${p.name} (Progreso: ${p.progress || 0}%)`
            }));

            const projectIdStr = await select({
                message: 'Seleccione el proyecto al que pertenece el entregable:',
                options: choices
            });
            if (isCancel(projectIdStr)) return;

            // 1. Titulo del entregable
            const title = await text({
                message: 'Ingrese el titulo del entregable:',
                placeholder: 'Ej. Diseno de prototipos UI/UX',
                validate(value) {
                    const validacion = AppValidator.validateRequired(value, 'El titulo del entregable');
                    if (validacion !== true) return validacion;
                }
            });
            if (isCancel(title)) return;

            // 2. Tiempo de entrega / fecha límite con select
            const durationOption = await select({
                message: 'Seleccione el tiempo de entrega / fecha límite:',
                options: [
                    { value: '1_week', label: '1 Semana (7 días)' },
                    { value: '1_month', label: '1 Mes (30 días)' },
                    { value: 'custom', label: 'Ingresar fecha manualmente (YYYY-MM-DD)' }
                ]
            });
            if (isCancel(durationOption)) return;

            let fechaFinal = null;

            if (durationOption === '1_week') {
                fechaFinal = dayjs().add(7, 'day').toDate();
            } else if (durationOption === '1_month') {
                fechaFinal = dayjs().add(30, 'day').toDate();
            } else {
                const deadlineInput = await text({
                    message: 'Ingrese la fecha limite (YYYY-MM-DD):',
                    placeholder: dayjs().add(7, 'day').format('YYYY-MM-DD'),
                    validate(value) {
                        if (!value || value.trim() === '') return 'La fecha es requerida';
                        if (!AppValidator.isValidDeadline(value.trim())) {
                            return '[ADVERTENCIA] Formato de fecha invalido. Use YYYY-MM-DD (ej. 2026-12-31).';
                        }
                    }
                });
                if (isCancel(deadlineInput)) return;
                fechaFinal = dayjs(deadlineInput.trim()).toDate();
            }

            const spinner = ora('Guardando entregable en la base de datos...').start();
            const newDeliverableId = await generateNextId(this.deliverablesCollection, 'E');

            const nuevoEntregable = {
                _id: newDeliverableId,
                title: title.trim(),
                projectId: projectIdStr,
                clientId: this.currentClient._id,
                deadline: fechaFinal,
                dueDate: fechaFinal,
                status: 'pendiente',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await this.deliverablesCollection.insertOne(nuevoEntregable);
            spinner.succeed(chalk.green(`[OK] Entregable registrado correctamente con ID: ${newDeliverableId}`));

        } catch (e) {
            console.log(chalk.red(`Error al registrar el entregable: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

    async verAvancesYBitacoraProyectos() {
        UI.displayHeader('> Panel de Cliente > Avances, Tareas y Bitacora de Proyectos');

        try {
            const proyectos = await this.projectsCollection.find({ clientId: this.currentClient._id }).toArray();

            if (!proyectos || proyectos.length === 0) {
                console.log(
                    boxen(chalk.yellow('[!] No tiene proyectos asociados para ver bitacora.'), { padding: 1, margin: 1, borderStyle: 'round' })
                );
                await text({ message: 'Presione ENTER para continuar...' });
                return;
            }

            const projectIds = proyectos.map(p => p._id);
            const entregables = await this.deliverablesCollection.find({ projectId: { $in: projectIds } }).toArray();

            proyectos.forEach(p => {
                console.log('\n' + chalk.bold.cyan(`===== PROYECTO: [${p._id}] ${p.name} =====`));
                console.log(`Estado: ${this.renderBadge(p.status)} | Progreso: ${this.renderProgressBar(p.progress || 0)} | Presupuesto: $${p.budget || 0}`);

                console.log(chalk.bold.yellow('\n--- Bitacora de Avances / Logs ---'));
                if (p.logs && p.logs.length > 0) {
                    p.logs.forEach((log, idx) => {
                        const fecha = log.date ? dayjs(log.date).format('YYYY-MM-DD HH:mm') : 'N/A';
                        console.log(` [${idx + 1}] ${fecha} - (${log.percentage}%): ${log.note}`);
                    });
                } else {
                    console.log(chalk.gray(' (Sin registros de avance en la bitacora)'));
                }

                console.log(chalk.bold.magenta('\n--- Entregables y Requisitos Asignados ---'));
                const entProy = entregables.filter(e => e.projectId === p._id);
                if (entProy && entProy.length > 0) {
                    entProy.forEach(ent => {
                        const fecha = ent.dueDate || ent.deadline;
                        const fechaFormateada = fecha ? dayjs(fecha).format('YYYY-MM-DD') : 'N/A';
                        console.log(` - ${this.renderBadge(ent.status)} [${ent._id}] ${ent.title} (Fecha Limite: ${fechaFormateada})`);
                    });
                } else {
                    console.log(chalk.gray(' (No hay entregables o tareas registradas para este proyecto)'));
                }
            });

        } catch (e) {
            console.log(chalk.red(`Error al cargar la bitacora de avances: ${e.message}`));
        }

        await text({ message: '\nPresione ENTER para volver...' });
    }

    // SUBMODULO: FINANZAS Y PAGOS

    async gestionarFinanzas() {
        while (true) {
            UI.displayHeader('> Panel de Cliente > Estado Financiero y Pagos');

            const option = await select({
                message: 'Seleccione una operacion:',
                options: [
                    { value: 'list', label: 'Ver Movimientos Financieros' },
                    { value: 'pay', label: 'Registrar Pago / Transferencia' },
                    { value: 'back', label: 'Volver al Menu' }
                ]
            });

            if (isCancel(option) || option === 'back') break;

            if (option === 'list') await this.verMovimientosFinancieros();
            if (option === 'pay') await this.registrarPagoCliente();
        }
    }

    async verMovimientosFinancieros() {
        UI.displayHeader('> Panel de Cliente > Estado Financiero y Movimientos');

        try {
            const proyectos = await this.projectsCollection.find({ clientId: this.currentClient._id }).toArray();
            const projectIds = proyectos.map(p => p._id);

            const movimientos = await this.financesCollection.find({
                $or: [
                    { clientId: this.currentClient._id },
                    { projectId: { $in: projectIds } }
                ]
            }).toArray();

            if (!movimientos || movimientos.length === 0) {
                console.log(
                    boxen(chalk.yellow('[!] No hay movimientos financieros registrados.'), { padding: 1, margin: 1, borderStyle: 'round' })
                );
            } else {
                const table = new Table({
                    head: [
                        chalk.cyan('Referencia'),
                        chalk.cyan('Tipo'),
                        chalk.cyan('Monto (USD)'),
                        chalk.cyan('Concepto'),
                        chalk.cyan('Fecha')
                    ],
                    colWidths: [15, 12, 15, 30, 20]
                });

                let totalAbonado = 0;

                movimientos.forEach(m => {
                    const monto = Number(m.amount) || 0;
                    if (m.type === 'ingreso') totalAbonado += monto;

                    table.push([
                        m.referenceCode || m._id || 'N/A',
                        this.renderBadge(m.type),
                        `$${monto.toFixed(2)}`,
                        m.concept || m.description || m.concepto || 'S/D',
                        m.createdAt ? dayjs(m.createdAt).format('YYYY-MM-DD HH:mm') : 'N/A'
                    ]);
                });

                console.log(table.toString());
                console.log(
                    boxen(chalk.bold.green(`Total Abonado por el Cliente: $${totalAbonado.toFixed(2)} USD`), { padding: 1, margin: 1, borderStyle: 'double' })
                );
            }
        } catch (e) {
            console.log(chalk.red(`Error al cargar los movimientos financieros: ${e.message}`));
        }

        await text({ message: 'Presione ENTER para continuar...' });
    }

async registrarPagoCliente() {
    UI.displayHeader('REGISTRAR PAGO / ABONO DE PROYECTO');
    try {

        // 1. Obtener proyectos disponibles
        const proyectos = await this.projectsCollection.find({}).toArray();
        if (proyectos.length === 0) {
            console.log(chalk.yellow('No hay proyectos registrados para realizar abonos.'));
            await text({ message: 'Presione ENTER para continuar...' });
            return;
        }

        const projectOptions = proyectos.map(p => ({
            value: String(p._id),
            label: `[${p._id}] ${p.name} - Presupuesto: $${p.budget || p.price || 0}`
        }));

        const projectIdStr = await select({
            message: 'Seleccione el proyecto al que desea abonar:',
            options: projectOptions
        });

        if (isCancel(projectIdStr)) return;

        const proyectoSel = proyectos.find(p => String(p._id) === projectIdStr);
        const totalBudget = parseFloat(proyectoSel.budget || proyectoSel.price || 0);

        // 2. Modalidades de pago
        const tipoPago = await select({
            message: 'Seleccione la modalidad de abono:',
            options: [
                { value: '100', label: `100% - Total del presupuesto ($${totalBudget.toFixed(2)} USD)` },
                { value: '50', label: `50% - Mitad del presupuesto ($${(totalBudget * 0.5).toFixed(2)} USD)` },
                { value: 'custom_percent', label: 'Porcentaje personalizado (%)' },
                { value: 'custom_amount', label: 'Monto fijo personalizado (USD)' }
            ]
        });

        if (isCancel(tipoPago)) return;

        let amountToPay = 0;

        if (tipoPago === '100') {
            amountToPay = totalBudget;
        } else if (tipoPago === '50') {
            amountToPay = totalBudget * 0.5;
        } else if (tipoPago === 'custom_percent') {
            const percentStr = await text({
                message: 'Ingrese el porcentaje a abonar (1-100):',
                validate(val) {
                    const num = parseFloat(val);
                    if (isNaN(num) || num <= 0 || num > 100) {
                        return 'Ingrese un porcentaje valido entre 1 y 100.';
                    }
                }
            });
            if (isCancel(percentStr)) return;
            amountToPay = (totalBudget * parseFloat(percentStr)) / 100;
        } else if (tipoPago === 'custom_amount') {
            const customAmountStr = await text({
                message: 'Monto a pagar (USD):',
                validate(val) {
                    const num = parseFloat(val);
                    if (isNaN(num) || num <= 0) {
                        return 'Ingrese un monto valido mayor a 0.';
                    }
                }
            });
            if (isCancel(customAmountStr)) return;
            amountToPay = parseFloat(customAmountStr);
        }

        console.log(chalk.cyan(`\nMonto a abonar: $${amountToPay.toFixed(2)} USD\n`));

        // 3. Resolucion previa de la promesa para el ID de referencia
        const defaultRef = await generateNextId(this.financesCollection, 'SPF');

        const referenceInput = await text({
            message: 'Ingrese el codigo de referencia (Ej: SPF-001):',
            initialValue: defaultRef,
            validate(val) {
                if (!val || val.trim().length === 0) {
                    return 'El codigo de referencia no puede estar vacio.';
                }
            }
        });

        if (isCancel(referenceInput)) return;
        const refUpper = referenceInput.trim().toUpperCase();

        // Validacion asincrona fuera del callback validate
        const refExists = await this.financesCollection.findOne({ reference: refUpper });
        if (refExists) {
            console.log(chalk.red(`Error: La referencia '${refUpper}' ya existe en la base de datos.`));
            await text({ message: 'Presione ENTER para continuar...' });
            return;
        }

        // 4. Registro en la base de datos
        const txSpinner = ora('Procesando transaccion en MongoDB...').start();
        const session = Database.getClient().startSession();

        try {
            await session.withTransaction(async () => {
                const txId = await generateNextId(this.financesCollection, 'TX');
                const transactionData = {
                    _id: txId,
                    projectId: proyectoSel._id,
                    clientId: this.currentClient ? this.currentClient._id : null,
                    type: 'INCOME',
                    amount: amountToPay,
                    reference: refUpper,
                    concept: `Abono a proyecto ${proyectoSel.name}`,
                    date: new Date(),
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await this.financesCollection.insertOne(transactionData, { session });
            });

            txSpinner.succeed('Pago registrado exitosamente.');

            const receiptContent = [
                chalk.bold.cyan('COMPROBANTE DE TRANSACCION ATOMICA'),
                '--------------------------------------------------------',
                `- Proyecto:     ${proyectoSel.name}`,
                `- Referencia:   ${refUpper}`,
                `- Monto Abonado: $ ${amountToPay.toFixed(2)} USD`,
                `- Fecha:        ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`,
                `- Estado:       ${chalk.green.bold('[REGISTRADO EN MONGODB]')}`,
                '--------------------------------------------------------'
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

    } catch (e) {
        console.log(chalk.red(`Error al procesar la operacion financiera: ${e.message}`));
    }

    await text({ message: 'Presione ENTER para continuar...' });
}
}
export default ClientMenu;