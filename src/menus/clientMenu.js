import { select, text, password, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import validator from 'validator';
import { ObjectId } from 'mongodb';

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
     * Capa de validación e inicio de sesión antes de dar acceso al submenú.
     */
    async login() {
        UI.displayHeader('Acceso al Portal de Clientes');

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
            UI.displayHeader(`Panel de Cliente: ${this.currentClient.name}`);

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
        UI.displayHeader('1. Información de Mi Perfil');

        console.log(chalk.bold('\nDatos del Cliente Autenticado:'));
        console.log(`- ID MongoDB: ${this.currentClient._id}`);
        console.log(`- Nombre:     ${this.currentClient.name}`);
        console.log(`- Correo:     ${this.currentClient.email}`);
        console.log(`- Teléfono:   ${this.currentClient.phone || 'N/A'}\n`);

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
        UI.displayHeader('2. Mis Propuestas Recibidas');

        const spinner = UI.createSpinner('Cargando propuestas...').start();
        try {
            const proposals = await this.proposalsCollection.find({ clientId: this.currentClient._id }).toArray();
            spinner.stop();

            if (proposals.length === 0) {
                console.log(chalk.yellow('\nNo tienes propuestas registradas.\n'));
                await text({ message: 'Presiona ENTER para continuar...' });
                return;
            }

            const rows = proposals.map(p => [p._id.toString(), p.title, `$${p.price}`, p.status.toUpperCase(), p.deadline]);
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
        UI.displayHeader('3. Mis Proyectos en Curso');

        const spinner = UI.createSpinner('Cargando tus proyectos...').start();
        try {
            const projects = await this.projectsCollection.find({ clientId: this.currentClient._id }).toArray();
            spinner.stop();

            if (projects.length === 0) {
                console.log(chalk.yellow('\nNo tienes proyectos activos en este momento.\n'));
            } else {
                const rows = projects.map(p => [p._id.toString(), p.name, p.status.toUpperCase(), `${p.progress || 0}%`]);
                UI.renderTable(['ID Proyecto', 'Nombre Proyecto', 'Estado', 'Avance'], rows);
            }
        } catch (e) {
            spinner.fail('Error al consultar proyectos.');
        }

        await text({ message: 'Presiona ENTER para continuar...' });
    }

    // 4. MIS CONTRATOS
    async contractsModule() {
        UI.displayHeader('4. Mis Contratos');

        const spinner = UI.createSpinner('Cargando proyectos y contratos...').start();
        try {
            const projects = await this.projectsCollection.find({ clientId: this.currentClient._id }).toArray();
            const projectIds = projects.map(p => p._id);

            const contracts = await this.contractsCollection.find({ projectId: { $in: projectIds } }).toArray();
            spinner.stop();

            if (contracts.length === 0) {
                console.log(chalk.yellow('\nNo se encontraron contratos vigentes vinculados a tus proyectos.\n'));
            } else {
                const rows = contracts.map(c => [c._id.toString(), c.projectId.toString(), `$${c.totalValue}`, c.startDate, c.endDate]);
                UI.renderTable(['ID Contrato', 'ID Proyecto', 'Valor Total', 'Inicio', 'Fin'], rows);
            }
        } catch (e) {
            spinner.fail('Error al obtener contratos.');
        }

        await text({ message: 'Presiona ENTER para continuar...' });
    }

    // 5. REVISIÓN Y APROBACIÓN DE ENTREGABLES
    async deliverablesModule() {
        UI.displayHeader('5. Entregables de Mis Proyectos');

        const spinner = UI.createSpinner('Buscando proyectos...').start();
        try {
            const projects = await this.projectsCollection.find({ clientId: this.currentClient._id }).toArray();
            spinner.stop();

            if (projects.length === 0) {
                console.log(chalk.yellow('\nNo cuentas con proyectos activos para revisar entregables.\n'));
                await text({ message: 'Presiona ENTER para continuar...' });
                return;
            }

            const projectIds = projects.map(p => p._id);
            const deliverables = await this.deliverablesCollection.find({ projectId: { $in: projectIds } }).toArray();

            if (deliverables.length === 0) {
                console.log(chalk.yellow('\nNo existen entregables asignados a tus proyectos.\n'));
                await text({ message: 'Presiona ENTER para continuar...' });
                return;
            }

            const rows = deliverables.map(d => [d._id.toString(), d.projectId.toString(), d.title, d.status.toUpperCase(), d.deadline]);
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
        UI.displayHeader('6. Estado de Cuenta y Pagos');

        const spinner = UI.createSpinner('Cargando historial financiero...').start();
        try {
            const projects = await this.projectsCollection.find({ clientId: this.currentClient._id }).toArray();
            const projectIds = projects.map(p => p._id);

            const finances = await this.financesCollection.find({ projectId: { $in: projectIds } }).toArray();
            spinner.stop();

            if (finances.length > 0) {
                const rows = finances.map(r => [r._id.toString(), r.concept, `$${r.amount}`, r.type.toUpperCase(), UI.formatDate(r.date)]);
                UI.renderTable(['ID Transacción', 'Concepto', 'Monto', 'Tipo', 'Fecha'], rows);
            } else {
                console.log(chalk.yellow('\nNo hay registros financieros previos para tus proyectos.\n'));
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