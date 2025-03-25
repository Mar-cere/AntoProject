import React, { useState, useEffect, useCallback } from 'react';
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


const ACHIEVEMENT_CATEGORIES = {
  TASKS: 'tasks',
  HABITS: 'habits',
  POINTS: 'points',
  SPECIAL: 'special'
};

const AchievementsScreen = ({ navigation }) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [userPoints, setUserPoints] = useState(0);

  const loadAchievements = useCallback(async () => {
    try {
      const [storedAchievements, storedPoints] = await Promise.all([
        AsyncStorage.getItem('userAchievements'),
        AsyncStorage.getItem('userPoints')
      ]);

      if (storedAchievements) {
        setAchievements(JSON.parse(storedAchievements));
      }
      if (storedPoints) {
        setUserPoints(parseInt(storedPoints));
      }
    } catch (error) {
      console.error('Error al cargar logros:', error);
      Alert.alert('Error', 'No se pudieron cargar los logros');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAchievements();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAchievements();
  }, []);

  const getAchievementIcon = (type) => {
    switch (type) {
      case ACHIEVEMENT_CATEGORIES.TASKS:
        return 'checkbox-marked-circle';
      case ACHIEVEMENT_CATEGORIES.HABITS:
        return 'lightning-bolt';
      case ACHIEVEMENT_CATEGORIES.POINTS:
        return 'star';
      case ACHIEVEMENT_CATEGORIES.SPECIAL:
        return 'trophy';
      default:
        return 'medal';
    }
  };

  const handleAchievementPress = (achievement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      achievement.title,
      `${achievement.description}\n\nPuntos: +${achievement.points}`,
      [{ text: 'Cerrar', style: 'default' }]
    );
  };

  const filteredAchievements = achievements.filter(achievement => 
    selectedCategory === 'all' || achievement.type === selectedCategory
  );

  const calculateProgress = () => {
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    return {
      total: achievements.length,
      unlocked: unlockedCount,
      percentage: (unlockedCount / achievements.length) * 100
    };
  };

  const progress = calculateProgress();

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
            <Text style={styles.pointsText}>{userPoints}</Text>
          </View>
        </View>

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
            {progress.unlocked} de {progress.total} logros desbloqueados
          </Text>
        </View>

        {/* Category Filter */}
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
          {Object.values(ACHIEVEMENT_CATEGORIES).map((category) => (
            <TouchableOpacity 
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <MaterialCommunityIcons 
                name={getAchievementIcon(category)} 
                size={20} 
                color={selectedCategory === category ? '#1ADDDB' : '#A3B8E8'} 
              />
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive
              ]}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
                  achievement.unlocked && styles.achievementCardUnlocked
                ]}
                onPress={() => handleAchievementPress(achievement)}
                activeOpacity={0.7}
              >
                <View style={styles.achievementContent}>
                  <View style={[
                    styles.achievementIcon,
                    { backgroundColor: achievement.unlocked ? achievement.color || '#FFD700' : '#4A4A4A' }
                  ]}>
                    <MaterialCommunityIcons 
                      name={getAchievementIcon(achievement.type)}
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
                    {achievement.unlocked && achievement.date && (
                      <Text style={styles.achievementDate}>
                        Desbloqueado el {new Date(achievement.date).toLocaleDateString()}
                      </Text>
                    )}
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
                {achievement.progress !== undefined && (
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar,
                        { width: `${achievement.progress}%` }
                      ]} 
                    />
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
        <FloatingNavBar/>
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
  progressContainer: {
    margin: 16,
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
  categoriesContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    marginRight: 8,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  categoryText: {
    color: '#A3B8E8',
    fontSize: 14,
  },
  categoryTextActive: {
    color: '#1ADDDB',
    fontWeight: '500',
  },
  achievementsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  achievementCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  achievementCardUnlocked: {
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
  achievementDate: {
    fontSize: 12,
    color: '#A3B8E8',
    marginTop: 4,
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
    marginTop: 20,
  },
});

export default AchievementsScreen; 