// Librerías de diseño, animación e interfaz visual para terminal[cite: 3]
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import Table from 'cli-table3';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
import dayjs from 'dayjs';
import figures from 'figures';
import logSymbols from 'log-symbols';
import ora from 'ora';

/**
 * Clase centralizada de utilidades de interfaz de usuario para consola.
 */
export class UI {
    // Exposición global de íconos gráficos y símbolos[cite: 3]
    static icons = figures;
    static symbols = logSymbols;

    /**
     * Muestra el encabezado ASCII decorado con gradiente y caja adaptativa.
     * @param {string} [subtitle] - Título o descripción de la pantalla actual.
     */
    static displayHeader(subtitle) {
        // Limpieza de pantalla
        console.clear();

        // Generación de banner con figlet[cite: 3]
        const asciiText = figlet.textSync('PORTAFOLIO CLI', {
            font: 'Standard',
            horizontalLayout: 'default'
        });

        // Colorización en gradiente con gradient-string[cite: 3]
        console.log(gradient.pastel.multiline(asciiText));

        // Encuadre con boxen[cite: 3]
        if (subtitle) {
            console.log(
                boxen(subtitle, {
                    padding: 0.5,
                    margin: { top: 0, bottom: 1 },
                    borderStyle: 'round',
                    borderColor: 'cyan'
                })
            );
        }
    }


    //Imprime tablas formateadas usando cli-table3 y chalk
    static renderTable(headers, rows) {
        const table = new Table({
            head: headers.map(h => chalk.cyan.bold(h)),
            style: { border: ['gray'] }
        });

        rows.forEach(row => table.push(row));
        console.log(table.toString());
    }

    // renderiza una barra de progreso en conccola con cli-progress
    static renderProgressBar(current, total, label = 'Progreso') {
        const progressBar = new cliProgress.SingleBar({
            format: `${chalk.cyan(label)} |${chalk.green('{bar}')}| {percentage}% | {value}/{total}`,
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        }, cliProgress.Presets.shades_classic);

        progressBar.start(total > 0 ? total : 1, current);
        progressBar.stop();
        console.log();
    }

    // Formatea fechas con dayjs
    static formatDate(date, format = 'DD/MM/YYYY HH:mm') {
        return dayjs(date).format(format);
    }

    // crea un spiner animado de carga usando ora
    static createSpinner(text) {
        return ora({
            text,
            color: 'cyan',
            spinner: 'dots'
        });
    }
}