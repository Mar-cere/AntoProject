import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ImageBackground, TouchableOpacity, FlatList, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const sampleTasks = [
  { id: '1', title: 'Terminar reporte' },
  { id: '2', title: 'Comprar víveres' },
  { id: '3', title: 'Hacer ejercicio' },
];

const sampleHabits = [
  { id: '1', title: 'Leer 10 páginas' },
  { id: '2', title: 'Beber 2L de agua' },
  { id: '3', title: 'Meditar 5 min' },
];

const sampleEmotions = [
  { id: '1', emoji: '😊', label: 'Feliz' },
  { id: '2', emoji: '😢', label: 'Triste' },
  { id: '3', emoji: '😌', label: 'Relajado' },
];

const DashScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require('../images/back.png')} style={styles.background} imageStyle={styles.imageStyle}>
        <View style={styles.contentContainer}>
          <Text style={styles.titleText}>Dashboard</Text>

          <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim }]}> 
            <Text style={styles.sectionTitle}>Tareas</Text>
            <FlatList
              data={sampleTasks}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => navigation.navigate('TaskDetail', { task: item })}>
                  <View style={styles.card}><Text style={styles.cardText}>{item.title}</Text></View>
                </TouchableOpacity>
              )}
            />
          </Animated.View>

          <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim }]}> 
            <Text style={styles.sectionTitle}>Hábitos</Text>
            <FlatList
              data={sampleHabits}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => navigation.navigate('HabitDetail', { habit: item })}>
                  <View style={styles.card}><Text style={styles.cardText}>{item.title}</Text></View>
                </TouchableOpacity>
              )}
            />
          </Animated.View>

          <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim }]}> 
            <Text style={styles.sectionTitle}>¿Cómo te sientes hoy?</Text>
            <FlatList
              data={sampleEmotions}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => alert(`Seleccionaste: ${item.label}`)}>
                  <View style={styles.emotionCard}><Text style={styles.emoji}>{item.emoji}</Text><Text style={styles.cardText}>{item.label}</Text></View>
                </TouchableOpacity>
              )}
            />
          </Animated.View>
        </View>
      </ImageBackground>

      <View style={styles.floatingBar}>
        <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('Chat')}> 
          <Text style={styles.floatingButtonText}>💬 Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030A24',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageStyle: {
    opacity: 0.1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  titleText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionContainer: {
    width: '100%',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#A3B8E8',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  emotionCard: {
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  cardText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  emoji: {
    fontSize: 40,
  },
  floatingBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1D2B5F',
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 8,
  },
  floatingButton: {
    backgroundColor: '#1ADDDB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default DashScreen;
