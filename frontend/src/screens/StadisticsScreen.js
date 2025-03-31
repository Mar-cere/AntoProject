import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const StadisticsScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('daily');
  const [activeDataType, setActiveDataType] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Datos de ejemplo para las gráficas
  const [taskStats, setTaskStats] = useState({
    daily: {
      labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
      datasets: [
        {
          data: [3, 5, 2, 4, 6, 3, 4],
          color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ["Tareas completadas"]
    },
    weekly: {
      labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
      datasets: [
        {
          data: [12, 18, 15, 20],
          color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ["Tareas completadas por semana"]
    },
    monthly: {
      labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
      datasets: [
        {
          data: [45, 52, 38, 60, 55, 48],
          color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ["Tareas completadas por mes"]
    }
  });
  
  const [habitStats, setHabitStats] = useState({
    daily: {
      labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
      datasets: [
        {
          data: [0.7, 0.8, 0.5, 0.9, 0.6, 0.7, 0.8],
          color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ["Progreso de hábitos"]
    },
    weekly: {
      labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
      datasets: [
        {
          data: [0.65, 0.75, 0.8, 0.85],
          color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ["Progreso promedio semanal"]
    },
    monthly: {
      labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun"],
      datasets: [
        {
          data: [0.6, 0.65, 0.7, 0.75, 0.8, 0.85],
          color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ["Progreso promedio mensual"]
    }
  });
  
  const [pieData, setPieData] = useState([
    {
      name: "Completadas",
      population: 75,
      color: "rgba(54, 162, 235, 0.8)",
      legendFontColor: "#7F7F7F",
      legendFontSize: 15
    },
    {
      name: "Pendientes",
      population: 25,
      color: "rgba(255, 99, 132, 0.8)",
      legendFontColor: "#7F7F7F",
      legendFontSize: 15
    }
  ]);
  
  const [categoryData, setCategoryData] = useState([
    {
      name: "Trabajo",
      tasks: 12,
      color: "#FF6384",
      legendFontColor: "#7F7F7F",
      legendFontSize: 15
    },
    {
      name: "Salud",
      tasks: 8,
      color: "#36A2EB",
      legendFontColor: "#7F7F7F",
      legendFontSize: 15
    },
    {
      name: "Hogar",
      tasks: 6,
      color: "#FFCE56",
      legendFontColor: "#7F7F7F",
      legendFontSize: 15
    },
    {
      name: "Estudio",
      tasks: 4,
      color: "#4BC0C0",
      legendFontColor: "#7F7F7F",
      legendFontSize: 15
    }
  ]);
  
  // Configuración común para gráficos
  const chartConfig = {
    backgroundGradientFrom: '#1D2B5F',
    backgroundGradientTo: '#1D2B5F',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#1D2B5F"
    }
  };
  
  // Cargar datos
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simular carga de datos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aquí cargarías datos reales de AsyncStorage o una API
      // Por ahora usamos datos de ejemplo
      
      // Generar datos aleatorios para simular cambios
      setTaskStats({
        daily: {
          ...taskStats.daily,
          datasets: [{
            ...taskStats.daily.datasets[0],
            data: Array(7).fill().map(() => Math.floor(Math.random() * 8) + 1)
          }]
        },
        weekly: {
          ...taskStats.weekly,
          datasets: [{
            ...taskStats.weekly.datasets[0],
            data: Array(4).fill().map(() => Math.floor(Math.random() * 15) + 10)
          }]
        },
        monthly: {
          ...taskStats.monthly,
          datasets: [{
            ...taskStats.monthly.datasets[0],
            data: Array(6).fill().map(() => Math.floor(Math.random() * 30) + 30)
          }]
        }
      });
      
      setHabitStats({
        daily: {
          ...habitStats.daily,
          datasets: [{
            ...habitStats.daily.datasets[0],
            data: Array(7).fill().map(() => parseFloat((Math.random() * 0.5 + 0.5).toFixed(1)))
          }]
        },
        weekly: {
          ...habitStats.weekly,
          datasets: [{
            ...habitStats.weekly.datasets[0],
            data: Array(4).fill().map(() => parseFloat((Math.random() * 0.3 + 0.6).toFixed(1)))
          }]
        },
        monthly: {
          ...habitStats.monthly,
          datasets: [{
            ...habitStats.monthly.datasets[0],
            data: Array(6).fill().map(() => parseFloat((Math.random() * 0.3 + 0.6).toFixed(1)))
          }]
        }
      });
      
      // Actualizar datos de gráfico circular
      const completedPercentage = Math.floor(Math.random() * 40) + 60;
      setPieData([
        {
          ...pieData[0],
          population: completedPercentage
        },
        {
          ...pieData[1],
          population: 100 - completedPercentage
        }
      ]);
      
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      setError('No pudimos cargar tus estadísticas. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  // Cargar datos al inicio
  useEffect(() => {
    loadData();
  }, []);
  
  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  }, [loadData]);
  
  // Cambiar pestaña
  const handleTabChange = (tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };
  
  // Cambiar tipo de datos
  const handleDataTypeChange = (type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveDataType(type);
  };
  
  // Renderizar pantalla de carga
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#A3B8E8" style={{marginBottom: 20}} />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }
  
  // Obtener datos según la pestaña y tipo activos
  const getActiveData = () => {
    if (activeDataType === 'tasks') {
      return taskStats[activeTab];
    } else {
      return habitStats[activeTab];
    }
  };
  
  // Renderizar gráfico según la pestaña activa
  const renderChart = () => {
    const data = getActiveData();
    
    // Para datos diarios y semanales, usar gráfico de línea
    if (activeTab === 'daily' || activeTab === 'weekly') {
      return (
        <LineChart
          data={data}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      );
    }
    // Para datos mensuales, usar gráfico de barras
    else if (activeTab === 'monthly') {
      return (
        <BarChart
          data={data}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          verticalLabelRotation={0}
        />
      );
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Estadísticas</Text>
        <View style={{width: 40}} />
      </View>
      
      {/* Selector de tipo de datos */}
      <View style={styles.dataTypeSelector}>
        <TouchableOpacity
          style={[
            styles.dataTypeButton,
            activeDataType === 'tasks' && styles.activeDataTypeButton
          ]}
          onPress={() => handleDataTypeChange('tasks')}
        >
          <Text style={[
            styles.dataTypeButtonText,
            activeDataType === 'tasks' && styles.activeDataTypeButtonText
          ]}>Tareas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.dataTypeButton,
            activeDataType === 'habits' && styles.activeDataTypeButton
          ]}
          onPress={() => handleDataTypeChange('habits')}
        >
          <Text style={[
            styles.dataTypeButtonText,
            activeDataType === 'habits' && styles.activeDataTypeButtonText
          ]}>Hábitos</Text>
        </TouchableOpacity>
      </View>
      
      {/* Selector de período */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'daily' && styles.activeTabButton]}
          onPress={() => handleTabChange('daily')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'daily' && styles.activeTabButtonText]}>Diario</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'weekly' && styles.activeTabButton]}
          onPress={() => handleTabChange('weekly')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'weekly' && styles.activeTabButtonText]}>Semanal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'monthly' && styles.activeTabButton]}
          onPress={() => handleTabChange('monthly')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'monthly' && styles.activeTabButtonText]}>Mensual</Text>
        </TouchableOpacity>
      </View>
      
      {/* Contenido principal */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#A3B8E8']}
            tintColor="#A3B8E8"
            title="Actualizando..."
            titleColor="#A3B8E8"
          />
        }
      >
        {/* Mostrar error si existe */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity style={styles.errorButton} onPress={loadData}>
              <Text style={styles.errorButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Gráfico principal */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>
            {activeDataType === 'tasks' ? 'Tareas Completadas' : 'Progreso de Hábitos'}
            {activeTab === 'daily' ? ' (Últimos 7 días)' : 
             activeTab === 'weekly' ? ' (Últimas 4 semanas)' : ' (Últimos 6 meses)'}
          </Text>
          {renderChart()}
        </View>
        
        {/* Resumen de estadísticas */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {activeDataType === 'tasks' 
                  ? taskStats[activeTab].datasets[0].data.reduce((a, b) => a + b, 0)
                  : (habitStats[activeTab].datasets[0].data.reduce((a, b) => a + b, 0) / 
                     habitStats[activeTab].datasets[0].data.length).toFixed(2)
                }
              </Text>
              <Text style={styles.statLabel}>
                {activeDataType === 'tasks' ? 'Total' : 'Promedio'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {activeDataType === 'tasks'
                  ? Math.max(...taskStats[activeTab].datasets[0].data)
                  : Math.max(...habitStats[activeTab].datasets[0].data).toFixed(2)
                }
              </Text>
              <Text style={styles.statLabel}>Máximo</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {activeDataType === 'tasks'
                  ? Math.min(...taskStats[activeTab].datasets[0].data)
                  : Math.min(...habitStats[activeTab].datasets[0].data).toFixed(2)
                }
              </Text>
              <Text style={styles.statLabel}>Mínimo</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {activeDataType === 'tasks'
                  ? (taskStats[activeTab].datasets[0].data.reduce((a, b) => a + b, 0) / 
                     taskStats[activeTab].datasets[0].data.length).toFixed(1)
                  : ((habitStats[activeTab].datasets[0].data.reduce((a, b) => a + b, 0) / 
                      habitStats[activeTab].datasets[0].data.length) * 100).toFixed(0) + '%'
                }
              </Text>
              <Text style={styles.statLabel}>Promedio</Text>
            </View>
          </View>
        </View>
        
        {/* Gráfico circular */}
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>
            {activeDataType === 'tasks' ? 'Distribución de Tareas' : 'Progreso por Categoría'}
          </Text>
          <PieChart
            data={activeDataType === 'tasks' ? pieData : categoryData}
            width={width - 40}
            height={220}
            chartConfig={chartConfig}
            accessor={activeDataType === 'tasks' ? "population" : "tasks"}
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            absolute
          />
        </View>
        
        {/* Tendencias y análisis */}
        <View style={styles.analysisContainer}>
          <Text style={styles.sectionTitle}>Análisis</Text>
          
          <View style={styles.analysisItem}>
            <View style={styles.analysisIconContainer}>
              <Text style={styles.analysisIcon}>📈</Text>
            </View>
            <View style={styles.analysisTextContainer}>
              <Text style={styles.analysisTitle}>Tendencia</Text>
              <Text style={styles.analysisDescription}>
                {activeDataType === 'tasks'
                  ? 'Has completado un 15% más de tareas que el período anterior.'
                  : 'Tu progreso en hábitos ha mejorado un 8% respecto al período anterior.'}
              </Text>
            </View>
          </View>
          
          <View style={styles.analysisItem}>
            <View style={styles.analysisIconContainer}>
              <Text style={styles.analysisIcon}>🏆</Text>
            </View>
            <View style={styles.analysisTextContainer}>
              <Text style={styles.analysisTitle}>Mejor desempeño</Text>
              <Text style={styles.analysisDescription}>
                {activeDataType === 'tasks'
                  ? activeTab === 'daily' ? 'Viernes' : activeTab === 'weekly' ? 'Semana 4' : 'Mayo'
                  : activeTab === 'daily' ? 'Jueves' : activeTab === 'weekly' ? 'Semana 3' : 'Junio'}
              </Text>
            </View>
          </View>
          
          <View style={styles.analysisItem}>
            <View style={styles.analysisIconContainer}>
              <Text style={styles.analysisIcon}>💡</Text>
            </View>
            <View style={styles.analysisTextContainer}>
              <Text style={styles.analysisTitle}>Sugerencia</Text>
              <Text style={styles.analysisDescription}>
                {activeDataType === 'tasks'
                  ? 'Intenta distribuir mejor tus tareas durante la semana para evitar sobrecarga.'
                  : 'Mantén la consistencia en tus hábitos de salud para mejorar tu progreso general.'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Espacio al final */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030A24',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#A3B8E8',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  dataTypeSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
    padding: 5,
  },
  dataTypeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeDataTypeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dataTypeButtonText: {
    color: '#A3B8E8',
    fontSize: 16,
    fontWeight: '500',
  },
  activeDataTypeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tabSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
    padding: 5,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  tabButtonText: {
    color: '#A3B8E8',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 99, 71, 0.2)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6347',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  errorButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 10,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  chartContainer: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    color: '#A3B8E8',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 10,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#A3B8E8',
    marginBottom: 15,
    paddingLeft: 5,
  },
  statsContainer: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#A3B8E8',
  },
  analysisContainer: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analysisItem: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 15,
  },
  analysisIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  analysisIcon: {
    fontSize: 20,
  },
  analysisTextContainer: {
    flex: 1,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  analysisDescription: {
    fontSize: 14,
    color: '#A3B8E8',
    lineHeight: 20,
  },
});

export default StadisticsScreen;
