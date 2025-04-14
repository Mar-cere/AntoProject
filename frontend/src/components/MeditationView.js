import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MeditationView = () => {
  const [currentText, setCurrentText] = useState('Inhala...');
  const animation = useRef(new Animated.Value(1)).current;

  // Función para manejar la animación con tiempos ajustados
  const handleAnimation = () => {
    Animated.sequence([
      // Inhalar (4 segundos)
      Animated.timing(animation, {
        toValue: 1.3,
        duration: 4000,
        useNativeDriver: true,
      }),
      // Mantener (1 segundo)
      Animated.timing(animation, {
        toValue: 1.3,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Exhalar (4 segundos)
      Animated.timing(animation, {
        toValue: 1,
        duration: 4000,
        useNativeDriver: true,
      }),
      // Pausa (1 segundo)
      Animated.timing(animation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start(() => handleAnimation());
  };

  // Función para cambiar el texto sincronizado con la animación
  useEffect(() => {
    handleAnimation();
    
    let phase = 0;
    const interval = setInterval(() => {
      phase = (phase + 1) % 3;
      switch(phase) {
        case 0:
          setCurrentText('Inhala...');
          break;
        case 1:
          setCurrentText('Mantén...');
          break;
        case 2:
          setCurrentText('Exhala...');
          break;
      }
    }, 3333); // Ajustado para sincronizar mejor con la animación

    return () => {
      clearInterval(interval);
      animation.stopAnimation();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Animated.View 
          style={[
            styles.circle,
            {
              transform: [{ scale: animation }]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name="meditation" 
            size={48} 
            color="#FFFFFF" 
          />
        </Animated.View>
        <Text style={[
          styles.text,
          { 
            color: currentText === 'Mantén...' ? '#A3B8E8' : '#FFFFFF'
          }
        ]}>
          {currentText}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 75,
    backgroundColor: 'rgba(163, 184, 232, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 30,
  },
  text: {
    fontSize: 32,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 2,
    position: 'absolute',
    bottom: -40,
    width: '100%',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  }
});

export default MeditationView;
