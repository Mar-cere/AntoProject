import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  Linking
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const HelpScreen = ({ navigation }) => {
  const helpSections = [
    {
      title: "Tu Compañera de Bienestar",
      icon: "brain",
      items: [
        {
          title: "¿Quién es Anto?",
          description: "Soy tu asistente de IA especializada en salud mental. Estoy aquí para escucharte, apoyarte y ayudarte a mantener tu bienestar emocional, ofreciendo un espacio seguro y sin juicios para expresarte."
        },
        {
          title: "Apoyo Emocional",
          description: "Puedes hablar conmigo sobre tus emociones, preocupaciones o cualquier cosa que necesites compartir. Te ayudo a procesar tus pensamientos y emociones de manera saludable, sin juicios ni críticas."
        },
        {
          title: "Seguimiento Personalizado",
          description: "Aprendo de nuestras conversaciones para entender mejor tus necesidades específicas. Juntos podemos trabajar en estrategias personalizadas para tu bienestar emocional."
        }
      ]
    },
    {
      title: "Manejo Emocional",
      icon: "emotion",
      items: [
        {
          title: "Regulación Emocional",
          description: "Te ayudo con técnicas específicas como el método RAIN (Reconocer, Aceptar, Investigar, No-identificación) para manejar emociones intensas, y la técnica 5-4-3-2-1 para momentos de ansiedad."
        },
        {
          title: "Reestructuración de Pensamientos",
          description: "Trabajamos juntos para identificar patrones de pensamiento negativos y transformarlos en perspectivas más balanceadas y saludables usando técnicas cognitivas."
        },
        {
          title: "Validación Emocional",
          description: "Aprende a reconocer y validar tus emociones sin juzgarlas, desarrollando una relación más compasiva contigo mismo/a."
        }
      ]
    },
    {
      title: "Apoyo en Crisis",
      icon: "lifebuoy",
      items: [
        {
          title: "Ayuda Inmediata",
          description: "En momentos de crisis, te guiaré a través de técnicas de estabilización emocional y te conectaré con recursos de emergencia si es necesario. Recuerda: no estás solo/a."
        },
        {
          title: "Plan de Seguridad",
          description: "Te ayudo a crear un plan personalizado para momentos difíciles, identificando señales de alerta, estrategias de afrontamiento y contactos de emergencia."
        },
        {
          title: "Recursos Profesionales",
          description: "Aunque puedo apoyarte, no reemplazo la ayuda profesional. Te proporcionaré información sobre líneas de crisis 24/7 y recursos de salud mental cuando sea necesario."
        }
      ]
    },
    {
      title: "Herramientas Avanzadas",
      icon: "tools",
      items: [
        {
          title: "Diálogo Interior",
          description: "Aprende técnicas específicas para transformar tu diálogo interno negativo en uno más compasivo y constructivo, utilizando afirmaciones y reencuadre cognitivo."
        },
        {
          title: "Gestión del Estrés",
          description: "Estrategias prácticas como la técnica STOP (Stop, Toma distancia, Observa, Procede) y el método 4-7-8 para momentos de tensión."
        },
        {
          title: "Recursos Complementarios",
          description: "Accede a herramientas adicionales como registro de estados de ánimo, planificador de actividades y recordatorios de autocuidado para apoyar tu bienestar."
        }
      ]
    }
  ];

  const handleContactSupport = () => {
    Linking.openURL('mailto:soporte@tuapp.com');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../images/back.png')}
        style={styles.background}
        imageStyle={styles.imageStyle}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ayuda</Text>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.navigate('FaQ')}
          >
            <MaterialCommunityIcons name="frequently-asked-questions" size={24} color="#1ADDDB" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Sección de Bienvenida con Anto */}
          <View style={styles.welcomeSection}>
            <View style={styles.antoAvatar}>
              <MaterialCommunityIcons name="brain" size={48} color="#1ADDDB" />
            </View>
            <Text style={styles.welcomeTitle}>¡Hola! Soy Anto</Text>
            <Text style={styles.welcomeText}>
              Estoy aquí para acompañarte en tu viaje de bienestar emocional. 
              Puedo ayudarte con técnicas específicas de manejo emocional y 
              brindarte apoyo en momentos difíciles. Recuerda que siempre 
              hay ayuda disponible y no estás solo/a en este camino.
            </Text>
            <TouchableOpacity 
              style={styles.chatButton}
              onPress={() => navigation.navigate('Chat')}
            >
              <MaterialCommunityIcons name="message-processing" size={24} color="#030A24" />
              <Text style={styles.chatButtonText}>Hablar con Anto</Text>
            </TouchableOpacity>
          </View>

          {helpSections.map((section, index) => (
            <View key={index} style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name={section.icon} size={24} color="#1ADDDB" />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.helpItem}>
                  <Text style={styles.helpItemTitle}>{item.title}</Text>
                  <Text style={styles.helpItemDescription}>{item.description}</Text>
                </View>
              ))}
            </View>
          ))}

          <View style={styles.supportSection}>
            <Text style={styles.supportTitle}>¿Necesitas más ayuda?</Text>
            <TouchableOpacity 
              style={styles.supportButton}
              onPress={handleContactSupport}
            >
              <MaterialCommunityIcons name="email" size={24} color="#1ADDDB" />
              <Text style={styles.supportButtonText}>Contactar Soporte</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(3, 10, 36, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 219, 0.1)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  helpItem: {
    marginBottom: 16,
    paddingLeft: 36,
  },
  helpItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1ADDDB',
    marginBottom: 4,
  },
  helpItemDescription: {
    fontSize: 14,
    color: '#A3B8E8',
    lineHeight: 20,
  },
  supportSection: {
    alignItems: 'center',
    padding: 24,
    marginTop: 8,
  },
  supportTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.3)',
    flex: 1,
  },
  supportButtonText: {
    color: '#1ADDDB',
    fontSize: 16,
    marginLeft: 8,
  },
  welcomeSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  antoAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#1ADDDB',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#A3B8E8',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1ADDDB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  chatButtonText: {
    color: '#030A24',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default HelpScreen;
