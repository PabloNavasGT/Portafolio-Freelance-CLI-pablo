import 'dotenv/config'
import cliProgress from 'cli-progress';
import chalk from 'chalk';

import Database from './src/config/db.js';
import { MainMenu } from './src/menus/mainMenu.js';
import { UI } from './src/utils/ui.js';


//Muestra el progreso de inicialización del sistema en la consola.

async function initializeApp() {
    UI.displayHeader('Iniciando Sistema...');

    // Configuración de la barra de progreso
    const progressBar = new cliProgress.SingleBar({
        format: `Cargando aplicación | ${chalk.cyan('{bar}')} | {percentage}% | {step}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    }, cliProgress.Presets.shades_classic);

    // Definición de las tareas de arranque
    const steps = [
        { 
            label: 'Verificando variables de entorno...', 
            action: async () => {
                if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI no definida.');
            } 
        },
        { 
            label: 'Estableciendo conexión con MongoDB...', 
            action: async () => await Database.connect() 
        },
        { 
            label: 'Cargando interfaz y controladores...', 
            action: async () => await new Promise(resolve => setTimeout(resolve, 300)) 
        },
        { 
            label: 'Sistema listo.', 
            action: async () => await new Promise(resolve => setTimeout(resolve, 200)) 
        }
    ];

    progressBar.start(steps.length, 0, { step: 'Inicializando...' });

    // Ejecuta cada paso actualizando el estado de la barra
    for (let i = 0; i < steps.length; i++) {
        progressBar.update(i, { step: steps[i].label });
        await steps[i].action();
        progressBar.update(i + 1, { step: steps[i].label });
    }

    progressBar.stop();
    console.log(chalk.green('\n✔ Inicialización completada exitosamente.\n'));
    
    // Pausa breve antes de renderizar el menú interactivo
    await new Promise(resolve => setTimeout(resolve, 600));
}

async function main() {
    try {
        await initializeApp();

        // Lanzar menú principal tras completar la carga
        const mainMenu = new MainMenu();
        await mainMenu.start();
    } catch (error) {
        console.error(chalk.red('\n✖ Error crítico durante el arranque:'), error.message);
    } finally {
        await Database.disconnect();
        process.exit(0);
    }
}

main();