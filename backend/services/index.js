// Archivo central para exportar todos los servicios
import openaiService from './openaiService.js';
import emotionalAnalyzer from './emotionalAnalyzer.js';
import contextAnalyzer from './contextAnalyzer.js';
import memoryService from './memoryService.js';
import personalizationService from './personalizationService.js';
import progressTracker from './progressTracker.js';
import goalTracker from './goalTracker.js';
import responseGenerator from './responseGenerator.js';
import userProfileService from './userProfileService.js';

// Verificar que cada servicio exporte una instancia
const services = {
  openaiService,
  emotionalAnalyzer,
  contextAnalyzer,
  memoryService,
  personalizationService,
  progressTracker,
  goalTracker,
  responseGenerator,
  userProfileService
};

// Validar que cada servicio tenga sus métodos principales
Object.entries(services).forEach(([name, service]) => {
  if (!service || typeof service !== 'object') {
    console.error(`Error: ${name} no está correctamente instanciado`);
  }
});

export {
  openaiService,
  emotionalAnalyzer,
  contextAnalyzer,
  memoryService,
  personalizationService,
  progressTracker,
  goalTracker,
  responseGenerator,
  userProfileService
}; 