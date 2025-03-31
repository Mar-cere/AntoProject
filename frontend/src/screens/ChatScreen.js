import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  Animated,
  Keyboard,
  ActivityIndicator,
  StatusBar,
  Dimensions
} from 'react-native';
import NetInfo from "@react-native-community/netinfo";
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { generateAIResponse } from '../services/openaiService';
import { initializeSocket, sendMessage, onMessage, onTyping, onError, closeSocket } from '../services/chatService';
import ParticleBackground from '../components/ParticleBackground';

const { width } = Dimensions.get('window');

const ChatScreen = () => {
  // Estados
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState(null);
  
  // Referencias
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeout = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Navegación
  const navigation = useNavigation();
  
  // Efecto para cargar mensajes al inicio
  useEffect(() => {
    loadMessages();
    
    // Animación de entrada
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, []);
  
  // Efecto para monitorear la conexión a internet
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Efecto para inicializar WebSocket
  useEffect(() => {
    // Inicializar socket al montar el componente
    const initSocket = async () => {
      try {
        await initializeSocket();
      } catch (err) {
        console.error('Error al conectar socket:', err);
        setError('Error de conexión');
      }
    };
    
    initSocket();
    
    // Registrar callbacks
    const messageUnsubscribe = onMessage((message) => {
      setMessages(prev => [...prev, message]);
    });
    
    const typingUnsubscribe = onTyping((typing) => {
      setIsTyping(typing);
    });
    
    const errorUnsubscribe = onError((err) => {
      setError(err.message);
    });
    
    // Limpiar al desmontar
    return () => {
      messageUnsubscribe();
      typingUnsubscribe();
      errorUnsubscribe();
      closeSocket();
    };
  }, []);
  
  // Cargar mensajes desde AsyncStorage
  const loadMessages = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem('chatMessages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        // Mensaje de bienvenida si no hay mensajes previos
        const welcomeMessage = {
          id: '1',
          text: '¡Hola! Soy Anto, tu asistente personal. ¿En qué puedo ayudarte hoy?',
          sender: 'bot',
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
        await AsyncStorage.setItem('chatMessages', JSON.stringify([welcomeMessage]));
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Guardar mensajes en AsyncStorage
  const saveMessages = useCallback(async (newMessages) => {
    try {
      await AsyncStorage.setItem('chatMessages', JSON.stringify(newMessages));
    } catch (error) {
      console.error('Error al guardar mensajes:', error);
    }
  }, []);
  
  // Enviar mensaje
  const handleSend = async () => {
    if (inputText.trim() === '') return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics error:', error);
    }
    
    // Crear mensaje del usuario
    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    // Limpiar input antes de procesar para mejor UX
    const messageToSend = inputText;
    setInputText('');
    
    // Actualizar estado con el mensaje del usuario
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Mostrar indicador de escritura
    setIsTyping(true);
    
    try {
      // Generar respuesta de la IA
      const aiResponse = await generateAIResponse(updatedMessages);
      
      // Crear mensaje de respuesta
      const responseMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse.text || "Entiendo. ¿Hay algo más en lo que pueda ayudarte?",
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      // Actualizar mensajes con la respuesta
      const messagesWithResponse = [...updatedMessages, responseMessage];
      setMessages(messagesWithResponse);
      
      // Guardar mensajes
      saveMessages(messagesWithResponse);
    } catch (error) {
      console.error('Error al generar respuesta:', error);
      
      // Mensaje de error
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: isOnline 
          ? 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, intenta de nuevo.'
          : 'Lo siento, no puedo conectarme en este momento. Por favor, verifica tu conexión a internet e intenta de nuevo.',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setMessages([...updatedMessages, errorMessage]);
      saveMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };
  
  // Renderizar cada mensaje
  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    const isAssistant = item.sender === 'assistant' || item.sender === 'bot';
    const hasError = item.isError;
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.botMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble,
          hasError && styles.errorBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.botMessageText,
            hasError && styles.errorText
          ]}>
            {item.text}
          </Text>
          
          {hasError && (
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => retryMessage(item)}
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };
  
  // Renderizar indicador de escritura
  const renderTypingIndicator = () => {
    if (!isTyping) return null;
    
    return (
      <View style={styles.typingContainer}>
        <View style={styles.avatarContainer}>
          <Image 
            source={require('../images/Anto.png')} 
            style={styles.avatar} 
          />
        </View>
        <View style={styles.typingBubble}>
          <View style={styles.typingIndicator}>
            <Animated.View style={[styles.typingDot, useTypingAnimation(0)]} />
            <Animated.View style={[styles.typingDot, {marginLeft: 4}, useTypingAnimation(150)]} />
            <Animated.View style={[styles.typingDot, {marginLeft: 4}, useTypingAnimation(300)]} />
          </View>
        </View>
      </View>
    );
  };
  
  // Función para animar los puntos del indicador de escritura
  const useTypingAnimation = (delay = 0) => {
    const animation = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: 500,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          })
        ])
      ).start();
      
      return () => animation.stopAnimation();
    }, []);
    
    return {
      opacity: animation,
      transform: [
        {
          translateY: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -4],
          }),
        },
      ],
    };
  };
  
  // Función para manejar el evento de desplazamiento
  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    
    // Si estamos a más de 100px del final, mostrar el botón
    const isCloseToBottom = contentHeight - offsetY - scrollViewHeight < 100;
    setShowScrollButton(!isCloseToBottom);
  };
  
  // Función para desplazarse al final de la lista
  const scrollToBottom = (animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated });
    }
  };
  
  // Función para borrar la conversación
  const clearConversation = async () => {
    try {
      // Mensaje de bienvenida
      const welcomeMessage = {
        id: '1',
        text: '¡Hola! Soy Anto, tu asistente personal. ¿En qué puedo ayudarte hoy?',
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };
      
      // Actualizar estado
      setMessages([welcomeMessage]);
      await AsyncStorage.setItem('chatMessages', JSON.stringify([welcomeMessage]));
      
      // Cerrar modal
      setShowClearModal(false);
      
      // Feedback táctil
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.log('Haptics error:', error);
      }
    } catch (error) {
      console.error('Error al borrar la conversación:', error);
    }
  };
  
  // Función para reintentar un mensaje fallido
  const retryMessage = (failedMessage) => {
    // Encontrar el mensaje del usuario que causó el error
    const userMessageIndex = messages.findIndex(
      msg => msg.sender === 'user' && 
      new Date(msg.timestamp) < new Date(failedMessage.timestamp) &&
      messages.indexOf(msg) === messages.lastIndexOf(msg)
    );
    
    if (userMessageIndex >= 0) {
      const userMessage = messages[userMessageIndex];
      
      // Eliminar el mensaje de error
      const updatedMessages = messages.filter(msg => msg.id !== failedMessage.id);
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
      
      // Reintentar con el mensaje del usuario
      setRetryCount(retryCount + 1);
      setInputText(userMessage.text);
      setTimeout(() => handleSend(), 100);
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Imagen de fondo */}
      <Image 
        source={require('../images/back.png')} 
        style={styles.backgroundImage} 
        resizeMode="cover"
      />
      <ParticleBackground />
      
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1ADDDB" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Image 
            source={require('../images/Anto.png')} 
            style={styles.headerAvatar} 
          />
          <Text style={styles.headerTitle}>Anto</Text>
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowClearModal(true)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      {/* Lista de mensajes */}
      <Animated.View 
        style={[styles.chatContainer, { opacity: fadeAnim }]}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1ADDDB" />
            <Text style={styles.loadingText}>Cargando conversación...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => scrollToBottom(false)}
            onLayout={() => scrollToBottom(false)}
            ListFooterComponent={renderTypingIndicator}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            ListFooterComponentStyle={styles.listFooter}
          />
        )}
      </Animated.View>
      
      {/* Área de entrada de texto */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={styles.inputContainer}
      >
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#A3B8E8"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            inputText.trim() === '' ? styles.sendButtonDisabled : {}
          ]}
          onPress={handleSend}
          disabled={inputText.trim() === ''}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={inputText.trim() === '' ? '#A3B8E8' : '#1ADDDB'} 
          />
        </TouchableOpacity>
      </KeyboardAvoidingView>
      
      {/* Botón para desplazarse al final */}
      {showScrollButton && (
        <TouchableOpacity 
          style={styles.scrollToBottomButton}
          onPress={() => scrollToBottom()}
        >
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      
      {/* Modal de confirmación */}
      {showClearModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Borrar conversación</Text>
            <Text style={styles.modalText}>¿Estás seguro de que quieres borrar toda la conversación? Esta acción no se puede deshacer.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowClearModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={clearConversation}
              >
                <Text style={[styles.modalButtonText, styles.modalConfirmButtonText]}>Borrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030A24',
    paddingTop: Platform.OS === 'ios' ? 40 : 0,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.1, // Opacidad baja para no interferir con el contenido
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 30 : 40,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(8, 16, 40, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 218, 0.3)',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  menuButton: {
    padding: 10,
  },
  chatContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#A3B8E8',
    marginTop: 16,
    fontSize: 16,
  },
  messagesList: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '100%',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },

  messageBubble: {
    borderRadius: 18,
  },

  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 10,
    maxWidth: '90%',
  },
  userBubble: {
    backgroundColor: '#1ADDDB',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#1D2B5F',
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    backgroundColor: 'rgba(255, 100, 100, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.5)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#030A24',
    fontWeight: '500',
  },
  botMessageText: {
    color: '#FFFFFF',
  },
  errorText: {
    color: '#FFCCCC',
  },
  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(26, 221, 219, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1ADDDB',
  },
  retryButtonText: {
    color: '#1ADDDB',
    fontSize: 12,
    fontWeight: 'bold',
  },
  typingContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typingBubble: {
    backgroundColor: '#1D2B5F',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '75%',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A3B8E8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(6, 12, 40, 0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 221, 219, 0.3)',
    marginBottom:28,
  },
  input: {
    flex: 1,
    backgroundColor: '#0F1A42',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 221, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 221, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1ADDDB',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 10, 36, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: width * 0.8,
    backgroundColor: '#1D2B5F',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalText: {
    color: '#A3B8E8',
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  modalCancelButton: {
    backgroundColor: 'rgba(163, 184, 232, 0.2)',
  },
  modalConfirmButton: {
    backgroundColor: 'rgba(255, 100, 100, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 100, 0.5)',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalConfirmButtonText: {
    color: '#FF6464',
  },
  listFooter: {
    paddingBottom: 16,
  },
});

export default ChatScreen;