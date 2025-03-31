import React, {useEffect} from 'react';
import { View, Animated } from 'react-native';

// Componente de esqueleto para carga
const SkeletonLoader = ({ width, height, style }) => {
  const opacity = useState(new Animated.Value(0.3))[0];
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, []);
  
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#3D4B7C',
          borderRadius: 5,
          opacity,
        },
        style,
      ]}
    />
  );
};

export default SkeletonLoader; 