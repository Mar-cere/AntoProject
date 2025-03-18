import React from 'react';
import { TouchableOpacity, Text, Animated, StyleSheet } from 'react-native';

const AnimatedButton = ({ 
  title, 
  onPress, 
  style, 
  textStyle, 
  buttonScale, 
  buttonOpacity,
  accessibilityLabel,
  accessibilityHint,
  isPrimary = true
}) => {
  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (onPress) onPress();
    });
  };

  return (
    <TouchableOpacity
      accessible={true}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint || `Toca para ${title}`}
      accessibilityRole="button"
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        isPrimary ? styles.mainButton : styles.secondaryButton,
        { transform: [{ scale: buttonScale }], opacity: buttonOpacity },
        style
      ]}
    >
      <Text style={[isPrimary ? styles.mainButtonText : styles.secondaryButtonText, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  mainButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.8)',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#1ADDDB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  secondaryButtonText: {
    color: 'rgba(26, 221, 219, 0.8)',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default AnimatedButton; 