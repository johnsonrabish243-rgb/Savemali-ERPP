export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function generateSessionId(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(36)).join("").slice(0, 32)
}

export type ChallengeType = "math" | "arrangement" | "pattern"

export interface ChallengeData {
  type: ChallengeType
  question: string
  data: any
  answer: string
  salt: string
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateMathChallenge(): ChallengeData {
  const ops = ["+", "-", "×"] as const
  const op = ops[randInt(0, 2)]
  let a: number, b: number, answer: number
  switch (op) {
    case "+":
      a = randInt(5, 50); b = randInt(1, 30)
      answer = a + b; break
    case "-":
      a = randInt(10, 50); b = randInt(1, a)
      answer = a - b; break
    case "×":
      a = randInt(2, 12); b = randInt(2, 9)
      answer = a * b; break
  }
  const salt = generateSalt()
  return {
    type: "math",
    question: `${a} ${op} ${b} = ?`,
    data: { a, b, op },
    answer: String(answer),
    salt,
  }
}

const EMOJI_ITEMS = [
  { id: "apple", label: "Pomme", emoji: "🍎", cat: "fruit" },
  { id: "banana", label: "Banane", emoji: "🍌", cat: "fruit" },
  { id: "grape", label: "Raisin", emoji: "🍇", cat: "fruit" },
  { id: "orange", label: "Orange", emoji: "🍊", cat: "fruit" },
  { id: "lemon", label: "Citron", emoji: "🍋", cat: "fruit" },
  { id: "car", label: "Voiture", emoji: "🚗", cat: "vehicle" },
  { id: "bus", label: "Bus", emoji: "🚌", cat: "vehicle" },
  { id: "bike", label: "Vélo", emoji: "🚲", cat: "vehicle" },
  { id: "plane", label: "Avion", emoji: "✈️", cat: "vehicle" },
  { id: "dog", label: "Chien", emoji: "🐕", cat: "animal" },
  { id: "cat", label: "Chat", emoji: "🐱", cat: "animal" },
  { id: "rabbit", label: "Lapin", emoji: "🐰", cat: "animal" },
  { id: "sun", label: "Soleil", emoji: "☀️", cat: "nature" },
  { id: "moon", label: "Lune", emoji: "🌙", cat: "nature" },
  { id: "star", label: "Étoile", emoji: "⭐", cat: "nature" },
  { id: "pizza", label: "Pizza", emoji: "🍕", cat: "food" },
  { id: "cake", label: "Gâteau", emoji: "🎂", cat: "food" },
  { id: "burger", label: "Burger", emoji: "🍔", cat: "food" },
]

export function generateArrangementChallenge(): ChallengeData {
  const allItems = shuffle(EMOJI_ITEMS).slice(0, 4)
  const sorted = [...allItems].sort((a, b) => a.label.localeCompare(b.label))
  const shuffled = shuffle(allItems)
  const salt = generateSalt()
  const answerStr = sorted.map((i) => i.id).join(",")
  return {
    type: "arrangement",
    question: "Classez par ordre alphabétique",
    data: { items: shuffled },
    answer: answerStr,
    salt,
  }
}

export function generatePatternChallenge(): ChallengeData {
  const cats = ["fruit", "vehicle", "animal", "nature", "food"]
  const targetCat = cats[randInt(0, cats.length - 1)]
  const pool = shuffle(EMOJI_ITEMS).slice(0, 9)
  const correctIndices = pool
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.cat === targetCat)
    .map(({ idx }) => idx)
  const salt = generateSalt()
  const answerStr = correctIndices.sort((a, b) => a - b).join(",")
  const catLabel = targetCat === "fruit" ? "fruits" : targetCat === "vehicle" ? "véhicules" : targetCat === "animal" ? "animaux" : targetCat === "nature" ? "éléments naturels" : "aliments"
  return {
    type: "pattern",
    question: `Sélectionnez tous les ${catLabel}`,
    data: { items: pool, targetCat },
    answer: answerStr,
    salt,
  }
}

export function getRandomChallenge(): ChallengeData {
  const types: ChallengeType[] = ["math", "arrangement", "pattern"]
  const type = types[randInt(0, types.length - 1)]
  switch (type) {
    case "math": return generateMathChallenge()
    case "arrangement": return generateArrangementChallenge()
    case "pattern": return generatePatternChallenge()
  }
}
