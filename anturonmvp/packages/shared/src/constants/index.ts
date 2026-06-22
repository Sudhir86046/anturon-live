// Industries
export const INDUSTRIES = [
  { value: 'retail', label: 'Retail', icon: 'shopping-bag' },
  { value: 'real_estate', label: 'Real Estate', icon: 'home' },
  { value: 'ecommerce', label: 'E-commerce / Quick Commerce', icon: 'package' },
  { value: 'fintech', label: 'Fintech', icon: 'credit-card' },
  { value: 'banking', label: 'Banking', icon: 'landmark' },
  { value: 'other', label: 'Other', icon: 'building' },
] as const;

// Use Cases
export const USE_CASES = [
  { value: 'customer_support', label: 'Customer Support', description: '24/7 automated support for FAQs, order tracking, complaints' },
  { value: 'lead_qualification', label: 'Lead Qualification', description: 'Qualify leads, collect information, score prospects' },
  { value: 'sales', label: 'Sales & Outreach', description: 'Outbound sales calls, follow-ups, promotions' },
  { value: 'appointment_booking', label: 'Appointment Booking', description: 'Schedule appointments, send reminders, manage calendar' },
  { value: 'survey', label: 'Surveys & Feedback', description: 'Collect feedback, conduct surveys, NPS scoring' },
] as const;

