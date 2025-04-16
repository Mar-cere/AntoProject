import { 
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
    import { MaterialCommunityIcons } from '@expo/vector-icons';

export const cardColors = {
  primary: '#1ADDDB',
  secondary: '#A3B8E8',
  background: 'rgba(29, 43, 95, 0.8)',
  cardBg: 'rgba(255, 255, 255, 0.05)',
  success: '#4CAF50',
  warning: '#FFD93D',
  error: '#FF6B6B',
  border: 'rgba(26, 221, 219, 0.1)',
};

export const commonStyles = StyleSheet.create({
  cardContainer: {
    backgroundColor: cardColors.background,
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: cardColors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
  },
  viewAllText: {
    color: cardColors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  itemContainer: {
    backgroundColor: cardColors.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyText: {
    color: cardColors.secondary,
    fontSize: 16,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.2)',
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: cardColors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    padding: 24,
  },
});

export const CardHeader = ({ icon, title, onViewAll }) => (
  <View style={commonStyles.cardHeader}>
    <View style={commonStyles.titleContainer}>
      <MaterialCommunityIcons name={icon} size={24} color={cardColors.primary} />
      <Text style={commonStyles.title}>{title}</Text>
    </View>
    <TouchableOpacity 
      style={commonStyles.viewAllButton}
      onPress={onViewAll}
      activeOpacity={0.7}
    >
      <Text style={commonStyles.viewAllText}>Ver todos</Text>
      <MaterialCommunityIcons name="chevron-right" size={16} color={cardColors.primary} />
    </TouchableOpacity>
  </View>
);

export const EmptyState = ({ icon, message, onAdd, addButtonText }) => (
  <View style={commonStyles.emptyContainer}>
    <MaterialCommunityIcons name={icon} size={40} color={cardColors.secondary} />
    <Text style={commonStyles.emptyText}>{message}</Text>
    {onAdd && (
      <TouchableOpacity 
        style={commonStyles.addButton}
        onPress={onAdd}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="plus" size={16} color={cardColors.primary} />
        <Text style={commonStyles.addButtonText}>{addButtonText}</Text>
      </TouchableOpacity>
    )}
  </View>
);
