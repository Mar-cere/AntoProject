import React, { useState, useEffect, useCallback } from 'react';
import { 
  Modal, 
  View, 
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Switch,
  ScrollView,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

const CreateTaskModal = ({
  visible,
  onClose,
  onSubmit,
  formData,
  setFormData
}) => {
  const [pickerMode, setPickerMode] = useState(null);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const slideAnim = new Animated.Value(0);
  
  const isTask = formData.itemType === 'task';

  useEffect(() => {
    if (visible) {
      setNotificationEnabled(true);
      setErrors({});
      setIsSubmitting(false);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const formatTime = useCallback((date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }, []);

  const formatDate = useCallback((date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'El título debe tener al menos 3 caracteres';
    }

    if (formData.dueDate < new Date()) {
      newErrors.dueDate = 'La fecha no puede ser anterior a la actual';
    }

    if (isTask && formData.description && formData.description.trim().length > 500) {
      newErrors.description = 'La descripción no puede exceder 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isTask]);

  const handleDateChange = useCallback((event, selectedDate) => {
    setPickerMode(null);
    if (selectedDate) {
      const currentDate = new Date(formData.dueDate);
      selectedDate.setHours(currentDate.getHours());
      selectedDate.setMinutes(currentDate.getMinutes());
      
      // Validar que la fecha no sea anterior a la actual
      if (selectedDate < new Date()) {
        setErrors(prev => ({ ...prev, dueDate: 'La fecha no puede ser anterior a la actual' }));
        return;
      }
      
      setFormData({...formData, dueDate: selectedDate});
      setErrors(prev => ({ ...prev, dueDate: null }));
    }
  }, [formData, setFormData]);

  const handleTimeChange = useCallback((event, selectedTime) => {
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
        setErrors(prev => ({ ...prev, dueDate: 'La hora no puede ser anterior a la actual' }));
        return;
      }
      
      setFormData({...formData, dueDate: selectedTime});
      setErrors(prev => ({ ...prev, dueDate: null }));
    }
  }, [formData, setFormData]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const notifications = [{
        enabled: notificationEnabled,
        time: formData.dueDate
      }];

      const dataToSubmit = {
        title: formData.title.trim(),
        dueDate: formData.dueDate,
        itemType: formData.itemType,
        notifications,
        ...(isTask && {
          description: formData.description?.trim() || '',
          priority: formData.priority || 'medium',
          completed: false
        }),
      };

      await onSubmit(dataToSubmit);
    } catch (error) {
      setIsSubmitting(false);
    }
  }, [validateForm, formData, notificationEnabled, isTask, onSubmit]);

  const handleTypeChange = useCallback((type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    setErrors({});
  }, [formData, setFormData]);

  const handlePriorityChange = useCallback((priority) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFormData({...formData, priority});
  }, [formData, setFormData]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [300, 0],
                })
              }]
            }
          ]}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isTask ? 'Nueva Tarea' : 'Nuevo Recordatorio'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.7}
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
                activeOpacity={0.7}
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
                activeOpacity={0.7}
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Título *</Text>
              <TextInput
                style={[
                  styles.input, 
                  !isTask && styles.reminderInput,
                  errors.title && styles.inputError
                ]}
                placeholder="Ingresa el título"
                placeholderTextColor="#A3B8E8"
                value={formData.title}
                onChangeText={(text) => {
                  setFormData({...formData, title: text});
                  if (errors.title) setErrors(prev => ({ ...prev, title: null }));
                }}
                maxLength={100}
              />
              {errors.title && (
                <Text style={styles.errorText}>{errors.title}</Text>
              )}
            </View>

            {isTask && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Descripción (opcional)</Text>
                <TextInput
                  style={[
                    styles.input, 
                    styles.textArea,
                    errors.description && styles.inputError
                  ]}
                  placeholder="Describe tu tarea..."
                  placeholderTextColor="#A3B8E8"
                  value={formData.description}
                  onChangeText={(text) => {
                    setFormData({...formData, description: text});
                    if (errors.description) setErrors(prev => ({ ...prev, description: null }));
                  }}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
                {errors.description && (
                  <Text style={styles.errorText}>{errors.description}</Text>
                )}
                <Text style={styles.charCount}>
                  {formData.description?.length || 0}/500
                </Text>
              </View>
            )}

            <View style={styles.dateTimeContainer}>
              <Text style={styles.inputLabel}>Fecha y Hora *</Text>
              <View style={styles.dateTimeButtons}>
                <TouchableOpacity
                  style={[
                    styles.dateTimeButton,
                    styles.dateButton,
                    !isTask && styles.reminderDateTimeButton,
                    errors.dueDate && styles.inputError
                  ]}
                  onPress={() => setPickerMode('date')}
                  activeOpacity={0.7}
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
                    {formatDate(formData.dueDate)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dateTimeButton,
                    styles.timeButton,
                    !isTask && styles.reminderDateTimeButton,
                    errors.dueDate && styles.inputError
                  ]}
                  onPress={() => setPickerMode('time')}
                  activeOpacity={0.7}
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
              {errors.dueDate && (
                <Text style={styles.errorText}>{errors.dueDate}</Text>
              )}
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
                    { value: 'high', label: 'Alta', color: '#FF6B6B', icon: 'alert-circle' },
                    { value: 'medium', label: 'Media', color: '#FFD93D', icon: 'alert' },
                    { value: 'low', label: 'Baja', color: '#6BCB77', icon: 'checkmark-circle' }
                  ].map((priority) => (
                    <TouchableOpacity
                      key={priority.value}
                      style={[
                        styles.priorityButton,
                        formData.priority === priority.value && styles.priorityButtonActive,
                        { backgroundColor: priority.color + '20' }
                      ]}
                      onPress={() => handlePriorityChange(priority.value)}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={priority.icon} 
                        size={16} 
                        color={priority.color} 
                      />
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

            <View style={styles.notificationContainer}>
              <View style={styles.notificationHeader}>
                <Ionicons name="notifications-outline" size={20} color="#A3B8E8" />
                <Text style={styles.notificationLabel}>Notificación</Text>
              </View>
              <Switch
                value={notificationEnabled}
                onValueChange={setNotificationEnabled}
                thumbColor={notificationEnabled ? "#1ADDDB" : "#ccc"}
                trackColor={{ false: "#A3B8E8", true: "#1ADDDB" }}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                !isTask && styles.reminderSubmitButton,
                isSubmitting && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <View style={styles.loadingContainer}>
                  <Ionicons name="hourglass-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Creando...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>
                  {isTask ? 'Crear Tarea' : 'Crear Recordatorio'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
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
    maxHeight: '90%',
  },
  scrollContent: {
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  reminderTypeButtonActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  typeButtonText: {
    color: '#A3B8E8',
    fontSize: 16,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#1ADDDB',
  },
  reminderTypeButtonTextActive: {
    color: '#FF6B6B',
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  reminderInput: {
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 4,
  },
  charCount: {
    color: '#A3B8E8',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  dateTimeContainer: {
    gap: 8,
  },
  dateTimeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
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
    fontWeight: '500',
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
    fontWeight: '600',
    marginBottom: 12,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priorityButtonActive: {
    borderColor: '#1ADDDB',
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationLabel: {
    color: '#A3B8E8',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#1ADDDB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1ADDDB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  reminderSubmitButton: {
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default CreateTaskModal; 