// Regions
export const REGIONS = [
  { value: 'uae', label: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai' },
  { value: 'saudi', label: 'Saudi Arabia', currency: 'SAR', timezone: 'Asia/Riyadh' },
  { value: 'india', label: 'India', currency: 'INR', timezone: 'Asia/Kolkata' },
  { value: 'other', label: 'Other', currency: 'USD', timezone: 'UTC' },
] as const;

// Supported Languages
export const LANGUAGES = [
  { code: 'en', name: 'English', region: ['uae', 'saudi', 'india', 'other'], flag: '🇬🇧', voiceSupport: true },
  { code: 'ar', name: 'Arabic', region: ['uae', 'saudi'], flag: '🇸🇦', voiceSupport: true, rtl: true },
  { code: 'hi', name: 'Hindi', region: ['india'], flag: '🇮🇳', voiceSupport: true },
  { code: 'ur', name: 'Urdu', region: ['india', 'uae'], flag: '🇵🇰', voiceSupport: true, rtl: true },
  { code: 'ta', name: 'Tamil', region: ['india', 'uae'], flag: '🇮🇳', voiceSupport: true },
  { code: 'te', name: 'Telugu', region: ['india'], flag: '🇮🇳', voiceSupport: true },
  { code: 'bn', name: 'Bengali', region: ['india'], flag: '🇮🇳', voiceSupport: true },
] as const;

// Subscription Plans
export const PLANS = {
  free: {
    name: 'Free',
    monthlyMinutes: 100,
    maxAgents: 1,
    maxUsers: 2,
    features: ['Basic voice agents', 'Call transcripts', 'Email support'],
  },
  starter: {
    name: 'Starter',
    monthlyMinutes: 1000,
    maxAgents: 3,
    maxUsers: 5,
    features: ['All Free features', 'Custom voice', 'Analytics dashboard', 'Webhook support'],
  },
  growth: {
    name: 'Growth',
    monthlyMinutes: 5000,
    maxAgents: 10,
    maxUsers: 20,
    features: ['All Starter features', 'Priority support', 'CRM integrations', 'Custom webhooks'],
  },
  enterprise: {
    name: 'Enterprise',
    monthlyMinutes: -1, // unlimited
    maxAgents: -1,
    maxUsers: -1,
    features: ['All Growth features', 'Dedicated support', 'SLA guarantee', 'Custom AI training', 'On-premise option'],
  },
} as const;

// Call Outcomes
export const CALL_OUTCOMES = [
  { value: 'resolved', label: 'Resolved', color: 'green', category: 'success' },
  { value: 'escalated', label: 'Escalated to Human', color: 'orange', category: 'handoff' },
  { value: 'callback_scheduled', label: 'Callback Scheduled', color: 'blue', category: 'followup' },
  { value: 'appointment_booked', label: 'Appointment Booked', color: 'green', category: 'success' },
  { value: 'sale_made', label: 'Sale Completed', color: 'green', category: 'success' },
  { value: 'lead_qualified', label: 'Lead Qualified', color: 'green', category: 'success' },
  { value: 'unqualified', label: 'Lead Unqualified', color: 'gray', category: 'closed' },
  { value: 'no_answer', label: 'No Answer', color: 'gray', category: 'failed' },
  { value: 'voicemail_left', label: 'Voicemail Left', color: 'blue', category: 'followup' },
] as const;

// Industry-specific templates for Dubai/India
export const INDUSTRY_TEMPLATES = {
  retail: {
    customer_support: {
      systemPrompt: `You are a helpful customer support assistant for a retail store in {{region}}. 
Speak in {{language}}. Be polite, professional, and empathetic. 
You can help with: order status, returns/exchanges, product inquiries, store locations, and loyalty program questions.
If the customer is angry or the issue is complex, offer to transfer to a human agent.`,
      welcomeMessage: {
        en: "Hello! Thank you for calling {{company}}. I'm your virtual assistant. How can I help you today?",
        ar: "مرحباً! شكراً لاتصالك بـ {{company}}. أنا مساعدك الافتراضي. كيف يمكنني مساعدتك اليوم؟",
        hi: "नमस्ते! {{company}} को कॉल करने के लिए धन्यवाद। मैं आपका वर्चुअल सहायक हूं। मैं आपकी कैसे मदद कर सकता हूं?",
      },
    },
  },
  real_estate: {
    lead_qualification: {
      systemPrompt: `You are a real estate lead qualification assistant for {{company}} in {{region}}.
Speak in {{language}}. Be professional and knowledgeable about the local property market.
Your goal is to: understand the buyer's budget, preferred location, property type, and timeline.
Qualify leads based on: budget match, purchase timeline (3-6 months preferred), and financing readiness.
Schedule property viewings for qualified leads.`,
      welcomeMessage: {
        en: "Hi! I'm calling from {{company}}. I understand you're interested in properties in {{region}}. Do you have a few minutes to discuss your requirements?",
        ar: "مرحباً! أنا أتصل من {{company}}. أفهم أنك مهتم بالعقارات في {{region}}. هل لديك بضع دقائق لمناقشة متطلباتك؟",
        hi: "नमस्ते! मैं {{company}} से बात कर रहा हूं। मुझे पता चला है कि आप {{region}} में प्रॉपर्टी में रुचि रखते हैं। क्या आपके पास अपनी आवश्यकताओं पर चर्चा करने के लिए कुछ मिनट हैं?",
      },
    },
  },
  ecommerce: {
    customer_support: {
      systemPrompt: `You are a customer support assistant for an e-commerce platform serving {{region}}.
Speak in {{language}}. Be efficient and solution-oriented.
You can help with: order tracking, delivery issues, refunds, product questions, and account issues.
For delivery in UAE/Dubai: same-day delivery available for orders before 2 PM. For India: check pincode serviceability.
Escalate fraud complaints immediately.`,
      welcomeMessage: {
        en: "Welcome to {{company}} customer support! I'm here to help with your orders, deliveries, or any questions. What can I assist you with?",
        ar: "مرحباً بك في دعم عملاء {{company}}! أنا هنا للمساعدة في طلباتك والتوصيل أو أي أسئلة. بماذا يمكنني مساعدتك؟",
        hi: "{{company}} ग्राहक सहायता में आपका स्वागत है! मैं आपके ऑर्डर, डिलीवरी या किसी भी सवाल में मदद के लिए यहां हूं। मैं आपकी कैसे मदद कर सकता हूं?",
      },
    },
    lead_qualification: {
      systemPrompt: `You are a sales assistant for {{company}} e-commerce platform.
Speak in {{language}}. Help convert website visitors or inquiries into registered customers.
Offer: signup benefits, first-order discounts, and loyalty program details.
Collect: phone number for OTP, preferred categories, and communication preferences.
Address common concerns: payment security, return policy, and delivery reliability.`,
      welcomeMessage: {
        en: "Hi! I'm from {{company}}. I noticed you were browsing our store. I'd love to help you get started with exclusive new customer offers. Interested?",
        ar: "مرحباً! أنا من {{company}}. لاحظت أنك كنت تتصفح متجرنا. أود مساعدتك في البدء مع عروض حصرية للعملاء الجدد. مهتم؟",
        hi: "नमस्ते! मैं {{company}} से हूं। मैंने देखा कि आप हमारे स्टोर पर ब्राउज़ कर रहे थे। मैं आपको नए ग्राहकों के लिए विशेष ऑफर के साथ शुरू करने में मदद करना चाहूंगा। रुचि है?",
      },
    },
  },
  fintech: {
    customer_support: {
      systemPrompt: `You are a secure, compliant customer support assistant for {{company}} fintech services in {{region}}.
Speak in {{language}}. NEVER ask for passwords, OTPs, or full card numbers.
You can help with: account balance inquiries, transaction history, KYC status, card blocking, and service requests.
For security: verify identity through last 4 digits of registered phone and date of birth before discussing account details.
Escalate immediately: fraud reports, unauthorized transactions, or account lockouts.`,
      welcomeMessage: {
        en: "Welcome to {{company}} secure banking line. I'm your voice assistant. For your security, I'll verify your identity before accessing account details. How may I help you today?",
        ar: "مرحباً بك في الخط الآمن لـ {{company}}. أنا مساعدك الصوتي. لأمانك، سأتحقق من هويتك قبل الوصول إلى تفاصيل الحساب. كيف يمكنني مساعدتك اليوم؟",
        hi: "{{company}} सुरक्षित बैंकिंग लाइन में आपका स्वागत है। मैं आपका वॉयस सहायक हूं। आपकी सुरक्षा के लिए, खाता विवरण देखने से पहले मैं आपकी पहचान सत्यापित करूंगा। मैं आपकी कैसे मदद कर सकता हूं?",
      },
    },
    lead_qualification: {
      systemPrompt: `You are a lead qualification assistant for {{company}} fintech products in {{region}}.
Speak in {{language}}. Products: personal loans, credit cards, investment accounts, and business banking.
Qualify based on: employment status, income range, credit score (if known), and immediate financial needs.
Explain: eligibility criteria, required documents, and application process.
Schedule callbacks with relationship managers for high-value prospects.`,
      welcomeMessage: {
        en: "Hello! I'm from {{company}} financial services. We're offering exclusive rates for {{region}} customers. May I ask a few questions to see which products suit you best?",
        ar: "مرحباً! أنا من الخدمات المالية {{company}}. نقدم أسعاراً حصرية لعملاء {{region}}. هل لي أن أطرح عليك بعض الأسئلة لمعرفة المنتجات التي تناسبك best؟",
        hi: "नमस्ते! मैं {{company}} वित्तीय सेवाओं से हूं। हम {{region}} ग्राहकों के लिए विशेष दरों की पेशकश कर रहे हैं। क्या मैं आपसे कुछ सवाल पूछ सकता हूं कि कौन से उत्पाद आपके लिए सबसे अच्छे हैं?",
      },
    },
  },
  banking: {
    customer_support: {
      systemPrompt: `You are a professional banking assistant for {{company}} in {{region}}.
Speak in {{language}}. Follow strict banking compliance and security protocols.
Services: account services, loan inquiries, credit card support, and branch information.
Security protocol: verify through registered mobile last 4 digits + DOB or account last 4 digits.
Never disclose: full account numbers, card CVV, OTP, or passwords.
Immediate escalation: fraud alerts, suspicious transactions, or emergency card blocking.`,
      welcomeMessage: {
        en: "Thank you for calling {{company}}. This is a secure banking line. I'm your virtual assistant. Before we proceed with account-specific queries, I'll need to verify your identity. How can I assist you?",
        ar: "شكراً لاتصالك بـ {{company}}. هذا خط بنكي آمن. أنا مساعدك الافتراضي. قبل المضي قدماً في الاستفسارات الخاصة بالحساب، سأحتاج للتحقق من هويتك. كيف يمكنني مساعدتك؟",
        hi: "{{company}} को कॉल करने के लिए धन्यवाद। यह एक सुरक्षित बैंकिंग लाइन है। मैं आपका वर्चुअल सहायक हूं। खाता-विशिष्ट प्रश्नों के साथ आगे बढ़ने से पहले, मुझे आपकी पहचान सत्यापित करने की आवश्यकता होगी। मैं आपकी कैसे मदद कर सकता हूं?",
      },
    },
  },
} as const;

// ElevenLabs Voice IDs for regional languages
export const VOICE_IDS = {
  en: {
    professional_female: 'XB0fDUnXU5powFXDhCwa', // Sarah
    professional_male: 'TX3AE3Vo0lTLkT1QG1Jb',   // Michael
    friendly_female: 'Xb7hH8MSUJpSbSDYk0k2',     // Bella
  },
  ar: {
    professional_female: 'oWCDIZB3F7JrAK9UioZw', // Arabic female
    professional_male: 'CwhRBWXzGAHq8TQ4Fs17',   // Arabic male
  },
  hi: {
    professional_female: 'jsCqWAovK2LshcgyHcqn', // Hindi female
    professional_male: 'Sg8J8pADqmK6GIQ4C9Dc',   // Hindi male
  },
} as const;

// API Rate Limits
export const RATE_LIMITS = {
  free: { requestsPerMinute: 30, callsPerDay: 10 },
  starter: { requestsPerMinute: 100, callsPerDay: 100 },
  growth: { requestsPerMinute: 300, callsPerDay: 500 },
  enterprise: { requestsPerMinute: 1000, callsPerDay: -1 },
} as const;
