# Portafolio Freelance CLI

Una aplicacion de consola (CLI) interactiva desarrollada en Node.js y MongoDB para la gestion integral del ciclo de vida de proyectos freelance. Facilita la administracion de propuestas, contratos, entregables, aprobaciones del cliente y finanzas con transacciones atomicas ACID.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
</p>

---

## Tecnologias utilizadas

Este proyecto fue desarrollado utilizando las siguientes tecnologias:

* **Lenguaje principal:** JavaScript (ES Modules, ECMAScript 2026+)
* **Entrono de ejecucion:** Node.js (v20+)
* **Base de datos:** MongoDB (Driver Oficial v7.5)
* **Diseno e interfaz CLI:** Chalk, Boxen, CLI-Table3, figlet, gradient-string, ora y commander
* **Manejo de fechas y variables:** day.js y dotenv
* **Control de versiones:** Git y Github

---

## Arquitectura y Principios de diseno

El sistema fue disenado aplicando principios de ingenieria de software para garantizar mantenibilidad y escalabilidad:

### Principios SOLID
* **Single Responsabiility Principle (SRP):** Cada modulo posee una unica responsabilidad. `AppValidator` se encarga exlusivamente de la validacion y sanitizacion, `MainMenu` del enrutamiento de roles, y los modelos de las reglas de dominio.
* **Open/Closed Principle (OCP):** El sistema permite extender modulos (como nuevos campos en contratos o propuestas) sin modificar la logica basica base de persistencia o menus.
* **Liskov Substitution Principle (LSP):** Todos los modelos de dominio exponen metodos homogeneos de serializacion(`toDocument()`).
* **Interface Segregation Principle (ISP):** Menus segregados por perfil (`ClientMenu` y `FreelanceMenu`), evitando exponer al cliente opciones administrativas.
* **Dependency Inversion Principle (DIP):** Los componentes de presentacion dependen del singleton abstracto `Database` y de las abstracciones del dominio en lugar de la base de datos directa.

### Patrones de diseno

* **Singleton:** Aplicado en el modulo `Database` (`Database.getDb()`) para compartir una sola conexion activa en todo el sistema.
* **Facade (Fachada):** `ClientMenu` y `FreelanceMenu` simplifican la complejidad interna de transacciones ACID y formateo de consola.
* **Static Utility:** `AppValidator` como clase estatica sin estado para la sanitizacion centralizada.
* **Adapter:** Metodos de renderizado visual (`renderBadge`, `renderProgressBar`) que transforman datos crudos a interfaces coloreadas con barras ASCII e iconos unicode.
* **Factory Method:** Transformacion de propuestas aceptadas a nuevos proyectos (`Proposal.convertirAProyecto()`).

---

# Como montar el proyecto

## Requiesitos previos

Antes de instalar el proyecto, asegurate de tener instaladas las siguientes herramientas:

* [Node.js](https://nodejs.org/) (Versión 20.0.0 o superior)
* Instancia local o remota de [MongoDB](https://www.mongodb.com/) (Soporte para Replica Sets requerido para transacciones ACID)
* Editor de código como Visual Studio Code

## Instalacion 

1. **Clonar el repositorio:**
```bash
git clone(https://github.com/Joguisam-gt/Portafolio-Freelance-CLI.git)
cd Portafolio-Freelance-CLI
```

2. **Instalar dependencias directas:
```bash
npm install
```

3. **Configurar variables de entorno:
Copia el archivo de pantilla .env.example para crear tu archivo .env de configuracion local:
```bash
cp .env.example .env
```

4. **Iniciar la aplicacion:
```bash
npm start
```