import 'dotenv/config';
import cliProgress from 'cli-progress';
import chalk from 'chalk';

// Importación del singleton de la base de datos MongoDB
import Database from './src/config/db.js';
import { MainMenu } from './src/menus/mainMenu.js';
import { UI } from './src/utils/ui.js';

async function initializeApp() {
    // Despliega el encabezado visual con el título de inicio
    UI.displayHeader('Iniciando Sistema...');

    // Configuración de la barra de progreso con diseño personalizado
    const progressBar = new cliProgress.SingleBar({
        format: `Cargando aplicación | ${chalk.cyan('{bar}')} | {percentage}% | {step}`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    }, cliProgress.Presets.shades_classic);

    // Definición de las tareas secuenciales de arranque del sistema
    const steps = [
        { 
            label: 'Verificando variables de entorno...', 
            action: async () => {
                // Validación de la presencia de la cadena de conexión de MongoDB
                if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI no definida.');
            } 
        },
        { 
            label: 'Estableciendo conexión con MongoDB...', 
            // Conexión activa a la base de datos
            action: async () => await Database.connect() 
        },
        { 
            label: 'Cargando interfaz y controladores...', 
            // Pausa simulada para carga suave de componentes visuales
            action: async () => await new Promise(resolve => setTimeout(resolve, 300)) 
        },
        { 
            label: 'Sistema listo.', 
            // Pausa final de confirmación
            action: async () => await new Promise(resolve => setTimeout(resolve, 200)) 
        }
    ];

    // Inicia el renderizado de la barra de progreso
    progressBar.start(steps.length, 0, { step: 'Inicializando...' });

    // Ejecución iterativa de cada paso actualizando el estado visual de la barra
    for (let i = 0; i < steps.length; i++) {
        progressBar.update(i, { step: steps[i].label });
        await steps[i].action(); // Ejecuta la función asíncrona del paso
        progressBar.update(i + 1, { step: steps[i].label });
    }

    // Detiene la animación de la barra de progreso
    progressBar.stop();
    console.log(chalk.green('\n✔ Inicialización completada exitosamente.\n'));
    
    // Pausa breve antes de renderizar el menú interactivo principal
    await new Promise(resolve => setTimeout(resolve, 600));
}

/**
 * Función principal que orquesta el ciclo de vida de la aplicación.
 */
async function main() {
    try {
        // Ejecuta el flujo de carga y conexión
        await initializeApp();

        // Instanciación y despliegue del menú principal tras completar la carga
        const mainMenu = new MainMenu();
        await mainMenu.start();
    } catch (error) {
        // Captura y muestra cualquier falla crítica durante la inicialización
        console.error(chalk.red('\n✖ Error crítico durante el arranque:'), error.message);
    } finally {
        // Desconexión segura de MongoDB al finalizar o ante un error no controlado
        await Database.disconnect();
        process.exit(0);
    }
}

// Ejecución del punto de entrada
main();