import dotenv from 'dotenv';

dotenv.config();

export default {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4-turbo-preview',
    maxTokens: {
      short: 200,
      medium: 300,
      long: 400
    },
    temperature: {
      precise: 0.3,
      balanced: 0.5,
      creative: 0.7
    }
  },
  mongodb: {
    uri: process.env.MONGODB_URI
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '24h'
  },
  app: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
  }
}; 