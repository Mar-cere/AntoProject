/**
 * Modelo de Usuario
 * 
 * Esta clase define la estructura de datos de los usuarios en la aplicación.
 * Proporciona métodos para gestionar la información del usuario, la generación
 * de IDs únicos y la serialización/deserialización de datos.
 * 
 * @version 1.2.0
 * @author AntoApp Team
 */
class User {
  /**
   * Constructor del modelo User
   * 
   * Inicializa una nueva instancia de usuario con los datos proporcionados
   * o valores predeterminados para los campos obligatorios.
   * 
   * @param {Object} data - Datos para inicializar el usuario
   */
  constructor(data = {}) {
    // =============================================
    // IDENTIFICACIÓN
    // =============================================
    
    /**
     * ID único del usuario
     * Se genera automáticamente si no se proporciona
     * @type {string}
     */
    this.id = data.id || this.generateUniqueId();
    
    // =============================================
    // INFORMACIÓN BÁSICA
    // =============================================
    
    /**
     * Correo electrónico (normalizado a minúsculas)
     * @type {string}
     */
    this.email = data.email ? data.email.toLowerCase().trim() : '';
    
    /**
     * Gestión del nombre completo y sus componentes
     * Soporta tanto nombre completo como firstName/lastName por separado
     */
    if (data.name) {
      /**
       * Nombre completo del usuario
       * @type {string}
       */
      this.name = data.name;
      
      // Dividir el nombre en componentes si es necesario
      const nameParts = data.name.split(' ');
      /**
       * Primer nombre
       * @type {string}
       */
      this.firstName = nameParts[0] || '';
      /**
       * Apellido(s)
       * @type {string}
       */
      this.lastName = nameParts.slice(1).join(' ') || '';
    } else {
      this.firstName = data.firstName || '';
      this.lastName = data.lastName || '';
      this.name = `${this.firstName} ${this.lastName}`.trim();
    }
    
    /**
     * Nombre de usuario (opcional)
     * @type {string}
     */
    this.username = data.username || '';
    
    /**
     * Hash del nombre de usuario para identificación anónima
     * Se genera automáticamente a partir del username o email
     * @type {string}
     */
    this.usernameHash = data.usernameHash || this.generateUsernameHash();
    
    /**
     * URL o datos del avatar del usuario
     * @type {string|null}
     */
    this.avatar = data.avatar || null;
    
    // =============================================
    // AUTENTICACIÓN Y SEGURIDAD
    // =============================================
    
    /**
     * Contraseña (almacenada como hash en la BD)
     * @type {string|undefined}
     * @private
     */
    this._password = data.password;
    
    /**
     * Indica si el email ha sido verificado
     * @type {boolean}
     */
    this.isVerified = data.isVerified || false;
    
    /**
     * Fecha del último inicio de sesión
     * @type {Date|null}
     */
    this.lastLogin = data.lastLogin || null;
    
    /**
     * Token para restablecimiento de contraseña
     * @type {string|null}
     */
    this.resetPasswordToken = data.resetPasswordToken || null;
    
    /**
     * Fecha de expiración del token de restablecimiento
     * @type {Date|null}
     */
    this.resetPasswordExpires = data.resetPasswordExpires || null;
    
    // =============================================
    // METADATOS
    // =============================================
    
    /**
     * Fecha de creación de la cuenta
     * @type {string} - Formato ISO 8601
     */
    this.createdAt = data.createdAt || new Date().toISOString();
    
    /**
     * Fecha de la última actualización de datos
     * @type {string|null} - Formato ISO 8601
     */
    this.updatedAt = data.updatedAt || null;
    
    // =============================================
    // PREFERENCIAS
    // =============================================
    
    /**
     * Preferencias del usuario para personalización
     * @type {Object}
     */
    this.preferences = data.preferences || {
      theme: 'dark',     // Tema de la interfaz
      notifications: true, // Estado de notificaciones
      language: 'es'     // Idioma preferido
    };
  }

