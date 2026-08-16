const validator = require('validator');

/**
 * Clase centralizada de validaciones y sanitización de datos.
 * Aplica validaciones estrictas utilizando la librería 'validator'.
 */
class AppValidator {

  // CLIENT (Autenticación y Registro)

  /**
   * Verifica si el correo tiene un formato válido (ej. usuario@dominio.com).
   * @param {string} email - Correo electrónico a validar.
   * @returns {boolean}
   */
  static isValidEmail(email) {
    if (!email) return false;
    return validator.isEmail(String(email));
  }

  /**
   * Verifica si el número telefónico tiene un formato móvil válido.
    @param {string} phone - Número de teléfono.
    @param {string} [locale='any'] - Opcional: Localidad para validar el formato.
    @returns {boolean}
   */
  static isValidPhone(phone, locale = 'any') {
    if (!phone) return false;
    return validator.isMobilePhone(String(phone), locale);
  }

  /**
   * Sanitiza el nombre: elimina espacios en los extremos y escapa caracteres HTML.
    @param {string} name - Nombre ingresado por el usuario.
    @returns {string} Nombre sanitizado y seguro para la base de datos.
   */
  static sanitizeClientName(name) {
    if (!name) return '';
    const trimmedName = validator.trim(String(name));
    return validator.escape(trimmedName);
  }

  // PROPOSAL (Propuestas Comerciales)

  /**
   * Verifica si el precio es un valor monetario o decimal válido.
    @param {string|number} price - Precio a validar.
    @returns {boolean}
   */
  static isValidPrice(price) {
    if (price === undefined || price === null) return false;
    const priceStr = String(price);
    // isFloat permite asegurar que es un número (puede combinarse con isCurrency si se requiere formato estricto)
    return validator.isFloat(priceStr, { min: 0 });
  }

  /**
   * Verifica que un texto (como título o descripción) no esté vacío tras limpiarlo.
    @param {string} text - Texto a validar.
    @returns {boolean}
   */
  static isNotEmptyText(text) {
    if (!text) return false;
    const cleanText = validator.trim(String(text));
    return !validator.isEmpty(cleanText);
  }

  /**
   * Valida si el string proporcionado tiene un formato de fecha real (ej. YYYY/MM/DD).
    @param {string} deadline - Fecha límite.
    @returns {boolean}
   */
  static isValidDeadline(deadline) {
    if (!deadline) return false;
    return validator.isDate(String(deadline));
  }


  // PROJECT (Proyectos y Entregables)

  /**
   * Verifica que el avance sea un número entero estrictamente entre 0 y 100.
    @param {string|number} progress - Porcentaje de avance.
    @returns {boolean}
   */
  static isValidProgress(progress) {
    if (progress === undefined || progress === null) return false;
    return validator.isInt(String(progress), { min: 0, max: 100 });
  }

  /**
   Valida que el enlace (Figma, GitHub, Drive) sea una URL bien formada y segura.
    @param {string} link - URL del recurso.
    @returns {boolean}
   */
  static isValidResourceLink(link) {
    if (!link) return false;
    return validator.isURL(String(link), { 
      protocols: ['http', 'https'], 
      require_protocol: true 
    });
  }

  // FINANCE... (Transacciones y Balances)

  /*
    Garantiza que el monto a registrar sea puramente numérico.
    @param {string|number} amount - Monto financiero.
    @returns {boolean}
   */
  static isValidAmount(amount) {
    if (amount === undefined || amount === null) return false;
    return validator.isNumeric(String(amount));
  }

  /**
    Verifica que el código de transacción/referencia sea estrictamente alfanumérico.
    @param {string} reference - Código de depósito o transacción.
    @returns {boolean}
   */
  static isValidReferenceCode(reference) {
    if (!reference) return false;
    return validator.isAlphanumeric(String(reference));
  }
}

module.exports = AppValidator;