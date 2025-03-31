import React, { useState, useEffect} from 'react';
import {Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText, G, Line } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Componente de anillo de progreso
const ProgressRing = ({ radius, strokeWidth, progress, color }) => {
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress * circumference);
  
  const [animatedProgress] = useState(new Animated.Value(0));
  
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);
  
  const animatedStrokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });
  
  return (
    <Svg height={radius * 2} width={radius * 2} style={styles.svg}>
      <Circle
        stroke="#e6e6e6"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <AnimatedCircle
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={animatedStrokeDashoffset}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <SvgText
        x={radius}
        y={radius + 5}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="12"
      >
        {`${Math.round(progress * 100)}%`}
      </SvgText>
    </Svg>
  );
};

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
  },
});

export default ProgressRing; 