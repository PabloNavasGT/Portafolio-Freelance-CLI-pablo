// Selección de perfil e interacción en terminal
import { select, outro, isCancel } from '@clack/prompts';
import chalk from 'chalk';
// Utilidades globales y submenús correspondientes
import { UI } from '../utils/ui.js';
import { FreelanceMenu } from './freelanceMenu.js';
import { ClientMenu } from './clientMenu.js';


//Menú principal enfocado en la selección del tipo de usuario (Cliente o Freelancer).

export class MainMenu {
    
    //Inicia el flujo del menú principal.
    
    async start() {
        let keepRunning = true;

        while (keepRunning) {
            // Muestra la cabecera principal del sistema
            UI.displayHeader('Selección de Perfil / Rol de Acceso');

            // Selección interactiva del rol usando @clack/prompts[cite: 3]
            const roleChoice = await select({
                message: '¿Cómo deseas ingresar al sistema?',
                options: [
                    { value: 'freelancer', label: `${UI.icons.star} 1. Ingresar como Freelancer` },
                    { value: 'client', label: `${UI.icons.tick} 2. Ingresar como Cliente` },
                    { value: 'exit', label: `${UI.symbols.warning} 3. Salir` }
                ]
            });

            // Manejo de salida o interrupción
            if (isCancel(roleChoice) || roleChoice === 'exit') {
                outro(chalk.yellow('Sesión finalizada correctamente. ¡Hasta pronto!'));
                keepRunning = false;
                break;
            }

            // Enrutamiento según el rol seleccionado
            await this.routeRole(roleChoice);
        }
    }

    
    //Redirecciona al submenú según la opción del usuario.
    async routeRole(role) {
        switch (role) {
            case 'freelancer': {
                const freelanceMenu = new FreelanceMenu();
                await freelanceMenu.show();
                break;
            }
            case 'client': {
                const clientMenu = new ClientMenu();
                await clientMenu.show();
                break;
            }
        }
    }
}