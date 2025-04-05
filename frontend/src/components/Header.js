import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'react-native';

const Header = memo(({ greeting, userName, userPoints, userAvatar }) => {
  const navigation = useNavigation();
  
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <Text style={styles.greeting}>{greeting || 'Bienvenido'}</Text>
        <Text style={styles.userName}>{userName || 'Usuario'}</Text>
      </View>
      
      <View style={styles.headerRight}>
        <View style={styles.pointsContainer}>
          <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
          <Text style={styles.pointsText}>{userPoints || 0}</Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => navigation.navigate('Profile')}
          style={styles.avatarContainer}
        >
          {userAvatar ? (
            <Image 
              source={{ uri: userAvatar }} 
              style={styles.avatar}
              defaultSource={require('../images/avatar.png')}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={24} color="#A3B8E8" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  greeting: {
    fontSize: 16,
    color: '#A3B8E8',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  pointsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: '#1ADDDB',
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1D2B5F',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1D2B5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Header;
