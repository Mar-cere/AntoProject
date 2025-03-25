import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ImageBackground,
  RefreshControl,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import FloatingNavBar from '../components/FloatingNavBar';


const JournalScreen = ({ navigation }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentEntry, setCurrentEntry] = useState({
    id: null,
    date: new Date(),
    content: '',
    mood: 'neutral',
    tags: []
  });

  const moods = {
    happy: { icon: 'emoticon-happy', color: '#4CAF50' },
    neutral: { icon: 'emoticon-neutral', color: '#FFC107' },
    sad: { icon: 'emoticon-sad', color: '#FF5252' },
    excited: { icon: 'emoticon-excited', color: '#2196F3' },
    tired: { icon: 'emoticon-tired', color: '#9C27B0' }
  };

  const loadEntries = useCallback(async () => {
    try {
      const storedEntries = await AsyncStorage.getItem('journalEntries');
      if (storedEntries) {
        const parsedEntries = JSON.parse(storedEntries);
        setEntries(parsedEntries.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (error) {
      console.error('Error al cargar entradas:', error);
      Alert.alert('Error', 'No se pudieron cargar las entradas del diario');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadEntries();
  }, []);

  const saveEntry = async () => {
    if (!currentEntry.content.trim()) {
      Alert.alert('Error', 'El contenido no puede estar vacío');
      return;
    }

    try {
      const newEntries = [...entries];
      if (currentEntry.id) {
        // Editar entrada existente
        const index = newEntries.findIndex(e => e.id === currentEntry.id);
        newEntries[index] = currentEntry;
      } else {
        // Crear nueva entrada
        newEntries.unshift({
          ...currentEntry,
          id: Date.now().toString(),
          date: new Date().toISOString()
        });
      }

      await AsyncStorage.setItem('journalEntries', JSON.stringify(newEntries));
      setEntries(newEntries);
      setShowModal(false);
      setCurrentEntry({
        id: null,
        date: new Date(),
        content: '',
        mood: 'neutral',
        tags: []
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error al guardar entrada:', error);
      Alert.alert('Error', 'No se pudo guardar la entrada');
    }
  };

  const deleteEntry = async (id) => {
    Alert.alert(
      'Eliminar Entrada',
      '¿Estás seguro que deseas eliminar esta entrada?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const newEntries = entries.filter(entry => entry.id !== id);
              await AsyncStorage.setItem('journalEntries', JSON.stringify(newEntries));
              setEntries(newEntries);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error al eliminar entrada:', error);
              Alert.alert('Error', 'No se pudo eliminar la entrada');
            }
          }
        }
      ]
    );
  };

  const renderEntryModal = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.modalContainer}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            onPress={() => setShowModal(false)}
            style={styles.closeButton}
          >
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {currentEntry.id ? 'Editar Entrada' : 'Nueva Entrada'}
          </Text>
          <TouchableOpacity 
            onPress={saveEntry}
            style={styles.saveButton}
          >
            <MaterialCommunityIcons name="check" size={24} color="#1ADDDB" />
          </TouchableOpacity>
        </View>

        <View style={styles.moodSelector}>
          {Object.entries(moods).map(([mood, { icon, color }]) => (
            <TouchableOpacity
              key={mood}
              style={[
                styles.moodButton,
                currentEntry.mood === mood && { backgroundColor: color + '20' }
              ]}
              onPress={() => setCurrentEntry({ ...currentEntry, mood })}
            >
              <MaterialCommunityIcons 
                name={icon} 
                size={32} 
                color={currentEntry.mood === mood ? color : '#A3B8E8'} 
              />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          multiline
          placeholder="¿Cómo te sientes hoy?"
          placeholderTextColor="#A3B8E8"
          value={currentEntry.content}
          onChangeText={(content) => setCurrentEntry({ ...currentEntry, content })}
        />
      </View>
    </KeyboardAvoidingView>
  );

  const renderEntry = (entry) => (
    <View key={entry.id} style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <MaterialCommunityIcons 
          name={moods[entry.mood].icon} 
          size={24} 
          color={moods[entry.mood].color} 
        />
        <Text style={styles.entryDate}>
          {new Date(entry.date).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
        <View style={styles.entryActions}>
          <TouchableOpacity 
            onPress={() => {
              setCurrentEntry(entry);
              setShowModal(true);
            }}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#1ADDDB" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => deleteEntry(entry.id)}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="trash-can" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.entryContent}>{entry.content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../images/back.png')}
        style={styles.background}
        imageStyle={styles.imageStyle}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Diario</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              setCurrentEntry({
                id: null,
                date: new Date(),
                content: '',
                mood: 'neutral',
                tags: []
              });
              setShowModal(true);
            }}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#1ADDDB" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#1ADDDB" style={styles.loader} />
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#1ADDDB"
                colors={["#1ADDDB"]}
                progressBackgroundColor="rgba(29, 43, 95, 0.8)"
              />
            }
            style={styles.content}
          >
            {entries.length > 0 ? (
              entries.map(renderEntry)
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons 
                  name="book-open-page-variant" 
                  size={48} 
                  color="#A3B8E8" 
                />
                <Text style={styles.emptyText}>
                  No hay entradas en tu diario
                </Text>
                <Text style={styles.emptySubtext}>
                  Comienza a escribir tus pensamientos y experiencias
                </Text>
              </View>
            )}
          </ScrollView>
        )}
        <FloatingNavBar/>
        {showModal && renderEntryModal()}
      </ImageBackground>
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
  },
  imageStyle: {
    opacity: 0.1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  entryCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryDate: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#A3B8E8',
  },
  entryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  entryContent: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(3, 10, 36, 0.95)',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  moodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 12,
  },
  moodButton: {
    padding: 8,
    borderRadius: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#A3B8E8',
    marginTop: 8,
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default JournalScreen;