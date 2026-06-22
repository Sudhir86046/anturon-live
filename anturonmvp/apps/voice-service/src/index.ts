import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@voice-ai/database';

const PORT = process.env.PORT || 3002;

// Mock conversation responses for different industries and languages
const MOCK_RESPONSES: Record<string, Record<string, string[]>> = {
  en: {
    greeting: [
      "Hello! Thank you for calling. I'm your AI assistant. How can I help you today?",
      "Welcome! I'm here to assist you. What can I do for you?",
      "Hi there! Thanks for reaching out. How may I help?"
    ],
    retail: [
      "I'd be happy to help you track your order. Could you please provide your order number?",
      "Our return policy allows returns within 30 days with receipt. Would you like me to initiate a return?",
      "We have several promotions running. Let me check what's available for you.",
      "I can help you find the nearest store location. What's your area?"
    ],
    real_estate: [
      "I'd love to help you find your dream property. What's your budget range?",
      "We have several properties available in that area. When would you like to schedule a viewing?",
      "Financing options are available. Would you like me to connect you with our mortgage specialist?",
      "That property is still available. Shall I reserve it for a viewing this weekend?"
    ],
    ecommerce: [
      "I can track your order right away. Your package is currently out for delivery.",
      "Same-day delivery is available for orders placed before 2 PM in your area.",
      "I see you have items in your cart. Would you like me to apply a discount code?",
      "Your refund has been processed and should reflect in 3-5 business days."
    ],
    fintech: [
      "For your security, I'll need to verify your identity first. Can you confirm the last 4 digits of your phone number?",
      "Your account balance is available. Would you like me to share it after verification?",
      "I can help you block your card immediately. Please confirm this request.",
      "Your KYC status is pending. Let me check what documents are still needed."
    ],
    banking: [
      "Thank you for calling our secure banking line. I'll verify your identity first.",
      "Your account shows recent activity. Would you like me to review the transactions?",
      "I can help you with loan inquiries. What type of loan are you interested in?",
      "For security purposes, I'll never ask for your full card number or OTP."
    ],
    closing: [
      "Is there anything else I can help you with today?",
      "Thank you for your time. Have a wonderful day!",
      "Please don't hesitate to call back if you need further assistance."
    ]
  },
  ar: {
    greeting: [
      "مرحباً! شكراً لاتصالك. أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟",
      "أهلاً وسهلاً! أنا هنا لمساعدتك. ماذا يمكنني أن أفعل من أجلك؟"
    ],
    retail: [
      "يسعدني مساعدتك في تتبع طلبك. هل يمكنك تزويدي برقم الطلب؟",
      "لدينا عروض مميزة. دعني أتحقق ما هو متاح لك."
    ],
    closing: [
      "شكراً لك. هل هناك شيء آخر يمكنني مساعدتك فيه؟",
      "شكراً على وقتك. أتمنى لك يوماً سعيداً!"
    ]
  },
  hi: {
    greeting: [
      "नमस्ते! कॉल करने के लिए धन्यवाद। मैं आपका AI सहायक हूं। मैं आपकी कैसे मदद कर सकता हूं?",
      "स्वागत है! मैं आपकी सहायता के लिए यहां हूं। मैं आपके लिए क्या कर सकता हूं?"
    ],
    retail: [
      "मैं आपके ऑर्डर को ट्रैक करने में मदद कर सकता हूं। क्या आप अपना ऑर्डर नंबर बता सकते हैं?",
      "हमारे पास कई ऑफर चल रहे हैं। मैं जांच करता हूं कि आपके लिए क्या उपलब्ध है।"
    ],
    closing: [
      "क्या आज मैं आपकी और कोई मदद कर सकता हूं?",
      "आपके समय के लिए धन्यवाद। आपका दिन शुभ हो!"
    ]
  }
};

interface CallSession {
  id: string;
  agentId: string;
  organizationId: string;
  customerPhone: string;
  language: string;
  industry: string;
  transcript: Array<{ speaker: 'agent' | 'customer'; text: string; timestamp: number }>;
  status: 'connected' | 'ended';
  ws: WebSocket;
}

const activeCalls = new Map<string, CallSession>();

const wss = new WebSocketServer({ port: PORT });