  /**
   * Genera un hash para el nombre de usuario
   * 
   * Crea un identificador único basado en el nombre de usuario
   * y/o correo electrónico, que puede usarse para identificación
   * anónima o como clave alternativa.
   * 
   * @returns {string} Hash del nombre de usuario
   */
  generateUsernameHash() {
    // Usar username si existe, si no usar email, y si no, un valor aleatorio
    const baseString = this.username || this.email || `user_${Math.random()}`;
    
    // Añadir un poco de "sal" para aumentar la unicidad
    const salt = new Date().getTime().toString(36).substring(0, 4);
    
    // Aplicar hash usando la función hashCode mejorada
    return this.hashCodeImproved(baseString + salt);
  }
  
  /**
   * Versión mejorada de la función hashCode
   * 
   * Implementa un algoritmo de hash más robusto para
   * mayor seguridad en la generación de hashes de usuario.
   * 
   * @param {string} str - Cadena a hashear
   * @returns {string} Hash en formato hexadecimal
   * @private
   */
  hashCodeImproved(str) {
    // Inicialización con valor primo para mejor distribución
    let h1 = 0x92d2c709;
    let h2 = 0x1b3a7689;
    
    for (let i = 0; i < str.length; i++) {
      // Obtener el código del carácter
      const char = str.charCodeAt(i);
      
      // Actualizar estado del hash con operaciones bitwise
      h1 = ((h1 << 5) - h1) ^ char;
      h2 = ((h2 << 7) - h2) ^ (char * 13);
      
      // Asegurar que son números de 32 bits
      h1 = h1 & h1;
      h2 = h2 & h2;
    }
    
    // Combinar los dos valores de hash
    const combinedHash = Math.abs(h1 ^ h2).toString(16);
    
    // Padding para asegurar longitud mínima
    return combinedHash.padStart(8, '0');
  }

  /**
   * Genera un ID único para el usuario
   * 
   * Combina timestamp, valores aleatorios y hash para 
   * crear un identificador con probabilidad extremadamente
   * baja de colisión.
   * 
   * @returns {string} ID único en formato user_[timestamp]_[random]_[hash]
   */
  generateUniqueId() {
    // Componente de timestamp (base 36 para reducir longitud)
    const timestamp = new Date().getTime().toString(36);
    
    // Componente aleatorio (8 caracteres)
    const randomStr = Math.random().toString(36).substring(2, 10);
    
    // Componente de hash para aumentar unicidad
    const hash = this.hashCode(timestamp + randomStr);
    
    // Combinar componentes con prefijo 'user_'
    return `user_${timestamp}_${randomStr}_${hash}`;
  }

  /**
   * Función simple de hash para aumentar la unicidad
   * 
   * Implementa un algoritmo de hash sencillo para
   * reducir riesgo de colisiones en IDs.
   * 
   * @param {string} str - Cadena a hashear
   * @returns {string} Representación del hash en base 36
   * @private
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a entero de 32 bits
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }

  /**
   * Regenera el hash del nombre de usuario
   * 
   * Útil cuando cambia el nombre de usuario o el email.
   * 
   * @returns {string} Nuevo hash generado
   */
  refreshUsernameHash() {
    this.usernameHash = this.generateUsernameHash();
    this.updatedAt = new Date().toISOString();
    return this.usernameHash;
  }

  /**
   * Verifica si un hash corresponde a este usuario
   * 
   * Útil para validar identidad en URLs públicas o
   * para sistemas de verificación.
   * 
   * @param {string} hash - Hash a verificar
   * @returns {boolean} Verdadero si el hash coincide
   */
  verifyUsernameHash(hash) {
    return this.usernameHash === hash;
  }

  /**
   * Genera un identificador anónimo para el usuario
   * 
   * Útil para análisis, logs o contextos donde no se
   * quiere revelar la identidad real del usuario.
   * 
   * @returns {string} Identificador anónimo
   */
  getAnonymousId() {
    return this.usernameHash.substring(0, 8);
  }

