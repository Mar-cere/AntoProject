import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  StyleSheet,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

const moods = {
  happy: { icon: 'emoticon-happy', color: '#4CAF50' },
  neutral: { icon: 'emoticon-neutral', color: '#FFC107' },
  sad: { icon: 'emoticon-sad', color: '#FF5252' },
  excited: { icon: 'emoticon-excited', color: '#2196F3' },
  tired: { icon: 'emoticon-tired', color: '#9C27B0' }
};

const activities = [
  { icon: 'briefcase', label: 'Trabajo' },
  { icon: 'book-open-variant', label: 'Estudio' },
  { icon: 'account-group', label: 'Socializando' },
  { icon: 'bed', label: 'Descansando' },
  { icon: 'run', label: 'Ejercicio' },
  { icon: 'dots-horizontal', label: 'Otro' }
];

const privacyOptions = [
  { icon: 'lock', label: 'Solo para mí', value: 'private' },
  { icon: 'message-text', label: 'Incluir en el chat', value: 'chat' }
];

const moodLevels = [
  { key: 'sad', label: 'Triste', emoji: '😢', color: '#FF5252' },
  { key: 'tired', label: 'Cansado', emoji: '🥱', color: '#9C27B0' },
  { key: 'neutral', label: 'Neutral', emoji: '😐', color: '#FFC107' },
  { key: 'happy', label: 'Feliz', emoji: '😊', color: '#4CAF50' },
  { key: 'excited', label: 'Eufórico', emoji: '🤩', color: '#2196F3' }
];

const JournalEntryModal = ({
  visible,
  onClose,
  onSave,
  entry,
  setEntry
}) => {
  const handleSave = () => {
    if (!entry.content || !entry.content.trim()) {
      Alert.alert('Error', 'El contenido no puede estar vacío');
      return;
    }
    onSave();
  };

  // Resumen visual: emoji y color según mood e intensidad
  const moodEmoji = {
    happy: '😊', neutral: '😐', sad: '😢', excited: '🤩', tired: '🥱'
  };
  const moodColor = {
    happy: '#4CAF50', neutral: '#FFC107', sad: '#FF5252', excited: '#2196F3', tired: '#9C27B0'
  };

  const moodIndex = moodLevels.findIndex(m => m.key === entry.mood);
  const sliderValue = moodIndex !== -1 ? moodIndex : 2; // 2 es 'neutral'
  const currentMood = moodLevels[sliderValue];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalIndicator} />

            {/* Resumen visual */}
            <View style={[
              styles.visualSummary,
              { backgroundColor: currentMood.color + '22' }
            ]}>
              <Text style={styles.visualEmoji}>{currentMood.emoji}</Text>
              <Text style={styles.visualText}>{currentMood.label}</Text>
            </View>

            <Text style={styles.modalDate}>
              {new Date(entry.date || Date.now()).toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>

            {/* Selección de emociones */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>¿Cómo te sientes hoy?</Text>
              <Slider
                minimumValue={0}
                maximumValue={moodLevels.length - 1}
                step={1}
                value={sliderValue}
                onValueChange={value => {
                  const mood = moodLevels[value];
                  setEntry({ ...entry, mood: mood.key });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                minimumTrackTintColor={currentMood.color}
                maximumTrackTintColor="#A3B8E8"
                thumbTintColor={currentMood.color}
                style={{ marginHorizontal: 8 }}
              />
              <View style={styles.moodSliderLabels}>
                {moodLevels.map((mood, idx) => (
                  <View key={mood.key} style={styles.moodSliderLabel}>
                    <Text style={{ fontSize: 28 }}>{mood.emoji}</Text>
                    <Text style={{ color: '#A3B8E8', fontSize: 12 }}>{mood.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Selección de actividades */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>¿Qué estabas haciendo?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {activities.map(act => (
                  <TouchableOpacity
                    key={act.label}
                    style={[
                      styles.activityButton,
                      entry.activity === act.label && { backgroundColor: '#1ADDDB22', borderColor: '#1ADDDB' }
                    ]}
                    onPress={() => {
                      setEntry({ ...entry, activity: act.label });
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <MaterialCommunityIcons name={act.icon} size={22} color={entry.activity === act.label ? '#1ADDDB' : '#A3B8E8'} />
                    <Text style={[
                      styles.activityText,
                      entry.activity === act.label && { color: '#1ADDDB' }
                    ]}>{act.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput
                style={styles.activityInput}
                placeholder="Otra actividad..."
                placeholderTextColor="#A3B8E8"
                value={entry.activityCustom || ''}
                onChangeText={text => setEntry({ ...entry, activity: text })}
              />
            </View>

            {/* Privacidad avanzada */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Privacidad</Text>
              <View style={styles.privacyRow}>
                {privacyOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.privacyButton,
                      entry.privacy === opt.value && { backgroundColor: '#1ADDDB22', borderColor: '#1ADDDB' }
                    ]}
                    onPress={() => {
                      setEntry({ ...entry, privacy: opt.value });
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <MaterialCommunityIcons name={opt.icon} size={20} color={entry.privacy === opt.value ? '#1ADDDB' : '#A3B8E8'} />
                    <Text style={[
                      styles.privacyText,
                      entry.privacy === opt.value && { color: '#1ADDDB' }
                    ]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Campo de gratitud */}
            <TextInput
              style={styles.gratitudeInput}
              placeholder="Algo por lo que hoy te sientes agradecido (opcional)"
              placeholderTextColor="#FFD93D"
              value={entry.gratitude || ''}
              onChangeText={gratitude => setEntry({ ...entry, gratitude })}
            />

            {/* Campo de texto principal */}
            <TextInput
              style={styles.journalInput}
              multiline
              placeholder="¿Cómo te sientes hoy?"
              placeholderTextColor="#A3B8E8"
              value={entry.content}
              onChangeText={(content) => setEntry({ ...entry, content })}
              textAlignVertical="top"
            />

            {/* Etiquetas */}
            <TextInput
              style={styles.tagsInput}
              placeholder="Etiquetas (separadas por coma)"
              placeholderTextColor="#A3B8E8"
              value={entry.tags ? entry.tags.join(', ') : ''}
              onChangeText={text => setEntry({ ...entry, tags: text.split(',').map(t => t.trim()).filter(Boolean) })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSave}
                accessibilityLabel="Guardar entrada de diario"
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1D2B5F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
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
  visualSummary: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
  },
  visualEmoji: {
    fontSize: 32,
    marginRight: 8,
  },
  visualText: {
    fontSize: 18,
    color: '#A3B8E8',
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#A3B8E8',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  activityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(163, 184, 232, 0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 6,
  },
  activityText: {
    color: '#A3B8E8',
    fontSize: 14,
  },
  activityInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    color: '#A3B8E8',
    fontSize: 14,
    marginTop: 8,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  privacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(163, 184, 232, 0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 6,
  },
  privacyText: {
    color: '#A3B8E8',
    fontSize: 14,
  },
  gratitudeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    color: '#FFD93D',
    fontSize: 14,
    marginBottom: 12,
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
  tagsInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    color: '#1ADDDB',
    fontSize: 14,
    marginBottom: 12,
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
  moodSliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginHorizontal: 4,
  },
  moodSliderLabel: {
    alignItems: 'center',
    width: 50,
  },
});

export default JournalEntryModal;
