import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ImageBackground
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import ParticleBackground from '../components/ParticleBackground';
import FloatingNavBar from '../components/FloatingNavBar';

const API_URL = 'https://antobackend.onrender.com';

const ACHIEVEMENT_CATEGORIES = {
  TASKS: 'tasks',
  HABITS: 'habits',
  STREAKS: 'streaks',
  GENERAL: 'general'
};

const AchievementsScreen = ({ navigation }) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    totalPoints: 0,
    categoryStats: {}
  });

  const fetchAchievements = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('No token found');

      setLoading(true);
      const response = await fetch(`${API_URL}/api/achievements`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error fetching achievements');

      const data = await response.json();
      setAchievements(data.achievements);
      setStats({
        totalPoints: data.totalPoints,
        completed: data.achievements.filter(a => a.unlocked).length,
        total: data.achievements.length
      });
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudieron cargar los logros');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAchievements();
  }, [fetchAchievements]);

  const getAchievementIcon = (achievement) => {
    if (achievement.icon) return achievement.icon;

    // Iconos por defecto según la categoría
    switch (achievement.category) {
      case 'tasks':
        return 'checkbox-marked-circle';
      case 'habits':
        return 'lightning-bolt';
      case 'streaks':
        return 'fire';
      default:
        return 'trophy';
    }
  };

  const handleAchievementPress = useCallback((achievement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const formattedDate = achievement.unlockedAt 
      ? new Date(achievement.unlockedAt).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : null;

    const message = achievement.unlocked
      ? `${achievement.description}\n\nPuntos: +${achievement.points}\n${formattedDate ? `\nDesbloqueado el ${formattedDate}` : ''}`
      : `${achievement.description}\n\nPuntos por obtener: +${achievement.points}`;

    Alert.alert(
      achievement.title,
      message,
      [{ text: 'Cerrar', style: 'default' }]
    );
  }, []);

  const calculateProgress = useCallback(() => {
    return {
      total: stats.total || 0,
      completed: stats.completed || 0,
      percentage: stats.total ? (stats.completed / stats.total) * 100 : 0
    };
  }, [stats]);

  const progress = calculateProgress();

  // Filtrar logros por categoría
  const filteredAchievements = useMemo(() => {
    return achievements.filter(achievement => 
      selectedCategory === 'all' || achievement.category === selectedCategory
    );
  }, [achievements, selectedCategory]);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../images/back.png')}
        style={styles.background}
        imageStyle={styles.imageStyle}
      >
        <ParticleBackground />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Logros</Text>
          <View style={styles.pointsContainer}>
            <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
            <Text style={styles.pointsText}>{stats.totalPoints}</Text>
          </View>
        </View>

        {/* Main Content Container */}
        <View style={styles.mainContent}>
          {/* Progress Summary */}
          <View style={styles.progressContainer}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>Progreso Total</Text>
              <Text style={styles.progressPercentage}>
                {Math.round(progress.percentage)}%
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { width: `${progress.percentage}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {progress.completed} de {progress.total} logros completados
            </Text>
          </View>

          {/* Categories and List Container */}
          <View style={styles.contentContainer}>
            {/* Category Filter */}
            <View style={styles.categoriesWrapper}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesContainer}
              >
                <TouchableOpacity 
                  style={[
                    styles.categoryButton,
                    selectedCategory === 'all' && styles.categoryButtonActive
                  ]}
                  onPress={() => setSelectedCategory('all')}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === 'all' && styles.categoryTextActive
                  ]}>Todos</Text>
                </TouchableOpacity>
                {Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, value]) => (
                  <TouchableOpacity 
                    key={value}
                    style={[
                      styles.categoryButton,
                      selectedCategory === value && styles.categoryButtonActive
                    ]}
                    onPress={() => setSelectedCategory(value)}
                  >
                    <MaterialCommunityIcons 
                      name={getAchievementIcon({ category: value })} 
                      size={16} 
                      color={selectedCategory === value ? '#1ADDDB' : '#A3B8E8'} 
                    />
                    <Text style={[
                      styles.categoryText,
                      selectedCategory === value && styles.categoryTextActive
                    ]}>
                      {key.charAt(0) + key.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Achievements List */}
            <ScrollView
              style={styles.achievementsList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#1ADDDB"
                  colors={["#1ADDDB"]}
                  progressBackgroundColor="rgba(29, 43, 95, 0.8)"
                />
              }
            >
              {loading ? (
                <ActivityIndicator color="#1ADDDB" style={styles.loader} />
              ) : (
                filteredAchievements.map((achievement) => (
                  <TouchableOpacity
                    key={achievement.id}
                    style={[
                      styles.achievementCard,
                      achievement.unlocked && styles.achievementCardCompleted
                    ]}
                    onPress={() => handleAchievementPress(achievement)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.achievementContent}>
                      <View style={[
                        styles.achievementIcon,
                        { backgroundColor: achievement.unlocked ? '#1ADDDB' : '#4A4A4A' }
                      ]}>
                        <MaterialCommunityIcons 
                          name={getAchievementIcon(achievement)}
                          size={24}
                          color="#FFFFFF"
                        />
                      </View>
                      <View style={styles.achievementInfo}>
                        <Text style={styles.achievementTitle}>
                          {achievement.title}
                        </Text>
                        <Text style={styles.achievementDescription}>
                          {achievement.description}
                        </Text>
                      </View>
                      <View style={styles.achievementPoints}>
                        <MaterialCommunityIcons 
                          name="star" 
                          size={16} 
                          color={achievement.unlocked ? '#FFD700' : '#4A4A4A'} 
                        />
                        <Text style={[
                          styles.pointsValue,
                          !achievement.unlocked && styles.pointsValueLocked
                        ]}>
                          +{achievement.points}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
        <FloatingNavBar />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  pointsText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
  },
  progressContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 20,
    color: '#1ADDDB',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1ADDDB',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#A3B8E8',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  categoriesWrapper: {
    height: 32,
    marginBottom: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    marginRight: 6,
    gap: 3,
    height: 32,
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  categoryText: {
    color: '#A3B8E8',
    fontSize: 12,
    lineHeight: 16,
  },
  categoryTextActive: {
    color: '#1ADDDB',
    fontWeight: '500',
  },
  achievementsList: {
    paddingHorizontal: 16,
  },
  achievementCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  achievementCardCompleted: {
    backgroundColor: 'rgba(29, 43, 95, 0.9)',
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementInfo: {
    flex: 1,
    gap: 4,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#A3B8E8',
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
  pointsValueLocked: {
    color: '#4A4A4A',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AchievementsScreen; 