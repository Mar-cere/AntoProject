import React, { useRef, useEffect } from 'react';
import { Animated, Dimensions, View } from 'react-native';

const ParticleBackground = () => {
  // Crea 10 partículas con posiciones y animaciones aleatorias
  const particles = Array(10).fill(0).map((_, i) => {
    // Posiciones iniciales
    const initialPosX = Math.random() * Dimensions.get('window').width;
    const initialPosY = Math.random() * Dimensions.get('window').height;
    
    // Valores para animación de transform
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(Math.random() * 0.5 + 0.1)).current;
    const size = Math.random() * 4 + 2;
    
    useEffect(() => {
      // Animación de opacidad
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: Math.random() * 0.5 + 0.1,
            duration: 2000 + Math.random() * 3000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: Math.random() * 0.3 + 0.05,
            duration: 2000 + Math.random() * 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Animación de movimiento con transform
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: Math.random() * 50 - 25, // Movimiento de -25 a +25
            duration: 8000 + Math.random() * 7000,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: Math.random() * 50 - 25, // Movimiento de -25 a +25
            duration: 8000 + Math.random() * 7000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, []);
    
    return (
      <Animated.View
        key={i}
        style={{
          position: 'absolute',
          left: initialPosX,
          top: initialPosY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#1ADDDB',
          opacity: opacity,
          transform: [
            { translateX: translateX },
            { translateY: translateY }
          ]
        }}
      />
    );
  });

  return <View style={{ position: 'absolute', width: '100%', height: '100%' }}>{particles}</View>;
};

export default ParticleBackground; 