import * as React from "react"
import { RotateCw, AlertCircle, Puzzle, Move, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCaptchaLang } from "@/lib/captcha/i18n"
import { getMediaLibrary } from "@/lib/captcha/media"
import type { Language, MediaItem } from "@/lib/captcha/types"

interface Props {
  lang: Language
  onVerify: (success: boolean) => void
  onReload?: () => void
  difficulty?: number
}

interface PuzzlePiece {
  id: number
  correctRow: number
  correctCol: number
  currentRow: number
  currentCol: number
  isEmpty: boolean
}

type PuzzleMode = "slide" | "drag" | "swap"

const PUZZLE_IMAGES = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=400&fit=crop",
]

export function PuzzleChallenge({ lang, onVerify, onReload, difficulty = 5 }: Props) {
  const t = useCaptchaLang(lang)
  const fr = lang === "fr"
  const mediaLib = getMediaLibrary()

  const [mode, setMode] = React.useState<PuzzleMode>("slide")
  const [pieces, setPieces] = React.useState<PuzzlePiece[]>([])
  const [emptyPos, setEmptyPos] = React.useState({ row: 2, col: 2 })
  const [selectedPiece, setSelectedPiece] = React.useState<number | null>(null)
  const [error, setError] = React.useState(false)
  const [attempts, setAttempts] = React.useState(0)
  const [moves, setMoves] = React.useState(0)
  const [isComplete, setIsComplete] = React.useState(false)
  const [imageUrl, setImageUrl] = React.useState("")
  const [draggedPiece, setDraggedPiece] = React.useState<number | null>(null)
  const [timeElapsed, setTimeElapsed] = React.useState(0)
  const [showHint, setShowHint] = React.useState(false)

  const gridSize = difficulty > 7 ? 4 : difficulty > 4 ? 3 : 3
  const totalPieces = gridSize * gridSize

  React.useEffect(() => {
    const modes: PuzzleMode[] = ["slide", "drag", "swap"]
    const selectedMode = modes[Math.floor(Math.random() * modes.length)]
    setMode(selectedMode)
    generatePuzzle(selectedMode)
  }, [difficulty])

  React.useEffect(() => {
    if (isComplete) return
    const interval = setInterval(() => {
      setTimeElapsed((p) => p + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isComplete])

  function getPuzzleImage(): string {
    const allItems = mediaLib.getItems()
    if (allItems.length > 0) {
      const randomItem = allItems[Math.floor(Math.random() * allItems.length)]
      return randomItem.url
    }
    return PUZZLE_IMAGES[Math.floor(Math.random() * PUZZLE_IMAGES.length)]
  }

  function generatePuzzle(selectedMode: PuzzleMode) {
    const img = getPuzzleImage()
    setImageUrl(img)
    setMoves(0)
    setTimeElapsed(0)
    setError(false)
    setIsComplete(false)
    setSelectedPiece(null)
    setDraggedPiece(null)
    setShowHint(false)

    const newPieces: PuzzlePiece[] = []
    let id = 0

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const isLast = row === gridSize - 1 && col === gridSize - 1
        newPieces.push({
          id: id++,
          correctRow: row,
          correctCol: col,
          currentRow: row,
          currentCol: col,
          isEmpty: isLast,
        })
      }
    }

    const shuffled = shufflePuzzle(newPieces, selectedMode, difficulty)
    setPieces(shuffled)

    const empty = shuffled.find((p) => p.isEmpty)
    if (empty) setEmptyPos({ row: empty.currentRow, col: empty.currentCol })
  }

  function shufflePuzzle(initial: PuzzlePiece[], puzzleMode: PuzzleMode, diff: number): PuzzlePiece[] {
    const result = initial.map((p) => ({ ...p }))
    const shuffleCount = Math.max(20, diff * 8)

    for (let i = 0; i < shuffleCount; i++) {
      const empty = result.find((p) => p.isEmpty)!
      const neighbors = result.filter((p) => {
        if (p.isEmpty) return false
        const rowDiff = Math.abs(p.currentRow - empty.currentRow)
        const colDiff = Math.abs(p.currentCol - empty.currentCol)
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)
      })

      if (neighbors.length === 0) break
      const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)]

      const tempRow = empty.currentRow
      const tempCol = empty.currentCol
      empty.currentRow = randomNeighbor.currentRow
      empty.currentCol = randomNeighbor.currentCol
      randomNeighbor.currentRow = tempRow
      randomNeighbor.currentCol = tempCol
    }

    return result
  }

  function isAdjacent(piece: PuzzlePiece, empty: PuzzlePiece): boolean {
    const rowDiff = Math.abs(piece.currentRow - empty.currentRow)
    const colDiff = Math.abs(piece.currentCol - empty.currentCol)
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)
  }

  function handlePieceClick(pieceId: number) {
    if (isComplete) return

    const piece = pieces.find((p) => p.id === pieceId)
    const empty = pieces.find((p) => p.isEmpty)
    if (!piece || !empty || piece.isEmpty) return

    if (mode === "swap") {
      if (selectedPiece === null) {
        setSelectedPiece(pieceId)
        return
      }

      if (selectedPiece === pieceId) {
        setSelectedPiece(null)
        return
      }

      const selectedPieceData = pieces.find((p) => p.id === selectedPiece)
      if (!selectedPieceData || selectedPieceData.isEmpty) {
        setSelectedPiece(null)
        return
      }

      const newPieces = pieces.map((p) => {
        if (p.id === selectedPiece) {
          return { ...p, currentRow: piece.currentRow, currentCol: piece.currentCol }
        }
        if (p.id === pieceId) {
          return { ...p, currentRow: selectedPieceData.currentRow, currentCol: selectedPieceData.currentCol }
        }
        return p
      })

      setPieces(newPieces)
      setSelectedPiece(null)
      setMoves((p) => p + 1)
      setError(false)
      checkCompletion(newPieces)
    } else {
      if (isAdjacent(piece, empty)) {
        const newPieces = pieces.map((p) => {
          if (p.id === pieceId) {
            return { ...p, currentRow: empty.currentRow, currentCol: empty.currentCol }
          }
          if (p.isEmpty) {
            return { ...p, currentRow: piece.currentRow, currentCol: piece.currentCol }
          }
          return p
        })

        setPieces(newPieces)
        setEmptyPos({ row: piece.currentRow, col: piece.currentCol })
        setMoves((p) => p + 1)
        setError(false)
        checkCompletion(newPieces)
      }
    }
  }

  function handleDragStart(pieceId: number) {
    setDraggedPiece(pieceId)
  }

  function handleDragOver(e: React.DragEvent, targetId: number) {
    e.preventDefault()
  }

  function handleDrop(targetId: number) {
    if (draggedPiece === null || isComplete) return

    const dragged = pieces.find((p) => p.id === draggedPiece)
    const target = pieces.find((p) => p.id === targetId)
    if (!dragged || !target || dragged.isEmpty || target.isEmpty) {
      setDraggedPiece(null)
      return
    }

    const empty = pieces.find((p) => p.isEmpty)!
    const isDraggedAdjacent = isAdjacent(dragged, empty)
    const isTargetAdjacent = isAdjacent(target, empty)

    if (isDraggedAdjacent && (targetId === empty.id || isTargetAdjacent)) {
      const newPieces = pieces.map((p) => {
        if (p.id === draggedPiece) {
          return { ...p, currentRow: target.currentRow, currentCol: target.currentCol }
        }
        if (p.id === targetId && !p.isEmpty) {
          return { ...p, currentRow: dragged.currentRow, currentCol: dragged.currentCol }
        }
        return p
      })

      setPieces(newPieces)
      setMoves((p) => p + 1)
      setError(false)
      checkCompletion(newPieces)
    }

    setDraggedPiece(null)
  }

  function checkCompletion(currentPieces: PuzzlePiece[]) {
    const solved = currentPieces.every((p) => {
      if (p.isEmpty) return true
      return p.currentRow === p.correctRow && p.currentCol === p.correctCol
    })

    if (solved) {
      setIsComplete(true)
      setTimeout(() => onVerify(true), 800)
    }
  }

  function handleVerify() {
    if (isComplete) {
      onVerify(true)
    } else {
      handleFail()
    }
  }

  function handleFail() {
    const newCount = attempts + 1
    setAttempts(newCount)
    if (newCount >= 3) { onVerify(false); return }
    setError(true)
  }

  function handleReload() {
    const modes: PuzzleMode[] = ["slide", "drag", "swap"]
    const newMode = modes[Math.floor(Math.random() * modes.length)]
    setMode(newMode)
    generatePuzzle(newMode)
    onReload?.()
  }

  function getPieceStyle(piece: PuzzlePiece) {
    const pieceSize = 100 / gridSize
    return {
      width: `${pieceSize}%`,
      height: `${pieceSize}%`,
      position: "absolute" as const,
      left: `${piece.currentCol * pieceSize}%`,
      top: `${piece.currentRow * pieceSize}%`,
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: `${gridSize * 100}%`,
      backgroundPosition: `${(piece.correctCol / (gridSize - 1)) * 100}% ${(piece.correctRow / (gridSize - 1)) * 100}%`,
      transition: "all 0.2s ease-out",
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="mb-3 flex items-center gap-2.5 border-b border-border/50 pb-2.5">
        <div className="flex size-7 items-center justify-center rounded bg-gradient-to-br from-warning/20 to-warning/5">
          <Puzzle className="size-3.5 text-warning" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("challenge.puzzle.title")}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/60">SaveMali</span>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          {mode === "slide"
            ? (fr ? "Glissez les pièces pour reconstituer l'image" : "Slide pieces to complete the puzzle")
            : mode === "drag"
              ? (fr ? "Glissez-déposez les pièces au bon endroit" : "Drag and drop pieces to the right spot")
              : (fr ? "Cliquez deux pièces pour les intervertir" : "Click two pieces to swap them")}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-mono">{formatTime(timeElapsed)}</span>
          <span>•</span>
          <span>{moves} {fr ? "coups" : "moves"}</span>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive border border-destructive/20">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{t("error.incorrect")} ({3 - attempts} {t("attempts.remaining")})</span>
        </div>
      )}

      {isComplete && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-success/5 px-3 py-2 text-xs text-success border border-success/20">
          <CheckCircle2 className="size-3.5 shrink-0" />
          <span>{fr ? "Puzzle résolu !" : "Puzzle solved!"}</span>
        </div>
      )}

      <div className="mb-3 relative mx-auto overflow-hidden rounded-xl border-2 border-border/60 bg-muted/20" style={{ aspectRatio: "1" }}>
        {imageUrl && (
          <>
            <div
              className="absolute inset-0 opacity-20 blur-sm"
              style={{
                backgroundImage: `url(${imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            {showHint && (
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}
          </>
        )}

        {pieces
          .sort((a, b) => {
            if (a.isEmpty) return 1
            if (b.isEmpty) return -1
            return 0
          })
          .map((piece) => {
            if (piece.isEmpty) {
              return (
                <div
                  key={piece.id}
                  className="absolute border border-dashed border-muted-foreground/20 bg-muted/10"
                  style={{
                    width: `${100 / gridSize}%`,
                    height: `${100 / gridSize}%`,
                    left: `${piece.currentCol * (100 / gridSize)}%`,
                    top: `${piece.currentRow * (100 / gridSize)}%`,
                  }}
                />
              )
            }

            const isSelected = selectedPiece === piece.id
            const canMove = mode !== "swap" && isAdjacent(piece, pieces.find((p) => p.isEmpty)!)

            return (
              <div
                key={piece.id}
                draggable={mode === "drag"}
                onDragStart={() => handleDragStart(piece.id)}
                onDragOver={(e) => handleDragOver(e, piece.id)}
                onDrop={() => handleDrop(piece.id)}
                onClick={() => handlePieceClick(piece.id)}
                className={cn(
                  "absolute cursor-pointer border border-white/30 shadow-sm transition-all duration-200",
                  mode === "drag" && "cursor-grab active:cursor-grabbing",
                  isSelected && "ring-2 ring-warning ring-offset-1 z-10",
                  canMove && !isComplete && "hover:shadow-lg hover:z-20",
                  isComplete && "cursor-default"
                )}
                style={getPieceStyle(piece)}
              >
                <div className={cn(
                  "absolute inset-0 transition-opacity",
                  isSelected ? "opacity-0" : "opacity-100"
                )} />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-warning/20">
                    <Move className="size-4 text-warning" />
                  </div>
                )}
              </div>
            )
          })}
      </div>

      <div className="mb-3 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-muted/30 px-2 py-1">
          <span className="text-[10px] text-muted-foreground">
            {mode === "slide" ? (fr ? "Cliquez pour déplacer" : "Click to move")
              : mode === "drag" ? (fr ? "Glissez les pièces" : "Drag pieces")
                : (fr ? "Cliquez pour échanger" : "Click to swap")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowHint(!showHint)}
          className="flex items-center gap-1 rounded-full bg-muted/30 px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          {showHint ? (fr ? "Masquer l'indice" : "Hide hint") : (fr ? "Afficher l'indice" : "Show hint")}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleReload}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/30"
        >
          <RotateCw className="size-3" />
          {t("reload")}
        </button>
        <button
          type="button"
          onClick={handleVerify}
          disabled={moves === 0 && !isComplete}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-warning to-warning/80 px-5 py-1.5 text-xs font-semibold text-warning-foreground shadow-md shadow-warning/20 transition-all hover:shadow-lg active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t("verify")}
          <span className="text-[10px] opacity-70">→</span>
        </button>
      </div>
    </div>
  )
}
