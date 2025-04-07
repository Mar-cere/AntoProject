import mongoose from 'mongoose';
import Achievement from '../models/Achievement.js';
import defaultAchievements from '../config/achievements.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const initAchievements = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Obtener todos los usuarios
    const users = await User.find({});

    for (const user of users) {
      // Verificar logros existentes para el usuario
      const existingAchievements = await Achievement.find({ userId: user._id });
      
      // Filtrar logros que no existen para este usuario
      const newAchievements = defaultAchievements.filter(achievement => 
        !existingAchievements.some(existing => 
          existing.title === achievement.title && 
          existing.category === achievement.category
        )
      );

      // Crear nuevos logros para el usuario
      if (newAchievements.length > 0) {
        const achievementsToCreate = newAchievements.map(achievement => ({
          ...achievement,
          userId: user._id,
          progress: 0,
          completed: false
        }));

        await Achievement.insertMany(achievementsToCreate);
        console.log(`Creados ${achievementsToCreate.length} logros para el usuario ${user.email}`);
      }
    }

    console.log('Inicialización de logros completada');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la inicialización:', error);
    process.exit(1);
  }
};

initAchievements();