console.log(`🎙️ Mock Voice Service running on port ${PORT}`);

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const callId = url.searchParams.get('callId');
  const agentId = url.searchParams.get('agentId');

  if (!callId || !agentId) {
    ws.close(1008, 'Missing callId or agentId');
    return;
  }

  try {
    // Get agent details
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: agentId },
      include: { organization: true }
    });

    if (!agent) {
      ws.close(1008, 'Agent not found');
      return;
    }

    const session: CallSession = {
      id: callId,
      agentId,
      organizationId: agent.organizationId,
      customerPhone: 'mock-customer',
      language: agent.language,
      industry: agent.organization.industry,
      transcript: [],
      status: 'connected',
      ws
    };

    activeCalls.set(callId, session);

    // Update call status in database
    await prisma.call.update({
      where: { id: callId },
      data: { status: 'in_progress', startedAt: new Date() }
    });

    console.log(`📞 Call ${callId} started with agent ${agent.name}`);

    // Send welcome message after a short delay
    setTimeout(() => {
      const greetings = MOCK_RESPONSES[agent.language]?.greeting || MOCK_RESPONSES.en.greeting;
      const welcomeText = greetings[Math.floor(Math.random() * greetings.length)];
      
      sendAgentMessage(session, welcomeText);
    }, 1000);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'user_speech') {
          // Simulate processing delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Add customer message to transcript
          session.transcript.push({
            speaker: 'customer',
            text: message.text,
            timestamp: Date.now()
          });

          // Generate mock response based on industry
          const response = generateMockResponse(session, message.text);
          
          // Simulate thinking delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          sendAgentMessage(session, response);
        }
        
        if (message.type === 'end_call') {
          await endCall(session, message.outcome || 'resolved');
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    ws.on('close', async () => {
      if (session.status === 'connected') {
        await endCall(session, 'no_answer');
      }
    });

  } catch (error) {
    console.error('Error setting up call:', error);
    ws.close(1011, 'Internal error');
  }
});

function generateMockResponse(session: CallSession, userText: string): string {
  const langResponses = MOCK_RESPONSES[session.language] || MOCK_RESPONSES.en;
  const industryKey = session.industry as keyof typeof langResponses;
  
  // Check for ending phrases
  const lowerText = userText.toLowerCase();
  if (lowerText.includes('bye') || lowerText.includes('thank') || lowerText.includes('done') || lowerText.includes('شكرا') || lowerText.includes('धन्यवाद')) {
    const closings = langResponses.closing || MOCK_RESPONSES.en.closing;
    return closings[Math.floor(Math.random() * closings.length)];
  }
  
  // Get industry-specific responses
  const industryResponses = langResponses[industryKey] || langResponses.retail || MOCK_RESPONSES.en.retail;
  return industryResponses[Math.floor(Math.random() * industryResponses.length)];
}

function sendAgentMessage(session: CallSession, text: string) {
  if (session.status !== 'connected') return;
  
  session.transcript.push({
    speaker: 'agent',
    text,
    timestamp: Date.now()
  });
  
  // Calculate simulated audio duration (roughly 150ms per word)
  const wordCount = text.split(' ').length;
  const duration = Math.max(2000, wordCount * 150);
  
  session.ws.send(JSON.stringify({
    type: 'agent_speaking',
    text,
    duration,
    callId: session.id
  }));
  
  console.log(`🤖 Agent: ${text.substring(0, 50)}...`);
}

async function endCall(session: CallSession, outcome: string) {
  if (session.status === 'ended') return;
  
  session.status = 'ended';
  activeCalls.delete(session.id);
  
  const duration = Math.floor((Date.now() - session.transcript[0]?.timestamp || Date.now()) / 1000);
  
  // Update call in database
  await prisma.call.update({
    where: { id: session.id },
    data: {
      status: 'completed',
      endedAt: new Date(),
      duration,
      outcome,
      transcription: JSON.stringify(session.transcript)
    }
  });
  
  // Update agent stats
  await prisma.voiceAgent.update({
    where: { id: session.agentId },
    data: {
      totalCalls: { increment: 1 },
      totalMinutes: { increment: Math.ceil(duration / 60) }
    }
  });
  
  session.ws.send(JSON.stringify({
    type: 'call_ended',
    outcome,
    duration
  }));
  
  session.ws.close();
  
  console.log(`📴 Call ${session.id} ended. Duration: ${duration}s, Outcome: ${outcome}`);
}

// HTTP endpoint for initiating mock calls
import { createServer } from 'http';

const httpServer = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url?.startsWith('/mock-call') && req.method === 'POST') {
    const callId = uuidv4();
    
    res.writeHead(200);
    res.end(JSON.stringify({
      callId,
      wsUrl: `ws://localhost:${PORT}?callId=${callId}&agentId=mock`,
      status: 'ready'
    }));
    return;
  }
  
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      activeCalls: activeCalls.size,
      uptime: process.uptime()
    }));
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

httpServer.listen(PORT + 1, () => {
  console.log(`🌐 Mock Voice HTTP API on port ${PORT + 1}`);
});

console.log('🎙️ Mock Voice Service ready for demo calls');
