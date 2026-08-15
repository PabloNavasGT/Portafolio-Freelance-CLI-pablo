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

    