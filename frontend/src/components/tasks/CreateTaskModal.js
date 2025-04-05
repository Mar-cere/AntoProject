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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const CreateTaskModal = ({
  visible,
  onClose,
  onSubmit,
  formData,
  setFormData
}) => {
  const [pickerMode, setPickerMode] = useState(null);
  const isTask = formData.itemType === 'task';

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleDateChange = (event, selectedDate) => {
    setPickerMode(null);
    if (selectedDate) {
      const currentDate = new Date(formData.dueDate);
      selectedDate.setHours(currentDate.getHours());
      selectedDate.setMinutes(currentDate.getMinutes());
      
      // Validar que la fecha no sea anterior a la actual
      if (selectedDate < new Date()) {
        Alert.alert('Error', 'La fecha no puede ser anterior a la actual');
        return;
      }
      
      setFormData({...formData, dueDate: selectedDate});
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setPickerMode(null);
    if (selectedTime) {
      const currentDate = new Date(formData.dueDate);
      selectedTime.setFullYear(currentDate.getFullYear());
      selectedTime.setMonth(currentDate.getMonth());
      selectedTime.setDate(currentDate.getDate());
      
      // Validar que la hora no sea anterior a la actual si es el mismo día
      const now = new Date();
      if (
        selectedTime.getDate() === now.getDate() &&
        selectedTime.getMonth() === now.getMonth() &&
        selectedTime.getFullYear() === now.getFullYear() &&
        selectedTime < now
      ) {
        Alert.alert('Error', 'La hora no puede ser anterior a la actual');
        return;
      }
      
      setFormData({...formData, dueDate: selectedTime});
    }
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título');
      return;
    }

    // Validar que la fecha no sea anterior a la actual
    if (formData.dueDate < new Date()) {
      Alert.alert('Error', 'La fecha no puede ser anterior a la actual');
      return;
    }

    // Preparar los datos según el tipo
    const dataToSubmit = {
      title: formData.title.trim(),
      dueDate: formData.dueDate,
      itemType: formData.itemType,
      isReminder: formData.itemType === 'reminder',
      
      // Para tareas incluimos campos adicionales
      ...(isTask && {
        description: formData.description?.trim() || '',
        priority: formData.priority || 'medium',
        completed: false
      }),

      // Para recordatorios
      ...(!isTask && {
        notification: {
          enabled: true,
          time: formData.dueDate
        }
      })
    };

    onSubmit(dataToSubmit);
  };

  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      itemType: type,
      // Reiniciar campos específicos según el tipo
      ...(type === 'task' ? {
        priority: 'medium',
        description: ''
      } : {
        // Campos por defecto para recordatorios
        priority: undefined,
        description: undefined
      })
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
            <Text style={styles.modalTitle}>
              {isTask ? 'Nueva Tarea' : 'Nuevo Recordatorio'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#A3B8E8" />
            </TouchableOpacity>
          </View>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                isTask && styles.typeButtonActive
              ]}
              onPress={() => handleTypeChange('task')}
            >
              <Ionicons 
                name="checkbox-outline" 
                size={20} 
                color={isTask ? '#1ADDDB' : '#A3B8E8'} 
              />
              <Text style={[
                styles.typeButtonText,
                isTask && styles.typeButtonTextActive
              ]}>Tarea</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                !isTask && styles.reminderTypeButtonActive
              ]}
              onPress={() => handleTypeChange('reminder')}
            >
              <Ionicons 
                name="alarm-outline" 
                size={20} 
                color={!isTask ? '#FF6B6B' : '#A3B8E8'} 
              />
              <Text style={[
                styles.typeButtonText,
                !isTask && styles.reminderTypeButtonTextActive
              ]}>Recordatorio</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, !isTask && styles.reminderInput]}
            placeholder="Título"
            placeholderTextColor="#A3B8E8"
            value={formData.title}
            onChangeText={(text) => setFormData({...formData, title: text})}
          />

          {isTask && (
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción (opcional)"
              placeholderTextColor="#A3B8E8"
              value={formData.description}
              onChangeText={(text) => setFormData({...formData, description: text})}
              multiline
              numberOfLines={4}
            />
          )}

          <View style={styles.dateTimeContainer}>
            <TouchableOpacity
              style={[
                styles.dateTimeButton,
                styles.dateButton,
                !isTask && styles.reminderDateTimeButton
              ]}
              onPress={() => setPickerMode('date')}
            >
              <Ionicons 
                name="calendar-outline" 
                size={20} 
                color={!isTask ? '#FF6B6B' : '#1ADDDB'} 
              />
              <Text style={[
                styles.dateTimeButtonText,
                !isTask && styles.reminderDateTimeText
              ]}>
                {formData.dueDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.dateTimeButton,
                styles.timeButton,
                !isTask && styles.reminderDateTimeButton
              ]}
              onPress={() => setPickerMode('time')}
            >
              <Ionicons 
                name="time-outline" 
                size={20} 
                color={!isTask ? '#FF6B6B' : '#1ADDDB'} 
              />
              <Text style={[
                styles.dateTimeButtonText,
                !isTask && styles.reminderDateTimeText
              ]}>
                {formatTime(formData.dueDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {pickerMode && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={formData.dueDate}
                mode={pickerMode}
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={pickerMode === 'date' ? handleDateChange : handleTimeChange}
                minimumDate={pickerMode === 'date' ? new Date() : undefined}
                textColor="#FFFFFF"
                style={styles.picker}
              />
            </View>
          )}

          {isTask && (
            <View style={styles.prioritySelector}>
              <Text style={styles.sectionTitle}>Prioridad</Text>
              <View style={styles.priorityButtons}>
                {[
                  { value: 'high', label: 'Alta', color: '#FF6B6B' },
                  { value: 'medium', label: 'Media', color: '#FFD93D' },
                  { value: 'low', label: 'Baja', color: '#6BCB77' }
                ].map((priority) => (
                  <TouchableOpacity
                    key={priority.value}
                    style={[
                      styles.priorityButton,
                      formData.priority === priority.value && styles.priorityButtonActive,
                      { backgroundColor: priority.color + '40' }
                    ]}
                    onPress={() => setFormData({...formData, priority: priority.value})}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      { color: priority.color }
                    ]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              !isTask && styles.reminderSubmitButton
            ]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>
              {isTask ? 'Crear Tarea' : 'Crear Recordatorio'}
            </Text>
          </TouchableOpacity>
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
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
  },
  reminderTypeButtonActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  typeButtonText: {
    color: '#A3B8E8',
    fontSize: 16,
  },
  typeButtonTextActive: {
    color: '#1ADDDB',
  },
  reminderTypeButtonTextActive: {
    color: '#FF6B6B',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
  },
  reminderInput: {
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
  },
  reminderDateTimeButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  dateButton: {
    flex: 3,
  },
  timeButton: {
    flex: 2,
  },
  dateTimeButtonText: {
    color: '#1ADDDB',
    fontSize: 16,
  },
  reminderDateTimeText: {
    color: '#FF6B6B',
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
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  priorityButtonActive: {
    borderWidth: 1,
    borderColor: '#1ADDDB',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#1ADDDB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  reminderSubmitButton: {
    backgroundColor: '#FF6B6B',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  prioritySelector: {
    marginBottom: 16,
  },
});

export default CreateTaskModal; 