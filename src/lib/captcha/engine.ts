import type { ChallengeType, BehavioralData, RiskAssessment, CaptchaChallenge, MediaItem } from "./types"
import { assessRisk, generateToken } from "./security"

export interface EngineConfig {
  minDifficulty: number
  maxDifficulty: number
  failThreshold: number
  lockoutDuration: number
  challengeTimeout: number
  challengeCount: number
}

const DEFAULT_CONFIG: EngineConfig = {
  minDifficulty: 1,
  maxDifficulty: 10,
  failThreshold: 3,
  lockoutDuration: 30,
  challengeTimeout: 30,
  challengeCount: 9,
}

const CATEGORY_GROUPS: string[][] = [
  ["cars", "motorcycles", "buses", "bicycles"],
  ["cats", "dogs", "birds", "horses", "elephants", "lions", "fish"],
  ["food", "fruits", "vegetables"],
  ["flowers", "trees", "mountains", "oceans"],
  ["airplanes", "boats", "buildings", "bridges", "roads", "signs"],
  ["phones", "computers", "books", "watches", "shoes", "bags", "clothes"],
  ["people_men", "people_women", "people_children", "people_seniors"],
]

const EMOJI_SETS = [
  ["✈️", "🚗", "🚌", "🏍️", "🚲", "🚂", "🚀", "⛵"],
  ["🐱", "🐶", "🐦", "🐴", "🐘", "🦁", "🐟", "🐼"],
  ["🌸", "🌺", "🌻", "🌹", "🌷", "🌼", "🪷", "💐"],
  ["🍕", "🍔", "🌮", "🍣", "🍎", "🍊", "🍇", "🍓"],
  ["📱", "💻", "⌚", "📚", "🎒", "👟", "👔", "👜"],
  ["🏠", "🏢", "🏥", "🏫", "⛪", "🗼", "🏰", "🌉"],
  ["⚽", "🏀", "🎾", "🏐", "🏓", "🎯", "🎲", "🧩"],
]

export class CaptchaEngine {
  private config: EngineConfig
  private failCount: number
  private lockedUntil: number | null
  private consecutiveSuccesses: number
  private currentDifficulty: number
  private mediaLibrary: MediaItem[]
  private challengeHistory: ChallengeType[]

  constructor(config?: Partial<EngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.failCount = 0
    this.lockedUntil = null
    this.consecutiveSuccesses = 0
    this.currentDifficulty = Math.floor((this.config.minDifficulty + this.config.maxDifficulty) / 2)
    this.mediaLibrary = []
    this.challengeHistory = []
  }

  setMediaLibrary(items: MediaItem[]): void {
    this.mediaLibrary = items
  }

  getMediaByCategory(category: string): MediaItem[] {
    return this.mediaLibrary.filter((m) => m.category === category)
  }

  addMediaItem(item: MediaItem): void {
    this.mediaLibrary.push(item)
  }

  private computeDifficulty(risk: RiskAssessment): number {
    let diff = this.currentDifficulty
    if (risk.score < 30) diff = Math.min(diff + 2, this.config.maxDifficulty)
    else if (risk.score < 50) diff = Math.min(diff + 1, this.config.maxDifficulty)
    else if (risk.score > 70) diff = Math.max(diff - 1, this.config.minDifficulty)
    else if (risk.score > 85) diff = Math.max(diff - 2, this.config.minDifficulty)
    return diff
  }

  selectChallengeType(risk: RiskAssessment): ChallengeType {
    const recentTypes = this.challengeHistory.slice(-3)
    const typeCounts: Record<ChallengeType, number> = {
      images: 0, shapes: 0, puzzle: 0, sequential: 0, audio: 0,
    }
    recentTypes.forEach((t) => { typeCounts[t]++ })

    const availableTypes: ChallengeType[] = ["images", "shapes", "puzzle", "sequential", "audio"]
    const leastUsed = availableTypes.filter((t) => typeCounts[t] === Math.min(...Object.values(typeCounts)))

    let selected: ChallengeType

    if (risk.score < 20) {
      selected = "puzzle"
    } else if (risk.score < 40) {
      selected = leastUsed.includes("images") ? "images" : "sequential"
    } else if (risk.score < 60) {
      selected = leastUsed[Math.floor(Math.random() * leastUsed.length)]
    } else if (risk.score < 80) {
      selected = leastUsed.includes("shapes") ? "shapes" : leastUsed[0]
    } else {
      selected = leastUsed[Math.floor(Math.random() * leastUsed.length)]
    }

    this.challengeHistory.push(selected)
    if (this.challengeHistory.length > 10) this.challengeHistory.shift()

    return selected
  }

  isLocked(): boolean {
    if (!this.lockedUntil) return false
    if (Date.now() >= this.lockedUntil) {
      this.lockedUntil = null
      this.failCount = 0
      return false
    }
    return true
  }

  getLockoutTime(): number {
    if (!this.lockedUntil) return 0
    return Math.ceil((this.lockedUntil - Date.now()) / 1000)
  }

  recordFailure(): boolean {
    this.failCount++
    this.consecutiveSuccesses = 0
    if (this.failCount >= this.config.failThreshold) {
      const lockoutMultiplier = Math.min(3, 1 + Math.floor(this.failCount / 3))
      this.lockedUntil = Date.now() + this.config.lockoutDuration * lockoutMultiplier * 1000
      return true
    }
    return false
  }

