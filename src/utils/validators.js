import validator from 'validator';

class AppValidator {
  // MÓDULO: CLIENTES (Autenticación, Registro y Perfil)
  //Valida el formato de correo electrónico antes de autenticar o crear un cliente.
  static isValidEmail(email) {
    if (!email) return false;
    return validator.isEmail(String(email));
  }

  //Verifica la validez de un número de teléfono móvil.
  static isValidPhone(phone, locale = 'any') {
    if (!phone) return false;
    return validator.isMobilePhone(String(phone), locale);
  }


  //Sanitiza el nombre del cliente para prevenir vulnerabilidades e inconsistencias.
  static sanitizeClientName(name) {
    if (!name) return '';
    const trimmedName = validator.trim(String(name));
    return validator.escape(trimmedName);
  }
  // MÓDULO: PROPUESTAS COMERCIALES (Proposals)
  
  //Confirma que el valor de un presupuesto o precio sea un número flotante positivo (>= 0).
  static isValidPrice(price) {
    if (price === undefined || price === null) return false;
    const priceStr = String(price);
    return validator.isFloat(priceStr, { min: 0 });
  }

  //Garantiza que una cadena textual (títulos, descripciones) no contenga solo espacios en blanco.
  static isNotEmptyText(text) {
    if (!text) return false;
    const cleanText = validator.trim(String(text));
    return !validator.isEmpty(cleanText);
  }


  //Valida si un string entregado corresponde a una fecha real aceptada por la aplicación.
  static isValidDeadline(deadline) {
    if (!deadline) return false;
    return validator.isDate(String(deadline));
  }
  // MÓDULO: PROYECTOS Y ENTREGABLES (Projects & Deliverables)

  //Valida que el porcentaje de avance de un proyecto esté restringido al rango numérico de 0 a 100.
  static isValidProgress(progress) {
    if (progress === undefined || progress === null) return false;
    return validator.isInt(String(progress), { min: 0, max: 100 });
  }

  //Valida que los enlaces hacia artefactos (Figma, repositorios GitHub, Google Drive) utilicen protocolos HTTPS/HTTP válidos.
  static isValidResourceLink(link) {
    if (!link) return false;
    return validator.isURL(String(link), { 
      protocols: ['http', 'https'], 
      require_protocol: true 
    });
  }
  // MÓDULO: FINANZAS Y TRANSACCIONES (Finances & Balances)
  //Garantiza que el monto asignado a una transacción financiera sea estrictamente numérico.
  static isValidAmount(amount) {
    if (amount === undefined || amount === null) return false;
    return validator.isNumeric(String(amount));
  }

  //Valida que el código de referencia o comprobante bancario sea alfanumérico sin caracteres especiales.
  static isValidReferenceCode(reference) {
    if (!reference) return false;
    return validator.isAlphanumeric(String(reference));
  }
}

export default AppValidator;