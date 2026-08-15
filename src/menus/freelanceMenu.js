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

    
}