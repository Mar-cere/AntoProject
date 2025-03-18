/**
 * Modelo de Usuario
 * Define la estructura de datos del usuario
 */
class User {
  constructor(data = {}) {
    // Datos básicos
    this.id = data.id || null;
    this.email = data.email ? data.email.toLowerCase().trim() : '';
    
    // Manejar nombre completo o firstName/lastName
    if (data.name) {
      this.name = data.name;
      // Opcional: dividir name en firstName/lastName si se necesita
      const nameParts = data.name.split(' ');
      this.firstName = nameParts[0] || '';
      this.lastName = nameParts.slice(1).join(' ') || '';
    } else {
      this.firstName = data.firstName || '';
      this.lastName = data.lastName || '';
      this.name = `${this.firstName} ${this.lastName}`.trim();
    }
    
    this.username = data.username || '';
    this.avatar = data.avatar || null;
    
    // Datos de autenticación
    this.isVerified = data.isVerified || false;
    this.lastLogin = data.lastLogin || null;
    this.createdAt = data.createdAt || null;
    
    // Preferencias
    this.preferences = data.preferences || {
      theme: 'dark',
      notifications: true,
      language: 'es'
    };
  }

  /**
   * Obtiene el nombre completo del usuario
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
   * Convierte el objeto a JSON
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      firstName: this.firstName,
      lastName: this.lastName,
      username: this.username,
      avatar: this.avatar,
      isVerified: this.isVerified,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      preferences: this.preferences
    };
  }

  /**
   * Crea una instancia de User a partir de JSON
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
}

export default User;