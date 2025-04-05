import React from 'react';
import { 
  ScrollView, 
  RefreshControl, 
  StyleSheet, 
  View
} from 'react-native';

const DashboardScroll = ({ 
  children, 
  refreshing, 
  onRefresh
}) => {
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1ADDDB"
            colors={["#1ADDDB"]}
            progressBackgroundColor="rgba(29, 43, 95, 0.8)"
          />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {children}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 8,
    paddingTop: 8, // Reducido porque ya no necesitamos tanto espacio arriba
    paddingBottom: 100, // Espacio para la barra flotante
  }
});

export default DashboardScroll;
