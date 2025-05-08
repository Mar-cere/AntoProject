import React, { useState } from 'react';
import { 
  View, 
  Text, ImageBackground,
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Animated, 
  StatusBar,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ParticleBackground from '../components/ParticleBackground';
import faqData from '../data/FaQScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Habilitar LayoutAnimation para Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Componente para cada pregunta y respuesta con animación mejorada
const FaqItem = ({ question, answer }) => {
  const [expanded, setExpanded] = useState(false);
  
  const toggleExpand = () => {
    // Configurar la animación de layout
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };
  
  return (
    <View style={styles.faqItemContainer}>
      <TouchableOpacity 
        style={styles.faqItemHeader} 
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <Text style={styles.question}>{question}</Text>
        <Ionicons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#1ADDDB" 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.faqItemBody}>
          <Text style={styles.answer}>{answer}</Text>
        </View>
      )}
    </View>
  );
};
const FaQScreen = () => {
    const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030A24" />
      <ImageBackground
        source={require('../images/back.png')}
        style={styles.background}
        imageStyle={styles.imageStyle}
      >
      <ParticleBackground />
      
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1ADDDB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preguntas Frecuentes</Text>
      </View>
      
      {/* Contenido principal */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Imagen decorativa */}
        <View style={styles.imageContainer}>
          <Image 
            source={require('../images/Anto.png')} 
            style={styles.antoImage}
            resizeMode="contain"
          />
        </View>
        
        {/* Texto introductorio */}
        <Text style={styles.introText}>
          Aquí encontrarás respuestas a las preguntas más comunes sobre cómo usar la aplicación y aprovechar todas sus funciones.
        </Text>
        
        {/* Secciones de preguntas frecuentes */}
        {faqData.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.category}</Text>
            
            {section.items.map((item, itemIndex) => (
              <FaqItem 
                key={itemIndex}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </View>
        ))}
        
        {/* Sección de contacto */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>¿No encontraste lo que buscabas?</Text>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => navigation.navigate('Chat')}
          >
            <Text style={styles.contactButtonText}>Hablar con Anto</Text>
          </TouchableOpacity>
        </View>
        
        {/* Espacio adicional al final */}
        <View style={styles.bottomSpace} />
      </ScrollView>
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
    width: '100%',
  },
  imageStyle: {
    opacity: 0.1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#1D2B5F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 219, 0.3)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  antoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1ADDDB',
  },
  introText: {
    color: '#A3B8E8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#1ADDDB',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 219, 0.3)',
    paddingBottom: 8,
  },
  faqItemContainer: {
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.2)',
  },
  faqItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  question: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    paddingRight: 8,
  },
  faqItemBody: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
  },
  answer: {
    color: '#A3B8E8',
    fontSize: 14,
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  contactTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  contactButton: {
    backgroundColor: '#1ADDDB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  contactButtonText: {
    color: '#030A24',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpace: {
    height: 100, // Espacio para la barra de navegación
  },
});

export default FaQScreen;
