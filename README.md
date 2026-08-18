# Portafolio Freelance CLI

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
</p>

Una aplicacion de consola (CLI) interactiva desarrollada en Node.js y MongoDB para la gestion integral del ciclo de vida de proyectos freelance. Facilita la administracion de propuestas, contratos, entregables, aprobaciones del cliente y finanzas con transacciones atomicas ACID.

--

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

* **Singleton:** Aplicado en el módulo `Database` (`Database.getDb()`) para compartir y reutilizar una sola conexión activa a la base de datos MongoDB en toda la aplicación.
* **Repository Pattern (Repositorio):** Clases especializadas (`ClientRepository`, `ProjectRepository`, `ProposalRepository`, `FinanceRepository`) que encapsulan la lógica de acceso a datos, consultas y transacciones atómicas de MongoDB, aislando la base de datos de la interfaz de usuario.
* **Facade (Fachada):** `ClientMenu` y `FreelanceMenu` actúan como fachadas interactivas que simplifican flujos complejos (múltiples preguntas de consola, formateo de tablas, spinners de carga y transacciones atómicas) para el usuario final.
* **Static Utility:** `AppValidator` y utilidades de validación como clases/módulos estáticos sin estado para la sanitización centralizada de entradas de usuario.
* **Adapter / Visual Helpers:** Métodos auxiliares de renderizado (`getBadge`, formateadores de tablas y tarjetas con `boxen`) que adaptan datos crudos de MongoDB a interfaces visuales estilizadas en consola.
* **Factory Method / Generator:** Módulos de generación de identificadores personalizados (`generateNextId`) y conversión automática de propuestas aceptadas a nuevos proyectos dentro de transacciones ACID.

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


* **Archivos descargables (SCRUM y Video):** https://drive.google.com/drive/folders/11XjrEtQX_7wC2tgMcbCyOIgbI2-e2TeO?usp=drive_link