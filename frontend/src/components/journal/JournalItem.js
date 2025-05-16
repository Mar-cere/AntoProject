import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const moods = {
  happy: { icon: 'emoticon-happy', color: '#4CAF50' },
  neutral: { icon: 'emoticon-neutral', color: '#FFC107' },
  sad: { icon: 'emoticon-sad', color: '#FF5252' },
  excited: { icon: 'emoticon-excited', color: '#2196F3' },
  tired: { icon: 'emoticon-tired', color: '#9C27B0' }
};

const JournalItem = ({ entry, onEdit, onDelete }) => {
  const moodData = moods[entry.mood] || moods['neutral'];

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <MaterialCommunityIcons 
          name={moodData.icon} 
          size={24} 
          color={moodData.color} 
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
            onPress={() => onEdit(entry)}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#1ADDDB" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => onDelete(entry.id)}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons name="trash-can" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.entryContent}>{entry.content}</Text>
      {/* Puedes agregar aquí más campos como tags, gratitud, etc. */}
    </View>
  );
};

const styles = StyleSheet.create({
  entryCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
    shadowColor: "#1ADDDB",
    shadowOffset: { width: 0, height: 4 },
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
});

export default JournalItem;
