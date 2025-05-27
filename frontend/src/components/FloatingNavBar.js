import React from 'react';
import { View, Text, Image, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Componente de barra de navegación flotante
 * 
 * @param {string} activeTab - Tab activo actualmente
 * @param {function} onTabPress - Función a llamar cuando se presiona un tab
 * @param {object} animValues - Valores de animación (translateY, opacity)
 */
const FloatingNavBar = ({ activeTab, onTabPress, animValues = {} }) => {
  const { translateY = new Animated.Value(0), opacity = new Animated.Value(1) } = animValues;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  // Calcular el padding inferior basado en el safe area
  const bottomPadding = Math.max(insets.bottom, 10);
  
  // Función actualizada para manejar la navegación
  const handleTabPress = (screen, tab) => {
    try {
      // Si onTabPress existe, úsalo
      if (onTabPress) {
        onTabPress(screen, tab);
        return;
      }

      // Si no, usa navigation directamente
      switch (screen) {
        case 'Dash':
          navigation.navigate('Dash');
          break;
        case 'Calendar':
          navigation.navigate('Tasks');
          break;
        case 'Settings':
          navigation.navigate('Settings');
          break;
        case 'Chat':
          navigation.navigate('Chat');
          break;
        default:
          navigation.navigate(screen);
      }
    } catch (error) {
      console.error('Error al navegar:', error);
    }
  };


  return (
    <Animated.View 
      style={[
        styles.floatingBar,
        {
          transform: [{ translateY }],
          opacity,
          paddingBottom: bottomPadding
        }
      ]}
    >
      {/* Botón Home */}
      <TouchableOpacity 
        style={[styles.button, activeTab === 'home' && styles.activeButton]} 
        onPress={() => handleTabPress('Dash', 'home')}
      >
        <View style={styles.iconContainer}>
          {/* Usar un icono de texto como fallback */}
          <Text style={[styles.iconText, activeTab === 'home' && styles.activeIconText]}>🏠</Text>
        </View>
        <Text style={[styles.text, activeTab === 'home' && styles.activeText]}>
          Inicio
        </Text>
      </TouchableOpacity>
      
      {/* Botón Recordatorios */}
      <TouchableOpacity 
        style={[styles.button, activeTab === 'calendar' && styles.activeButton]} 
        onPress={() => handleTabPress('Tasks', 'tasks')}
      >
        <View style={styles.iconContainer}>
          <Text style={[styles.iconText, activeTab === 'calendar' && styles.activeIconText]}>📋</Text>
        </View>
        <Text style={[styles.text, activeTab === 'calendar' && styles.activeText]}>
          Recordatorios
        </Text>
      </TouchableOpacity>
      
      {/* Botón central Chat con imagen de Anto */}
      <View style={styles.centerButtonContainer}>
        <TouchableOpacity 
          style={styles.centerButton}
          onPress={() => handleTabPress('Chat')}
        >
          {/* Intentar cargar la imagen de Anto, con fallback a emoji */}
          <Image 
            source={require('../images/Anto.png')}
            style={styles.centerButtonImage}
            onError={(e) => {
              console.warn('Error al cargar la imagen de Anto:', e.nativeEvent.error);
            }}
          />
        </TouchableOpacity>
      </View>
      
      {/* Botón Ajustes */}
      <TouchableOpacity 
        style={[styles.button, activeTab === 'settings' && styles.activeButton]} 
        onPress={() => handleTabPress('Settings', 'settings')}
      >
        <View style={styles.iconContainer}>
          <Text style={[styles.iconText, activeTab === 'settings' && styles.activeIconText]}>⚙️</Text>
        </View>
        <Text style={[styles.text, activeTab === 'settings' && styles.activeText]}>
          Ajustes
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingBar: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(3, 10, 36, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 80, // Altura base
    alignItems: 'center',
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 7,
    borderWidth: 2,
    borderColor: 'rgba(26, 221, 219, 0.3)',
    borderBottomWidth: 0,
    zIndex: 1000, // Asegurar que esté por encima de otros elementos
  },
  button: {
    flex: 1,
    height: '96%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 1,
  },
  activeButton: {
    borderBottomWidth: 1,
    borderBottomColor: '#1ADDDB',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 26,
    height: 26,
    tintColor: '#A3B8E8',
  },
  activeIcon: {
    width: 28,
    height: 28,
    tintColor: '#1ADDDB',
  },
  iconText: {
    fontSize: 24,
    color: '#A3B8E8',
  },
  activeIconText: {
    color: '#1ADDDB',
    fontSize: 24,
  },
  text: {
    fontSize: 10,
    color: '#A3B8E8',
  },
  activeText: {
    color: '#1ADDDB',
  },
  centerButtonContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
  },
  centerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1ADDDB',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden', // Para asegurar que la imagen respete el borderRadius
  },
  centerButtonImage: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
});

export default FloatingNavBar; 