  recordSuccess(risk: RiskAssessment): void {
    this.failCount = 0
    this.consecutiveSuccesses++
    this.currentDifficulty = this.computeDifficulty(risk)

    if (this.consecutiveSuccesses >= 3) {
      this.currentDifficulty = Math.min(this.currentDifficulty + 1, this.config.maxDifficulty)
    }
  }

  getRemainingAttempts(): number {
    return Math.max(0, this.config.failThreshold - this.failCount)
  }

  getDifficulty(): number {
    return this.currentDifficulty
  }

  createChallenge(behavioralData: BehavioralData): CaptchaChallenge {
    const risk = assessRisk(behavioralData)
    const type = this.selectChallengeType(risk)
    const difficulty = this.computeDifficulty(risk)

    const challenge: CaptchaChallenge = {
      id: generateToken().slice(0, 16),
      type,
      data: this.generateChallengeData(type, difficulty),
      difficulty,
      expiresAt: Date.now() + this.config.challengeTimeout * 1000,
      token: generateToken(),
    }

    return challenge
  }

  private generateChallengeData(type: ChallengeType, difficulty: number): unknown {
    switch (type) {
      case "shapes": return this.generateShapeGrid(difficulty)
      case "images": return this.generateImageSelection(difficulty)
      case "puzzle": return this.generatePuzzle(difficulty)
      case "sequential": return this.generateSequential(difficulty)
      case "audio": return this.generateAudioChallenge(difficulty)
      default: return this.generateShapeGrid(difficulty)
    }
  }

  private generateShapeGrid(difficulty: number) {
    const SHAPES = ["circle", "square", "triangle", "diamond", "hexagon", "star", "pentagon"] as const
    const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#be185d"] as const

    const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
    const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)]
    const gridSize = difficulty > 7 ? 16 : difficulty > 4 ? 9 : 4

    const grid: { id: number; shape: string; color: string; rotation: number }[] = []
    let id = 0
    const targetCount = Math.max(2, Math.floor(gridSize * 0.3))

    for (let i = 0; i < targetCount; i++) {
      grid.push({ id: id++, shape: targetShape, color: targetColor, rotation: Math.floor(Math.random() * 360) })
    }
    for (let i = grid.length; i < gridSize; i++) {
      let s: string, c: string
      do {
        s = SHAPES[Math.floor(Math.random() * SHAPES.length)]
        c = COLORS[Math.floor(Math.random() * COLORS.length)]
      } while (s === targetShape && c === targetColor)
      grid.push({ id: id++, shape: s, color: c, rotation: Math.floor(Math.random() * 360) })
    }

    for (let i = grid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[grid[i], grid[j]] = [grid[j], grid[i]]
    }

    return { tiles: grid, targetShape, targetColor, targetCount, gridSize }
  }

  private generateImageSelection(difficulty: number) {
    const group = CATEGORY_GROUPS[Math.floor(Math.random() * CATEGORY_GROUPS.length)]
    const targetCategory = group[Math.floor(Math.random() * group.length)]
    const pool = this.mediaLibrary.filter((m) => m.category === targetCategory)
    const distractors = this.mediaLibrary.filter((m) => m.category !== targetCategory && !group.includes(m.category))

    const targetCount = difficulty > 7 ? 4 : difficulty > 4 ? 3 : 2
    const selected = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(targetCount, pool.length))
    const fillerCount = Math.min(9, difficulty > 7 ? 12 : 9) - selected.length
    const filler = [...distractors].sort(() => Math.random() - 0.5).slice(0, fillerCount)

    const tiles = [...selected, ...filler].sort(() => Math.random() - 0.5)

    return { tiles, targetCategory, targetCount: selected.length, gridSize: tiles.length > 9 ? 12 : 9 }
  }

  private generatePuzzle(difficulty: number) {
    const gridSize = difficulty > 7 ? 4 : difficulty > 4 ? 3 : 3
    const pieceCount = gridSize * gridSize
    const pieces = Array.from({ length: pieceCount }, (_, i) => ({
      id: i,
      correctRow: Math.floor(i / gridSize),
      correctCol: i % gridSize,
    }))
    return { gridSize, pieceCount, pieces }
  }

  private generateSequential(difficulty: number) {
    const emojiSet = EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)]
    const itemCount = difficulty > 7 ? 7 : difficulty > 4 ? 5 : 4
    const selected = [...emojiSet].sort(() => Math.random() - 0.5).slice(0, itemCount)
    const displayOrder = [...selected].sort(() => Math.random() - 0.5)
    return { items: selected, displayOrder, correctOrder: selected, itemCount }
  }

  private generateAudioChallenge(difficulty: number) {
    const wordSets: Record<string, string[]> = {
      fr: ["avion", "maison", "chat", "arbre", "route", "fleur", "livre", "soleil", "eau", "feu", "terre", "vent"],
      en: ["plane", "house", "cat", "tree", "road", "flower", "book", "sun", "water", "fire", "earth", "wind"],
    }
    const words = wordSets["fr"]
    const wordCount = difficulty > 7 ? 4 : difficulty > 4 ? 3 : 2
    const selected = [...words].sort(() => Math.random() - 0.5).slice(0, wordCount)
    return { words: selected, wordCount }
  }
}

export function createEngine(config?: Partial<EngineConfig>): CaptchaEngine {
  return new CaptchaEngine(config)
}
