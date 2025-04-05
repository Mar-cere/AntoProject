import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, Text,StyleSheet, TouchableOpacity, ActivityIndicator} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AchievementCard = memo(() => {
    const navigation = useNavigation();
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);
  
    const loadAchievements = useCallback(async () => {
      try {
        const storedAchievements = await AsyncStorage.getItem('userAchievements');
        if (storedAchievements) {
          const parsedAchievements = JSON.parse(storedAchievements);
          // Ordenar por más recientes y mostrar solo los 2 últimos desbloqueados
          const recentAchievements = parsedAchievements
            .filter(achievement => achievement.unlocked)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 2);
          setAchievements(recentAchievements);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar logros:', error);
        setLoading(false);
      }
    }, []);
  
    useEffect(() => {
      loadAchievements();
    }, []);
  
    const getAchievementIcon = (type) => {
      switch (type) {
        case 'task': return 'checkbox-marked-circle';
        case 'habit': return 'lightning-bolt';
        case 'streak': return 'fire';
        case 'points': return 'star';
        default: return 'trophy';
      }
    };
  
    return (
      <View style={styles.achievementCardContainer}>
        <View style={styles.achievementCardHeader}>
          <View style={styles.achievementTitleContainer}>
            <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />
            <Text style={styles.achievementCardTitle}>Mis Logros</Text>
          </View>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('Achievements')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>Ver todos</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#1ADDDB" />
          </TouchableOpacity>
        </View>
  
        {loading ? (
          <ActivityIndicator color="#1ADDDB" style={styles.loader} />
        ) : achievements.length > 0 ? (
          <View style={styles.achievementsContainer}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementItem}>
                <View style={styles.achievementItemContent}>
                  <View style={[
                    styles.achievementIconBadge,
                    { backgroundColor: achievement.color || '#FFD700' }
                  ]}>
                    <MaterialCommunityIcons 
                      name={getAchievementIcon(achievement.type)}
                      size={20} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementItemTitle}>
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementItemDescription}>
                      {achievement.description}
                    </Text>
                    {achievement.date && (
                      <Text style={styles.achievementDate}>
                        Desbloqueado el {new Date(achievement.date).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.achievementPoints}>
                    <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                    <Text style={styles.pointsValue}>+{achievement.points}</Text>
                  </View>
                </View>
                {achievement.progress && (
                  <View style={styles.achievementProgressBar}>
                    <View 
                      style={[
                        styles.achievementProgressFill,
                        { width: `${achievement.progress}%` }
                      ]} 
                    />
                  </View>
                )}
              </View>
            ))}
            <TouchableOpacity 
              style={styles.viewAllAchievementsButton}
              onPress={() => navigation.navigate('Achievements')}
            >
              <Text style={styles.viewAllAchievementsText}>Ver todos los logros</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="trophy-outline" size={40} color="#A3B8E8" />
            <Text style={styles.emptyText}>No hay logros desbloqueados</Text>
            <TouchableOpacity 
              style={styles.viewAllAchievementsButton}
              onPress={() => navigation.navigate('Achievements')}
            >
              <Text style={styles.viewAllAchievementsText}>Ver todos los logros</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  });

  const styles = StyleSheet.create({
    achievementCardContainer: {
        backgroundColor: 'rgba(29, 43, 95, 0.8)',
        borderRadius: 15,
        padding: 4,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(26, 221, 219, 0.1)',
      },
      achievementCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
      },
      achievementTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      achievementCardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
      },
      achievementsContainer: {
        gap: 12,
      },
      achievementItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 12,
      },
      achievementItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      },
      achievementIconBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
      },
      achievementInfo: {
        flex: 1,
        gap: 4,
      },
      achievementItemTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
      },
      achievementItemDescription: {
        fontSize: 12,
        color: '#A3B8E8',
      },
      achievementDate: {
        fontSize: 10,
        color: '#A3B8E8',
        marginTop: 2,
      },
      achievementPoints: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
      },
      pointsValue: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: '500',
      },
      achievementProgressBar: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 8,
      },
      achievementProgressFill: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 2,
      },
      viewAllAchievementsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        marginTop: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(26, 221, 219, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(26, 221, 219, 0.2)',
      },
      viewAllAchievementsText: {
        color: '#1ADDDB',
        fontSize: 14,
        fontWeight: '500',
      },
      emptyContainer: {
        alignItems: 'center',
        padding: 24,
        gap: 12,
      },
      emptyText: {
        color: '#A3B8E8',
        fontSize: 16,
        textAlign: 'center',
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
        color: '#1ADDDB',
        fontSize: 14,
        fontWeight: '500',
      },
      loader: {
        padding: 24,
      },
  });

export default AchievementCard;