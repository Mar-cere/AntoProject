import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';

const EmotionBanner = ({ emotions, onPress }) => {
  const [currentEmotion, setCurrentEmotion] = useState(0);
  const emotionOpacity = useRef(new Animated.Value(1)).current;
  const emotionTranslateX = useRef(new Animated.Value(0)).current;
  
  // Referencia para mantener un seguimiento de las emociones mostradas recientemente
  const recentEmotionsRef = useRef([]);
  const MAX_RECENT_EMOTIONS = 20; // Número de emociones recientes a recordar
  
  // Función para obtener la siguiente emoción sin repetir las recientes
  const getNextEmotion = useCallback(() => {
    // Filtrar las emociones que no se han mostrado recientemente
    const availableEmotions = emotions
      .map((emotion, index) => ({ emotion, index }))
      .filter(item => !recentEmotionsRef.current.includes(item.index));
    
    // Si todas las emociones han sido mostradas recientemente, usar todas
    const emotionsToChooseFrom = availableEmotions.length > 0 ? 
      availableEmotions : 
      emotions.map((emotion, index) => ({ emotion, index }));
    
    // Seleccionar una emoción aleatoria
    const randomIndex = Math.floor(Math.random() * emotionsToChooseFrom.length);
    const selectedEmotionIndex = emotionsToChooseFrom[randomIndex].index;
    
    // Añadir a la lista de emociones recientes
    recentEmotionsRef.current.push(selectedEmotionIndex);
    
    // Mantener solo las últimas MAX_RECENT_EMOTIONS
    if (recentEmotionsRef.current.length > MAX_RECENT_EMOTIONS) {
      recentEmotionsRef.current.shift(); // Eliminar la más antigua
    }
    
    return selectedEmotionIndex;
  }, [emotions]);

  // Efecto para cambiar la emoción cada 3.2 segundos con animación
  useEffect(() => {
    // Inicializar con una emoción aleatoria
    if (recentEmotionsRef.current.length === 0) {
      const initialEmotion = Math.floor(Math.random() * emotions.length);
      recentEmotionsRef.current.push(initialEmotion);
      setCurrentEmotion(initialEmotion);
    }
    
    const changeEmotion = () => {
      // Secuencia de animación para salida
      Animated.parallel([
        Animated.timing(emotionOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(emotionTranslateX, {
          toValue: -40, // Aumentado para textos más largos
          duration: 400,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Cambiar a la siguiente emoción
        setCurrentEmotion(getNextEmotion());
        
        // Resetear la posición para la entrada
        emotionTranslateX.setValue(40); // Aumentado para textos más largos
        
        // Secuencia de animación para entrada
        Animated.parallel([
          Animated.timing(emotionOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(emotionTranslateX, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          })
        ]).start();
      });
    };
    
    // Configurar el intervalo para cambiar la emoción
    const interval = setInterval(changeEmotion, 3200); // Tiempo aumentado para leer textos más largos
    
    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(interval);
  }, [getNextEmotion, emotions]);

  return (
    <TouchableOpacity 
      style={styles.emergencyContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.emergencyTextContainer}>
        <View style={styles.emotionContainer}>
          <Animated.Text 
            style={[
              styles.emotionText, 
              { 
                opacity: emotionOpacity,
                transform: [{ translateX: emotionTranslateX }]
              }
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {emotions[currentEmotion]}
          </Animated.Text>
        </View>
        <Text style={styles.emergencyText} numberOfLines={1}>
          {" Ingresa al chat de emergencia"}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  emergencyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emergencyTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxWidth: '95%',
  },
  emotionContainer: {
    width: 130, // Ancho aumentado para acomodar textos más largos
    alignItems: 'center',
    justifyContent: 'center',
    height: 24, // Altura fija para mantener la alineaciónr
  },
  emotionText: {
    fontSize: 15,
    color: '#1ADDDB',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  emergencyText: {
    fontSize: 15,
    color: '#1ADDDB',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default EmotionBanner; 