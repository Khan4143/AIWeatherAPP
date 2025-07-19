import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import adjust from '../utils/adjust';
import { useWeatherContext } from '../contexts/WeatherContext';
import { UserData } from '../Screens/UserInfo';
import { generateResponse } from '../services/openaiService';
import AntDesign from 'react-native-vector-icons/AntDesign';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'skylar';
  timestamp: Date;
  loading?: boolean;
}

const predefinedQuestions = [
  { id: '1', text: "Check today's weather" },
  { id: '2', text: 'Will it rain today?' },
  { id: '3', text: 'Will it rain during my lunch break at 1 PM?' },
  { id: '4', text: 'Check evening forecast' },
  { id: '5', text: "What's the weather like this evening?" },
  { id: '6', text: 'Weather for my commute?' },
  { id: '7', text: 'Do I need an umbrella today?' },
];

const CommuteScreen = () => {
  const { currentWeather, forecast, preferredUnits } = useWeatherContext();
  const userLocation = UserData.location || 'your location';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm Skylar, your weather companion. How can I help you plan your day? ☀️",
      sender: 'skylar',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setShowKeyboard(true);
      scrollToBottom();
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setShowKeyboard(false);
    });
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    scrollToBottom();

    // Add loading message
    const loadingMessage: Message = {
      id: 'loading',
      text: '',
      sender: 'skylar',
      timestamp: new Date(),
      loading: true,
    };

    setMessages(prev => [...prev, loadingMessage]);
    setIsLoading(true);

    try {
      if (!currentWeather) {
        throw new Error('Weather data is not available');
      }

      // Generate response using OpenAI API
      const response = await generateResponse(userMessage.text, currentWeather);

      // Remove loading message and add response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'loading');
        return [
          ...filtered,
          {
            id: Date.now().toString(),
            text: response.text,
            sender: 'skylar',
            timestamp: new Date(),
          },
        ];
      });
    } catch (error) {
      console.error('Error generating response:', error);
      showToast('Failed to get response. Please try again.');
      
      // Remove loading message
      setMessages(prev => prev.filter(msg => msg.id !== 'loading'));
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleQuestionSelect = (question: string) => {
    setInputText(question);
    // Automatically send the message after a short delay
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const renderMessageContent = (message: Message) => {
    if (message.loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={message.sender === 'user' ? '#fff' : '#4361EE'} />
          <Text style={[styles.loadingText, message.sender === 'user' ? styles.userMessageText : styles.skylarMessageText]}>
            Thinking...
          </Text>
        </View>
      );
    }
    return (
      <Text style={[styles.messageText, message.sender === 'user' ? styles.userMessageText : styles.skylarMessageText]}>
        {message.text}
      </Text>
    );
  };

  return (
    <>
      {/* <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} /> */}
      <LinearGradient colors={['#b3d4ff', '#4361EE']} style={styles.background} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <View style={styles.safeArea}>
          <LinearGradient 
            colors={['#4361EE', '#3254d1']} 
            style={styles.headerContainer}
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.header}>
              <View style={styles.avatarContainer}>
                <MaterialCommunityIcons name="robot" size={adjust(18)} color="#fff" />
              </View>
              <Text style={styles.headerTitle}>Chat with Skylar</Text>
            </View>
            <View style={styles.headerDivider} />
          </LinearGradient>

          <ScrollView ref={scrollViewRef} style={styles.chatContainer} contentContainerStyle={styles.chatContent} showsVerticalScrollIndicator={false}>
            {messages.map((message) => (
              <View
                key={`message-${message.id}`}
                style={[
                  styles.messageBubble,
                  message.sender === 'user' ? styles.userMessage : styles.skylarMessage,
                ]}
              >
                {message.sender === 'skylar' && (
                  <View style={styles.messageBubbleAvatar}>
                    <MaterialCommunityIcons name="robot" size={adjust(16)} color="#fff" />
                  </View>
                )}
                <View
                  style={[
                    styles.messageContent,
                    message.sender === 'user' ? styles.userMessageContent : styles.skylarMessageContent,
                  ]}
                >
                  {renderMessageContent(message)}
                </View>
                {message.sender === 'user' && (
                  <View style={styles.userMessageBubbleAvatar}>
                    <FontAwesome name="user" size={adjust(14)} color="#fff" />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {!showKeyboard && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.questionsOuterContainer}
              contentContainerStyle={styles.questionsScrollContent}
            >
              {predefinedQuestions.map((question, index) => (
                <TouchableOpacity
                  key={`question-${question.id}`}
                  style={[
                    styles.questionButton,
                    index % 2 === 0 ? styles.questionButtonYellow : styles.questionButtonBlue,
                  ]}
                  onPress={() => handleQuestionSelect(question.text)}
                >
                  <Text
                    style={[
                      styles.questionText,
                      index % 2 === 0 ? styles.questionTextYellow : styles.questionTextBlue,
                    ]}
                    numberOfLines={1}
                  >
                    {question.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={adjust(10)}
            style={styles.inputContainer}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Ask me about today's plans..."
                placeholderTextColor="#999"
                value={inputText}
                onChangeText={setInputText}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage} disabled={isLoading}>
                <AntDesign name="arrowup" size={adjust(18)} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>

          {toastVisible && (
            <Animated.View style={[styles.toast, { opacity: fadeAnim }]}>
              <MaterialIcons name="error-outline" size={adjust(16)} color="#fff" />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </Animated.View>
          )}
        </View>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: adjust(12),
    paddingVertical: adjust(8),
  },
  headerTitle: {
    flex: 1,
    fontSize: adjust(14),
    fontWeight: '600',
    color: '#fff',
    marginLeft: adjust(6),
  },
  avatarContainer: {
    width: adjust(32),
    height: adjust(32),
    borderRadius: adjust(16),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1.5,
    elevation: 1.5,
  },
  settingsButton: {
    width: adjust(32), // Reduced from 36
    height: adjust(32), // Reduced from 36
    borderRadius: adjust(16), // Reduced from 18
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: adjust(12), // Reduced from 14
    paddingBottom: adjust(120), // Reduced from 140
    paddingTop: adjust(6), // Reduced from 8
  },
  messageBubble: {
    marginBottom: adjust(12), // Reduced from 14
    maxWidth: '80%',
    flexDirection: 'row',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  skylarMessage: {
    alignSelf: 'flex-start',
    marginLeft: adjust(4), // Reduced from 5
  },
  messageBubbleAvatar: {
    width: adjust(24), // Reduced from 28
    height: adjust(24), // Reduced from 28
    borderRadius: adjust(12), // Reduced from 14
    backgroundColor: '#4361EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: adjust(5), // Reduced from 6
    alignSelf: 'flex-start',
  },
  userMessageBubbleAvatar: {
    width: adjust(24),
    height: adjust(24),
    borderRadius: adjust(12),
    backgroundColor: '#4361EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: adjust(5),
    alignSelf: 'flex-start',
  },
  messageContent: {
    borderRadius: adjust(16), // Reduced from 18
    paddingHorizontal: adjust(12), // Reduced from 14
    paddingVertical: adjust(8), // Reduced from 10
  },
  userMessageContent: {
    backgroundColor: '#4361EE', // Blue for user
  },
  skylarMessageContent: {
    backgroundColor: '#fff', // White for skylar
  },
  messageText: {
    fontSize: adjust(11), // Reduced from 12
    lineHeight: adjust(13), // Reduced from 14
  },
  userMessageText: {
    color: '#fff',
  },
  skylarMessageText: {
    color: '#333',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: adjust(6), // Reduced from 8
    paddingHorizontal: adjust(12), // Reduced from 14
    height: adjust(48), // Reduced from 54
    justifyContent: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: adjust(18), // Reduced from 22
    paddingLeft: adjust(12), // Reduced from 14
    paddingRight: adjust(3), // Reduced from 4
    height: adjust(32), // Reduced from 36
  },
  input: {
    flex: 1,
    paddingVertical: adjust(5), // Reduced from 6
    fontSize: adjust(12), // Reduced from 13
    color: '#777',
  },
  sendButton: {
    width: adjust(24), // Reduced from 28
    height: adjust(24), // Reduced from 28
    borderRadius: adjust(12), // Reduced from 14
    backgroundColor: '#4361EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: adjust(3), // Reduced from 4
  },
  questionsOuterContainer: {
    position: 'absolute',
    bottom: adjust(54), // Reduced from 60
    left: 0,
    right: 0,
    maxHeight: adjust(44), // Reduced from 50
  },
  questionsScrollContent: {
    paddingHorizontal: adjust(12), // Reduced from 14
    paddingVertical: adjust(4), // Reduced from 5
  },
  questionButton: {
    borderRadius: adjust(16), // Reduced from 20
    paddingHorizontal: adjust(14), // Reduced from 16
    paddingVertical: adjust(6), // Reduced from 8
    marginRight: adjust(8), // Reduced from 10
    justifyContent: 'center',
    minHeight: adjust(30), // Reduced from 36
  },
  questionButtonBlue: {
    backgroundColor: '#4361EE',
  },
  questionButtonYellow: {
    backgroundColor: '#FFD859',
  },
  questionText: {
    fontSize: adjust(11), // Reduced from 12
    fontWeight: '500',
    flexShrink: 1,
    lineHeight: adjust(16), // Reduced from 18
  },
  questionTextBlue: {
    color: '#fff',
  },
  questionTextYellow: {
    color: '#333',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: adjust(18), // Reduced from 20
    minWidth: adjust(70), // Reduced from 80
    paddingHorizontal: adjust(4), // Reduced from 5
    paddingVertical: adjust(2), // Reduced from 3
  },
  loadingText: {
    marginLeft: adjust(6), // Reduced from 8
    fontSize: adjust(11), // Reduced from 12
    fontStyle: 'italic',
  },
  toast: {
    position: 'absolute',
    bottom: adjust(60), // Reduced from 70
    left: adjust(16), // Reduced from 20
    right: adjust(16), // Reduced from 20
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: adjust(8), // Reduced from 10
    paddingHorizontal: adjust(14), // Reduced from 16
    borderRadius: adjust(6), // Reduced from 8
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced from 2
    shadowOpacity: 0.2, // Reduced from 0.3
    shadowRadius: 2, // Reduced from 3
    elevation: 4, // Reduced from 5
  },
  toastText: {
    color: '#fff',
    fontSize: adjust(12), // Reduced from 14
    marginLeft: adjust(6), // Reduced from 8
    fontWeight: '500',
  },
});

export default CommuteScreen; 