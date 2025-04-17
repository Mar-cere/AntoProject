import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
  StatusBar,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ParticleBackground from '../components/ParticleBackground';
import chatService from '../services/chatService';

const { width } = Dimensions.get('window');

const ChatScreen = () => {
  // Estados
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [error, setError] = useState(null);
  
  // Referencias
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Navegación
  const navigation = useNavigation();
  
  // Inicializar chat
  const initializeConversation = async () => {
    try {
      setIsLoading(true);
      
      await chatService.initializeSocket();
      const conversationId = await AsyncStorage.getItem('currentConversationId');
      
      if (conversationId) {
        const serverMessages = await chatService.getMessages(conversationId);
        if (serverMessages && serverMessages.length > 0) {
          setMessages(serverMessages);
          return;
        }
      }

      // Si no hay mensajes, crear mensaje de bienvenida
      const welcomeMessage = {
        id: `welcome-${Date.now()}`,
        content: '¡Hola! Soy Anto, tu asistente personal. ¿En qué puedo ayudarte hoy?',
        role: 'assistant',
        type: 'text',
        metadata: {
          timestamp: new Date().toISOString(),
          type: 'welcome'
        }
      };
      
      setMessages([welcomeMessage]);
      await chatService.saveMessages([welcomeMessage]);
      
    } catch (error) {
      console.error('Error al inicializar chat:', error);
      setError('Error al cargar el chat');
    } finally {
      setIsLoading(false);
    }
  };

  // Efecto inicial
  useEffect(() => {
    initializeConversation();
    
    // Animación de entrada
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Configurar callbacks para mensajes y errores
    const messageUnsubscribe = chatService.onMessage((message) => {
      setMessages(prevMessages => {
        const newMessages = [...prevMessages, message];
        chatService.saveMessages(newMessages);
        return newMessages;
      });
    });

    const errorUnsubscribe = chatService.onError((error) => {
      console.error('Error en el chat:', error);
      setError('Error en la comunicación');
    });

    return () => {
      messageUnsubscribe();
      errorUnsubscribe();
      chatService.closeSocket();
    };
  }, []);

  // Manejar envío de mensajes
  const handleSend = async () => {
    if (inputText.trim() === '') return;

    const messageText = inputText.trim();
    setInputText('');

    // Mensaje temporal
    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      content: messageText,
      role: 'user',
      type: 'text',
      metadata: {
        timestamp: new Date().toISOString(),
        pending: true
      }
    };

    try {
      setMessages(prev => [...prev, tempUserMessage]);
      
      const success = await chatService.sendMessage(messageText);
      
      if (!success) {
        throw new Error('Error al enviar el mensaje');
      }

    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      
      const errorMessage = {
        id: `error-${Date.now()}`,
        content: 'Error al enviar el mensaje. Por favor, intenta de nuevo.',
        role: 'assistant',
        type: 'error',
        metadata: {
          timestamp: new Date().toISOString(),
          error: true
        }
      };

      setMessages(prev => [...prev, errorMessage]);
      await chatService.saveMessages([...messages, errorMessage]);
    }
  };

  // Limpiar conversación
  const clearConversation = async () => {
    try {
      await chatService.clearMessages();
      await initializeConversation();
      setShowClearModal(false);
      
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.log('Haptics error:', error);
      }
    } catch (error) {
      console.error('Error al borrar la conversación:', error);
      setError('Error al borrar la conversación');
    }
  };

  // Renderizar mensaje
  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.botMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.botMessageText
          ]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  // Manejar scroll
  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    
    setShowScrollButton(contentHeight - offsetY - scrollViewHeight > 100);
  };

  // Scroll al final
  const scrollToBottom = (animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated });
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('../images/back.png')} 
        style={styles.backgroundImage} 
        resizeMode="cover"
      />
      <ParticleBackground />
      
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Header */}
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
      
      {/* Chat Container */}
      <Animated.View style={[styles.chatContainer, { opacity: fadeAnim }]}>
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
            keyExtractor={(item) => item.id || item._id || `${item.role}-${item.metadata.timestamp}`}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => scrollToBottom(false)}
            onLayout={() => scrollToBottom(false)}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          />
        )}
      </Animated.View>
      
      {/* Input Container */}
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
      
      {/* Scroll To Bottom Button */}
      {showScrollButton && (
        <TouchableOpacity 
          style={styles.scrollToBottomButton}
          onPress={() => scrollToBottom()}
        >
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      
      {/* Clear Chat Modal */}
      {showClearModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Borrar conversación</Text>
            <Text style={styles.modalText}>
              ¿Estás seguro de que quieres borrar toda la conversación? Esta acción no se puede deshacer.
            </Text>
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
                <Text style={[styles.modalButtonText, styles.modalConfirmButtonText]}>
                  Borrar
                </Text>
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
    opacity: 0.1,
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#1ADDDB',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#1D2B5F',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#030A24',
  },
  botMessageText: {
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(6, 12, 40, 0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(26, 221, 219, 0.3)',
    marginBottom: 28,
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
});

export default ChatScreen;