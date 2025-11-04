// AI Study Assistant - Workable implementation
// Uses localStorage + optional backend integration

class AIStudyAssistant {
  constructor() {
    this.conversationHistory = [];
    this.userId = localStorage.getItem('userId');
    this.chatBox = document.getElementById('assistantChat');
    this.inputBox = document.getElementById('assistantInput');
    this.isBusy = false;
    
    this.loadHistory();
    this.addInitialGreeting();
  }

  async sendMessage(userMessage) {
    if (!userMessage.trim() || this.isBusy) return;

    this.isBusy = true;
    
    // Display user message
    this.addMessageToChat('You', userMessage, 'user');
    this.inputBox.value = '';

    // Show typing indicator
    this.showTypingIndicator();

    try {
      // First try backend API
      const response = await this.getAIResponse(userMessage);
      this.removeTypingIndicator();
      
      if (response) {
        this.addMessageToChat('AI Assistant', response, 'assistant');
        this.saveConversation();
      }
    } catch (error) {
      this.removeTypingIndicator();
      const fallbackResponse = this.getFallbackResponse(userMessage);
      this.addMessageToChat('AI Assistant', fallbackResponse, 'assistant');
      this.saveConversation();
    }

    this.isBusy = false;
  }

  async getAIResponse(userMessage) {
    // Try backend first
    if (localStorage.getItem('token')) {
      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: userMessage })
        });

        if (response.ok) {
          const data = await response.json();
          return data.response;
        }
      } catch (error) {
        console.log('Backend API unavailable, using fallback');
      }
    }

    // Fallback to local intelligent responses
    return this.generateLocalResponse(userMessage);
  }

  generateLocalResponse(userMessage) {
    const msg = userMessage.toLowerCase();
    
    // Study tips
    if (msg.includes('study') || msg.includes('tips') || msg.includes('help')) {
      const tips = [
        '📚 **Study Tips:**\n• Study in 25-min blocks (Pomodoro)\n• Take 5-min breaks\n• Review notes within 24 hours\n• Study hardest subject first\n• Use active recall, not just reading',
        '💡 **Boost Focus:**\n• Minimize distractions\n• Use a quiet space\n• Put phone on silent\n• Keep water nearby\n• Set clear study goals',
        '🧠 **Memory Tips:**\n• Use mnemonics\n• Create mind maps\n• Teach someone else\n• Practice problems\n• Spaced repetition'
      ];
      return tips[Math.floor(Math.random() * tips.length)];
    }

    // Motivation
    if (msg.includes('motiv') || msg.includes('stuck') || msg.includes('tired')) {
      const motivation = [
        '🌟 Every study session builds towards your success! You\'ve got this!\n\n✨ Remember: Progress > Perfection',
        '💪 You\'re doing amazing! Take a short break, then come back stronger.\n\n🎯 Focus on one task at a time.',
        '🚀 Small consistent steps lead to big achievements!\n\n⏰ Use Focus Mode for 25 mins to boost productivity.'
      ];
      return motivation[Math.floor(Math.random() * motivation.length)];
    }

    // Exam preparation
    if (msg.includes('exam') || msg.includes('test') || msg.includes('prepare')) {
      return '📝 **Exam Prep Strategy:**\n1. Create a study schedule (3 weeks before)\n2. Review all topics systematically\n3. Practice past papers\n4. Time yourself on mock exams\n5. Get 7-8 hours sleep before exam\n\n💡 Pro tip: Study with other subjects in between to keep fresh!';
    }

    // Subject help (general)
    if (msg.includes('math') || msg.includes('science') || msg.includes('english')) {
      return '📖 I\'d love to help! What specific topic would you like to discuss?\n\n✏️ You can also:\n• Create tasks for specific topics\n• Use Focus Mode for deep learning\n• Check your progress in Analytics';
    }

    // What we can do
    if (msg.includes('what can') || msg.includes('can you') || msg.includes('help')) {
      return '✨ **I can help you:**\n• Provide study tips & strategies\n• Offer motivation & support\n• Suggest study techniques\n• Help with exam prep\n• Answer study-related questions\n\n💫 I\'m here to make studying easier and more enjoyable!';
    }

    // Default response
    return '👋 That\'s interesting! Tell me more about your studies.\n\nWhat subject are you working on today?\n\n💡 Tip: Ask me about study tips, exam prep, or motivation!';
  }

  getFallbackResponse(userMessage) {
    return this.generateLocalResponse(userMessage);
  }

  addMessageToChat(sender, message, type) {
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message chat-${type}`;
    messageEl.style.cssText = `
      margin: 10px 0;
      padding: 10px;
      border-radius: 10px;
      background: ${type === 'user' ? '#e3f2fd' : '#f5f5ff'};
      color: #333;
      font-family: Poppins, sans-serif;
      line-height: 1.5;
    `;
    messageEl.innerHTML = `<strong>${sender}:</strong> ${message}`;
    
    if (this.chatBox) {
      this.chatBox.appendChild(messageEl);
      this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }
  }

  showTypingIndicator() {
    const typingEl = document.createElement('div');
    typingEl.id = 'typingIndicator';
    typingEl.textContent = '🤖 AI is thinking...';
    typingEl.style.cssText = `
      padding: 10px;
      color: #8B5CF6;
      font-style: italic;
      margin: 10px 0;
    `;
    
    if (this.chatBox) {
      this.chatBox.appendChild(typingEl);
      this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }
  }

  removeTypingIndicator() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
  }

  addInitialGreeting() {
    const greeting = '👋 Hi! I\'m your AI Study Assistant.\n\n📚 I can help you with:\n• Study tips & strategies\n• Exam preparation\n• Motivation & support\n• Learning techniques\n\n💬 What would you like to know?';
    this.addMessageToChat('AI Assistant', greeting, 'assistant');
  }

  saveConversation() {
    if (this.userId) {
      const messages = Array.from(this.chatBox?.querySelectorAll('.chat-message') || [])
        .map(el => el.textContent);
      
      localStorage.setItem(`ai_conversation_${this.userId}`, JSON.stringify({
        messages: messages,
        timestamp: Date.now()
      }));
    }
  }

  loadHistory() {
    if (!this.userId) return;
    
    const saved = localStorage.getItem(`ai_conversation_${this.userId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Optionally reload previous conversation
        console.log('Previous conversation loaded');
      } catch (e) {
        console.error('Failed to load conversation history:', e);
      }
    }
  }

  clearHistory() {
    if (this.userId) {
      localStorage.removeItem(`ai_conversation_${this.userId}`);
    }
    if (this.chatBox) {
      this.chatBox.innerHTML = '';
    }
    this.addInitialGreeting();
  }
}

// Initialize
let aiAssistant = null;

document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('assistantInput');
  
  if (chatInput) {
    aiAssistant = new AIStudyAssistant();
    
    // Send button
    const sendBtn = document.querySelector('.chat-input button') || 
                    document.querySelector('[onclick*="sendAssistantMessage"]');
    
    if (sendBtn) {
      sendBtn.onclick = () => {
        aiAssistant.sendMessage(chatInput.value);
      };
    }
    
    // Enter key
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        aiAssistant.sendMessage(chatInput.value);
      }
    });
  }
});

// Global function for send button
function sendAssistantMessage() {
  if (aiAssistant && document.getElementById('assistantInput')) {
    aiAssistant.sendMessage(document.getElementById('assistantInput').value);
  }
}