  /**
   * Genera un UUID v4 (alternativa más robusta)
   * 
   * Implementación del estándar UUID v4 para aplicaciones
   * que requieren este formato específico.
   * 
   * @returns {string} UUID en formato estándar
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Obtiene el nombre completo del usuario
   * 
   * Determina la mejor representación del nombre del usuario
   * según los datos disponibles.
   * 
   * @returns {string} Nombre para mostrar del usuario
   */
  getFullName() {
    if (this.name) return this.name;
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    } else if (this.firstName) {
      return this.firstName;
    } else if (this.username) {
      return this.username;
    }
    return 'Usuario';
  }

  /**
   * Actualiza los datos del usuario
   * 
   * Método para actualizar múltiples propiedades manteniendo
   * la integridad de los datos.
   * 
   * @param {Object} newData - Nuevos datos para actualizar
   * @returns {User} Instancia actualizada
   */
  update(newData) {
    // Propiedades que no se pueden actualizar directamente
    const protectedProps = ['id', 'email', 'createdAt', 'password', 'usernameHash'];
    
    // Verificar si cambia el username o email
    const needHashRefresh = 
      (newData.username !== undefined && newData.username !== this.username) ||
      (newData.email !== undefined && newData.email !== this.email);
    
    // Actualizar propiedades permitidas
    Object.keys(newData).forEach(key => {
      if (!protectedProps.includes(key) && newData[key] !== undefined) {
        this[key] = newData[key];
      }
    });
    
    // Si cambió username o email, regenerar el hash
    if (needHashRefresh) {
      this.refreshUsernameHash();
    }
    
    // Actualizar timestamp de modificación
    this.updatedAt = new Date().toISOString();
    
    return this;
  }

  /**
   * Convierte el objeto a JSON
   * 
   * Prepara el objeto para ser serializado excluyendo
   * datos sensibles o innecesarios.
   * 
   * @returns {Object} Representación JSON segura
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      firstName: this.firstName,
      lastName: this.lastName,
      username: this.username,
      usernameHash: this.usernameHash,
      avatar: this.avatar,
      isVerified: this.isVerified,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      preferences: this.preferences
      // Nota: No incluimos _password, resetPasswordToken ni resetPasswordExpires por seguridad
    };
  }

  /**
   * Crea una instancia de User a partir de JSON
   * 
   * @param {string|Object} json - Datos JSON o string para parsear
   * @returns {User} Nueva instancia de User
   * @static
   */
  static fromJSON(json) {
    if (typeof json === 'string') {
      try {
        json = JSON.parse(json);
      } catch (e) {
        console.error('Error parsing user JSON:', e);
        return new User();
      }
    }
    
    return new User(json);
  }

  /**
   * Genera un usuario anónimo temporal
   * 
   * Útil para pruebas o para usuarios no autenticados.
   * 
   * @returns {User} Usuario anónimo con ID aleatorio
   * @static
   */
  static createAnonymous() {
    const anonUser = new User();
    anonUser.username = `guest_${Math.random().toString(36).substring(2, 10)}`;
    return anonUser;
  }
  
  /**
   * Verifica si el usuario tiene una preferencia específica habilitada
   * 
   * @param {string} preferenceName - Nombre de la preferencia
   * @returns {boolean} Estado de la preferencia
   */
  hasPreference(preferenceName) {
    return this.preferences && this.preferences[preferenceName] === true;
  }
  
  /**
   * Establece una preferencia de usuario
   * 
   * @param {string} name - Nombre de la preferencia
   * @param {any} value - Valor de la preferencia
   */
  setPreference(name, value) {
    if (!this.preferences) {
      this.preferences = {};
    }
    this.preferences[name] = value;
    this.updatedAt = new Date().toISOString();
  }
}

export default User;