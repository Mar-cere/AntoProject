import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const HABIT_ICONS = {
  exercise: 'run',
  meditation: 'meditation',
  reading: 'book-open-variant',
  water: 'water',
  sleep: 'sleep',
  study: 'book-education',
  diet: 'food-apple',
  coding: 'code-tags',
};

const CreateHabitModal = ({
  visible,
  onClose,
  onSubmit,
  formData,
  setFormData
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título');
      return;
    }

    if (formData.title.trim().length < 3) {
      Alert.alert('Error', 'El título debe tener al menos 3 caracteres');
      return;
    }

    if (formData.title.trim().length > 50) {
      Alert.alert('Error', 'El título no puede exceder 50 caracteres');
      return;
    }

    if (formData.description && formData.description.trim().length > 200) {
      Alert.alert('Error', 'La descripción no puede exceder 200 caracteres');
      return;
    }

    const dataToSubmit = {
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      icon: formData.icon,
      frequency: formData.frequency,
      reminder: {
        time: formData.reminder,
        enabled: true
      },
      priority: formData.priority || 'medium',
    };

    onSubmit(dataToSubmit);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nuevo Hábito</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <MaterialCommunityIcons name="close" size={24} color="#A3B8E8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
            <TextInput
              style={styles.input}
              placeholder="Título"
              placeholderTextColor="#A3B8E8"
              value={formData.title}
              onChangeText={(text) => setFormData({...formData, title: text})}
              maxLength={50}
              autoFocus={true}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción (opcional)"
              placeholderTextColor="#A3B8E8"
              value={formData.description}
              onChangeText={(text) => setFormData({...formData, description: text})}
              multiline
              numberOfLines={4}
              maxLength={200}
            />

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Icono</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.iconSelector}
              >
                {Object.entries(HABIT_ICONS).map(([key, icon]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.iconButton,
                      formData.icon === key && styles.iconButtonSelected
                    ]}
                    onPress={() => setFormData({...formData, icon: key})}
                  >
                    <MaterialCommunityIcons
                      name={icon}
                      size={24}
                      color={formData.icon === key ? "#1ADDDB" : "#A3B8E8"}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Frecuencia</Text>
              <View style={styles.frequencySelector}>
                <TouchableOpacity
                  style={[
                    styles.frequencyButton,
                    formData.frequency === 'daily' && styles.frequencyButtonSelected
                  ]}
                  onPress={() => setFormData({...formData, frequency: 'daily'})}
                >
                  <MaterialCommunityIcons 
                    name="repeat" 
                    size={20} 
                    color={formData.frequency === 'daily' ? "#1ADDDB" : "#A3B8E8"} 
                  />
                  <Text style={[
                    styles.frequencyButtonText,
                    formData.frequency === 'daily' && styles.frequencyButtonTextSelected
                  ]}>Diario</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.frequencyButton,
                    formData.frequency === 'weekly' && styles.frequencyButtonSelected
                  ]}
                  onPress={() => setFormData({...formData, frequency: 'weekly'})}
                >
                  <MaterialCommunityIcons 
                    name="calendar-week" 
                    size={20} 
                    color={formData.frequency === 'weekly' ? "#1ADDDB" : "#A3B8E8"} 
                  />
                  <Text style={[
                    styles.frequencyButtonText,
                    formData.frequency === 'weekly' && styles.frequencyButtonTextSelected
                  ]}>Semanal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.frequencyButton,
                    formData.frequency === 'monthly' && styles.frequencyButtonSelected
                  ]}
                  onPress={() => setFormData({ ...formData, frequency: 'monthly' })}
                >
                  <MaterialCommunityIcons
                    name="calendar-month"
                    size={20}
                    color={formData.frequency === 'monthly' ? "#1ADDDB" : "#A3B8E8"}
                  />
                  <Text style={[
                    styles.frequencyButtonText,
                    formData.frequency === 'monthly' && styles.frequencyButtonTextSelected
                  ]}>Mensual</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Recordatorio</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialCommunityIcons 
                  name="clock-outline" 
                  size={20} 
                  color="#1ADDDB" 
                />
                <Text style={styles.dateTimeButtonText}>
                  {formatTime(formData.reminder)}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={formData.reminder}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedTime) => {
                    setShowDatePicker(false);
                    if (selectedTime) {
                      setFormData({...formData, reminder: selectedTime});
                    }
                  }}
                  textColor="#FFFFFF"
                  style={styles.picker}
                />
              </View>
            )}

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Prioridad</Text>
              <View style={styles.prioritySelector}>
                {['low', 'medium', 'high'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.priorityButton,
                      formData.priority === level && styles.priorityButtonSelected
                    ]}
                    onPress={() => setFormData({ ...formData, priority: level })}
                  >
                    <MaterialCommunityIcons
                      name={
                        level === 'high'
                          ? 'alert-circle'
                          : level === 'medium'
                          ? 'alert'
                          : 'check-circle'
                      }
                      size={20}
                      color={
                        level === 'high'
                          ? '#FF6B6B'
                          : level === 'medium'
                          ? '#FFD93D'
                          : '#6BCB77'
                      }
                    />
                    <Text
                      style={[
                        styles.priorityButtonText,
                        formData.priority === level && styles.priorityButtonTextSelected
                      ]}
                    >
                      {level === 'high'
                        ? 'Alta'
                        : level === 'medium'
                        ? 'Media'
                        : 'Baja'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>Crear Hábito</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'rgba(29, 43, 95, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    flexGrow: 0,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  iconSelector: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconButtonSelected: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderWidth: 1,
    borderColor: '#1ADDDB',
  },
  frequencySelector: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  frequencyButtonSelected: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderWidth: 1,
    borderColor: '#1ADDDB',
  },
  frequencyButtonText: {
    color: '#A3B8E8',
    fontSize: 14,
    fontWeight: '500',
  },
  frequencyButtonTextSelected: {
    color: '#1ADDDB',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
  },
  dateTimeButtonText: {
    color: '#1ADDDB',
    fontSize: 16,
  },
  pickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    borderRadius: 12,
    marginVertical: 8,
    paddingVertical: Platform.OS === 'ios' ? 8 : 0,
  },
  picker: {
    width: '100%',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'android' && {
      marginLeft: 'auto',
      marginRight: 'auto',
    }),
  },
  submitButton: {
    backgroundColor: '#1ADDDB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#1ADDDB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  priorityButtonSelected: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  priorityButtonText: {
    color: '#A3B8E8',
    fontSize: 14,
    fontWeight: '500',
  },
  priorityButtonTextSelected: {
    color: '#FF6B6B',
  },
});

export default CreateHabitModal;
