import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Platform,
  Animated,
  Modal,
  BlurView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import FloatingNavBar from '../components/FloatingNavBar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api, ENDPOINTS } from '../config/api';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const moods = {
    happy: { icon: 'emoticon-happy', color: '#4CAF50' },
    neutral: { icon: 'emoticon-neutral', color: '#FFC107' },
    sad: { icon: 'emoticon-sad', color: '#FF5252' },
    excited: { icon: 'emoticon-excited', color: '#2196F3' },
    tired: { icon: 'emoticon-tired', color: '#9C27B0' }
  };

  const categories = [
    { id: 'personal', label: 'Personal', icon: 'account-heart' },
    { id: 'trabajo', label: 'Trabajo', icon: 'briefcase' },
    { id: 'salud', label: 'Salud', icon: 'heart-pulse' },
    { id: 'metas', label: 'Metas', icon: 'target' }
  ];

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(ENDPOINTS.JOURNAL, {
        mood: selectedFilter !== 'all' ? selectedFilter : undefined,
        search: searchQuery || undefined
      });
      setEntries(response);
    } catch (error) {
      console.error('Error al cargar entradas:', error);
      Alert.alert('Error', 'No se pudieron cargar las entradas del diario');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFilter, searchQuery]);

  const saveEntry = async () => {
    if (!currentEntry.content.trim()) {
      Alert.alert('Error', 'El contenido no puede estar vacío');
      return;
    }

    try {
      const entryData = {
        content: currentEntry.content.trim(),
        mood: currentEntry.mood,
        tags: currentEntry.tags || [],
        metadata: {
          // Opcional: puedes agregar estos campos si los necesitas
          location: null,
          weather: null,
          activity: null
        }
      };

      let response;
      if (currentEntry.id) {
        // Editar entrada existente
        response = await api.put(
          ENDPOINTS.JOURNAL_BY_ID(currentEntry.id),
          entryData
        );
      } else {
        // Crear nueva entrada
        response = await api.post(ENDPOINTS.JOURNAL, entryData);
      }

      setEntries(prev => {
        const newEntries = currentEntry.id
          ? prev.map(e => e.id === currentEntry.id ? response : e)
          : [response, ...prev];
        return newEntries;
      });

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
      Alert.alert('Error', 'No se pudo guardar la entrada. Por favor, intenta de nuevo.');
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
              await api.delete(ENDPOINTS.JOURNAL_BY_ID(id));
              setEntries(prev => prev.filter(entry => entry.id !== id));
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

  // Nuevo método para cargar el resumen de estados de ánimo
  const loadMoodSummary = async () => {
    try {
      const summary = await api.get(ENDPOINTS.JOURNAL_MOOD_SUMMARY);
      // Aquí podrías actualizar un estado para mostrar estadísticas
      console.log('Resumen de estados de ánimo:', summary);
    } catch (error) {
      console.error('Error al cargar resumen:', error);
    }
  };

  useEffect(() => {
    loadEntries();
    loadMoodSummary();
  }, [loadEntries]);

  // Nuevo efecto para manejar la búsqueda con debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery || selectedFilter !== 'all') {
        loadEntries();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedFilter]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadEntries();
  }, []);

  const renderEntryModal = () => (
    <Modal
      visible={showModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Indicador de deslizamiento */}
          <View style={styles.modalIndicator} />

          {/* Fecha */}
          <Text style={styles.modalDate}>
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>

          {/* Estados de ánimo */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.moodScrollView}
          >
            {Object.entries(moods).map(([mood, { icon, color }]) => (
              <TouchableOpacity
                key={mood}
                style={[
                  styles.moodOption,
                  currentEntry.mood === mood && { 
                    backgroundColor: color + '20',
                    borderColor: color
                  }
                ]}
                onPress={() => {
                  setCurrentEntry({ ...currentEntry, mood });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <MaterialCommunityIcons 
                  name={icon} 
                  size={28} 
                  color={currentEntry.mood === mood ? color : '#A3B8E8'} 
                />
                <Text style={[
                  styles.moodText,
                  currentEntry.mood === mood && { color }
                ]}>
                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Campo de texto */}
          <TextInput
            style={styles.journalInput}
            multiline
            placeholder="¿Cómo te sientes hoy?"
            placeholderTextColor="#A3B8E8"
            value={currentEntry.content}
            onChangeText={(content) => setCurrentEntry({ ...currentEntry, content })}
            textAlignVertical="top"
          />

          {/* Botones de acción */}
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={saveEntry}
            >
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const FadeInView = ({ delay, children }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: delay,
        useNativeDriver: true
      }).start();
    }, []);

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        {children}
      </Animated.View>
    );
  };

  const renderEntry = (entry, index) => (
    <FadeInView key={entry.id || index} delay={index * 100}>
      <View style={styles.entryCard}>
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
    </FadeInView>
  );

  const Header = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Mi Diario</Text>
        <Text style={styles.headerSubtitle}>
          {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        <MaterialCommunityIcons 
          name="plus" 
          size={24} 
          color="#1ADDDB" 
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Header />
        <ImageBackground
          source={require('../images/back.png')}
          style={styles.background}
          imageStyle={styles.imageStyle}
        >
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar en el diario..."
              placeholderTextColor="#A3B8E8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.filterButton}>
              <MaterialCommunityIcons name="filter-variant" size={24} color="#1ADDDB" />
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
                entries.map((entry, index) => renderEntry(entry, index))
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
        </ImageBackground>
        <FloatingNavBar activeTab="journal" />
        {showModal && renderEntryModal()}
      </View>
    </SafeAreaProvider>
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(3, 10, 36, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 219, 0.2)',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#A3B8E8',
    opacity: 0.8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  entryCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
    shadowColor: "#1ADDDB",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1D2B5F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  modalIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#A3B8E8',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalDate: {
    fontSize: 16,
    color: '#A3B8E8',
    textAlign: 'center',
    marginBottom: 20,
  },
  moodScrollView: {
    marginBottom: 20,
  },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(163, 184, 232, 0.3)',
  },
  moodText: {
    color: '#A3B8E8',
    marginLeft: 8,
    fontSize: 16,
  },
  journalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    height: 200,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1ADDDB',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  filterButton: {
    padding: 8,
  },
});

export default JournalScreen;