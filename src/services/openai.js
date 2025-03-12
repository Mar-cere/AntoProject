import { OPENAI_API_KEY as API_KEY } from '@env';

// Configuración para la API de OpenAI
export const OPENAI_API_KEY = API_KEY || '';
export const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
export const OPENAI_MODEL = 'gpt-3.5-turbo';