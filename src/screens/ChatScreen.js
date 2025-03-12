import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import NetInfo from "@react-native-community/netinfo";
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { generateAIResponse, formatMessagesForOpenAI } from '../services/openaiService.js';

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
  const saveMessages = async (newMessages) => {
    try {
      await AsyncStorage.setItem('chatMessages', JSON.stringify(newMessages));
    } catch (error) {
      console.error('Error al guardar mensajes:', error);
    }
  };
  
  // Enviar mensaje
  const sendMessage = async () => {
    if (inputText.trim() === '') return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log('Haptics error:', error);
    }
    
    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setInputText('');
    
    // Mostrar indicador de escritura
    setIsTyping(true);
    
    try {
      // Formatear mensajes para OpenAI
      const formattedMessages = formatMessagesForOpenAI(updatedMessages);
      
      // Generar respuesta con OpenAI
      const aiResponse = await generateAIResponse(formattedMessages);
      
      // Crear mensaje de respuesta
      const botResponse = {
        id: (Date.now() + 1).toString(),
        text: aiResponse.text,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        error: aiResponse.error
      };
      
      // Actualizar mensajes con la respuesta
      const messagesWithResponse = [...updatedMessages, botResponse];
      setMessages(messagesWithResponse);
      saveMessages(messagesWithResponse);
    } catch (error) {
      console.error('Error al generar respuesta:', error);
      
      // Mensaje de error en caso de fallo
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        text: 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
        error: true
      };
      
      const messagesWithError = [...updatedMessages, errorResponse];
      setMessages(messagesWithError);
      saveMessages(messagesWithError);
    } finally {
      setIsTyping(false);
    }
  };
  
  // Renderizar cada mensaje
  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    const hasError = item.error;
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.botMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userMessageBubble : styles.botMessageBubble,
          hasError ? styles.errorMessageBubble : {}
        ]}>
          {isUser ? (
            <Text style={[
              styles.messageText,
              styles.userMessageText
            ]}>
              {item.text}
            </Text>
          ) : (
            <Markdown
              style={{
                body: {
                  color: '#FFFFFF',
                  fontSize: 16,
                  lineHeight: 22,
                },
                heading1: {
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontSize: 20,
                  marginTop: 10,
                  marginBottom: 5,
                },
                heading2: {
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  fontSize: 18,
                  marginTop: 8,
                  marginBottom: 4,
                },
                link: {
                  color: '#1ADDDB',
                  textDecorationLine: 'underline',
                },
                list: {
                  color: '#FFFFFF',
                },
                listItem: {
                  color: '#FFFFFF',
                },
                strong: {
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                },
                em: {
                  color: '#FFFFFF',
                  fontStyle: 'italic',
                },
              }}
            >
              {item.text}
            </Markdown>
          )}
          
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
  
  // Añade esta propiedad al FlatList
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
      sendMessage();
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
      
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Encabezado */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require('../images/back.png')} 
            style={styles.backIcon} 
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
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
          onPress={sendMessage}
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
          <Image 
            source={require('../images/gear.png')} 
            style={styles.scrollToBottomIcon} 
          />
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
    paddingHorizontal: 10,
    paddingVertical:6,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(26, 221, 219, 0.3)',
    borderRadius:2,
  },
  backButton: {
    padding: 10,
  },
  backIcon: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 18,
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
    marginTop: 20,
    fontSize: 14,
  },
  messagesList: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageContainer: {
    marginBottom: 10,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  botMessageContainer: {
    alignSelf: 'flex-start',
    marginRight: 'auto',
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  userMessageBubble: {
    backgroundColor: 'rgba(26, 221, 219, 0.3)', // Color más intenso para el usuario
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.5)', // Borde más visible
    shadowColor: "#1ADDDB",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  botMessageBubble: {
    backgroundColor: 'rgba(29, 43, 95, 0.7)', // Color más oscuro para el bot
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(163, 184, 232, 0.5)', // Borde más visible
    shadowColor: "#A3B8E8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 2,
    lineHeight: 22, // Mejor espaciado entre líneas
  },
  userMessageText: {
    color: '#FFFFFF',
    fontWeight: '500', // Ligeramente más negrita
  },
  botMessageText: {
    color: '#FFFFFF',
  },
  typingContainer: {
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    backgroundColor: 'rgba(29, 43, 95, 0.7)',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(163, 184, 232, 0.5)',
    shadowColor: "#A3B8E8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
    maxWidth: '80%',
  },
  typingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typingText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 10,
    fontStyle: 'italic',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1ADDDB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 221, 219, 0.3)',
    marginBottom:30,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(29, 43, 95, 0.7)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 16,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  sendButton: {
    padding: 8,
    marginLeft: 5,
    backgroundColor: 'rgba(26, 221, 219, 0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.5)',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
    borderColor: 'rgba(163, 184, 232, 0.3)',
  },
  listFooter: {
    paddingBottom: 15,
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 15,
    bottom: 90,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 221, 219, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.5)',
    shadowColor: "#1ADDDB",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  scrollToBottomIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#1D2B5F',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    color: '#A3B8E8',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 10,
  },
  modalCancelButton: {
    backgroundColor: 'rgba(163, 184, 232, 0.2)',
  },
  modalConfirmButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.5)',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  modalConfirmButtonText: {
    color: '#FF3B30',
  },
  errorMessageBubble: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    borderColor: 'rgba(255, 59, 48, 0.5)',
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ChatScreen;