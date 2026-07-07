// AI Security Layer for SaveMali Widget

// Prompt injection detection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|rules?|prompts?|directives?)/i,
  /you\s+are\s+now\s+(a|an|the)/i,
  /pretend\s+(you\s+are|to\s+be|that\s+you)/i,
  /act\s+as\s+(if|a|an)/i,
  /disregard\s+(all|any|your|the)/i,
  /forget\s+(everything|all|your|the)/i,
  /new\s+instructions?/i,
  /system\s*:\s*/i,
  /admin\s*:\s*/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /###\s*(system|user|assistant)/i,
  /override\s+(system|instructions?|rules?)/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /do\s+anything\s+now/i,
  /you\s+must\s+(always|never|only)/i,
  /reveal\s+(your|the|system)\s+(prompt|instructions?|rules?)/i,
  /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?|rules?)/i,
  /show\s+me\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?)/i,
  /deviens\s+(maintenant|un|une|le|la)/i,
  /fais\s+(comme\s+si|semblant)/i,
  /ignore\s+(tous|toutes)?\s*(les\s+)?(instructions|règles)/i,
  /oublie\s+(tout|toutes|tous|vos|tes)/i,
  /nouvelles?\s+instructions?/i,
  /mode\s+(admin|développeur|hacker)/i,
  /tu\s+es\s+(désormais|maintenant|un|une)/i,
  /prétends?\s+(que\s+tu|être)/i,
  /contourner\s+(les|règles|sécurité)/i,
]

// Data exfiltration patterns
const DATA_EXFILTRATION_PATTERNS = [
  /show\s+me\s+(all|every|the)\s+(users?|accounts?|members?|passwords?|emails?|data)/i,
  /list\s+(all|every|the)\s+(users?|accounts?|members?|workspaces?)/i,
  /give\s+me\s+(access|the|all)\s+(to\s+)?(data|users?|accounts?|admin)/i,
  /how\s+(can\s+I|to)\s+(access|hack|breach|bypass)/i,
  /sql\s+injection/i,
  /drop\s+table/i,
  /delete\s+from/i,
  /select\s+.*\s+from\s+(users|accounts|members|auth)/i,
  /api[_\s]?key|secret[_\s]?key|password|token/i,
  /other\s+(users?|workspaces?|accounts?)\s+(data|information)/i,
  /someone\s+else'?s?\s+(data|account|workspace)/i,
]

// NoSQL / MongoDB injection patterns
const NOSQL_PATTERNS = [
  /\$where/i,
  /\$gt|\$gte|\$lt|\$lte|\$ne|\$in|\$nin/i,
  /\$regex|\$options/i,
  /\$exists/i,
  /\$and|\$or|\$not/i,
  /\$unset|\$set|\$push|\$pull|\$inc/i,
  /\$lookup|\$unwind|\$group/i,
  /db\.\w+\.(find|insert|update|delete|aggregate)/i,
  /{"\s*\$/,
  /ObjectId\s*\(/i,
  /ISODate\s*\(/i,
]

// Unicode / encoding evasion patterns
const ENCODING_EVASION_PATTERNS = [
  /\\u[0-9a-f]{4}/i,
  /\\x[0-9a-f]{2}/i,
  /&#x?[0-9a-f]+;?/i,
  /\\u00/i,
  /String\.fromCharCode/i,
  /fromCharCode/i,
  /atob\s*\(/i,
  /btoa\s*\(/i,
  /decodeURIComponent/i,
  /encodeURI/i,
]

// Suspicious request patterns
const SUSPICIOUS_PATTERNS = [
  /curl\s|wget\s|fetch\s*\(|axios\.(get|post|put|delete)/i,
  /exec\s*\(|eval\s*\(|system\s*\(/i,
  /\.\.\/|\.\.\\|etc\/passwd|etc\/shadow/i,
  /base64|atob|btoa/i,
  /document\.cookie/i,
  /localStorage|sessionStorage/i,
  /window\.open|popup/i,
  /<iframe|<object|<embed/i,
  /onerror|onload|onclick|onmouseover/i,
  /SELECT\s+.*\s+FROM\s+\w+/i,
  /INSERT\s+INTO\s+\w+/i,
  /UPDATE\s+\w+\s+SET/i,
  /DELETE\s+FROM\s+\w+/i,
  /DROP\s+(TABLE|DATABASE)/i,
  /UNION\s+(ALL\s+)?SELECT/i,
  /--\s*$/m,
  /\/\*[\s\S]*?\*\//,
]

export interface SecurityCheckResult {
  safe: boolean
  reason?: string
  category?: "injection" | "exfiltration" | "suspicious" | "safe"
}

export function checkMessageSafety(message: string): SecurityCheckResult {
  const trimmed = message.trim()
  
  // Check for prompt injection
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: "prompt_injection", category: "injection" }
    }
  }
  
  // Check for data exfiltration attempts
  for (const pattern of DATA_EXFILTRATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: "data_exfiltration", category: "exfiltration" }
    }
  }
  
  // Check for NoSQL injection attempts
  for (const pattern of NOSQL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: "nosql_injection", category: "suspicious" }
    }
  }
  
  // Check for encoding evasion attempts
  for (const pattern of ENCODING_EVASION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: "encoding_evasion", category: "suspicious" }
    }
  }
  
  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: "suspicious_request", category: "suspicious" }
    }
  }
  
  return { safe: true, category: "safe" }
}

// Rate limiting for AI API calls
const AI_RATE_KEY = "savemali_ai_rate"
const AI_MAX_CALLS = 20
const AI_RATE_WINDOW = 60 * 1000 // 1 minute

export function checkAiRateLimit(): { allowed: boolean; remaining: number } {
  const raw = localStorage.getItem(AI_RATE_KEY)
  let record: { count: number; windowStart: number }
  try { record = raw ? JSON.parse(raw) : { count: 0, windowStart: Date.now() } }
  catch { record = { count: 0, windowStart: Date.now() } }
  
  const now = Date.now()
  if (now - record.windowStart > AI_RATE_WINDOW) {
    localStorage.setItem(AI_RATE_KEY, JSON.stringify({ count: 1, windowStart: now }))
    return { allowed: true, remaining: AI_MAX_CALLS - 1 }
  }
  
  if (record.count >= AI_MAX_CALLS) {
    return { allowed: false, remaining: 0 }
  }
  
  record.count++
  localStorage.setItem(AI_RATE_KEY, JSON.stringify(record))
  return { allowed: true, remaining: AI_MAX_CALLS - record.count }
}

// Sanitize user input before sending to AI
export function sanitizeAiInput(input: string): string {
  return input
    .trim()
    .slice(0, 2000)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars
}

// Generate safe rejection message
export function getRejectionMessage(category: string, lang: "fr" | "en"): string {
  const messages: Record<string, { fr: string; en: string }> = {
    prompt_injection: {
      fr: "Je ne peux pas traiter cette demande. Veuillez poser une question directe sur SaveMali.",
      en: "I cannot process this request. Please ask a direct question about SaveMali.",
    },
    data_exfiltration: {
      fr: "Je ne peux pas fournir d'accès aux données internes ou aux comptes utilisateurs. Pour toute question sur vos données, contactez le DPO.",
      en: "I cannot provide access to internal data or user accounts. For data questions, contact the DPO.",
    },
    suspicious_request: {
      fr: "Cette requête a été identifiée comme suspecte. Veuillez reformuler votre question de manière appropriée.",
      en: "This request has been flagged as suspicious. Please rephrase your question appropriately.",
    },
  }
  return messages[category]?.[lang] ?? messages.suspicious_request[lang]
}
