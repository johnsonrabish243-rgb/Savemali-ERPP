import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, Header, Footer, PageNumber, NumberFormat } from "docx"
import { saveAs } from "file-saver"
import * as XLSX from "xlsx"
import { formatCurrency } from "@/lib/currency"

export type ModuleType = "education" | "pharmacy" | "commerce" | "gestion" | "hr"

interface ReportSection {
  title: string
  titleEn: string
  headers: string[]
  rows: (string | number)[][]
}

export interface ReportData {
  workspaceName: string
  workspaceSettings: { label: string; value: string }[]
  moduleType: ModuleType
  sections: ReportSection[]
  stats: { label: string; labelEn: string; value: string | number }[]
  exporterName?: string
}

export const MODULE_LABELS: Record<ModuleType, { fr: string; en: string; color: string }> = {
  education: { fr: "Éducation", en: "Education", color: "#4f46e5" },
  pharmacy: { fr: "Pharmacie", en: "Pharmacy", color: "#059669" },
  commerce: { fr: "Commerce", en: "Commerce", color: "#ea580c" },
  gestion: { fr: "Gestion", en: "Management", color: "#7c3aed" },
  hr: { fr: "Ressources Humaines", en: "Human Resources", color: "#0284c7" },
}

function formatDate(date: Date, fr: boolean): string {
  return date.toLocaleDateString(fr ? "fr-FR" : "en-US", {
    year: "numeric", month: "long", day: "numeric",
  })
}

function formatTime(date: Date, fr: boolean): string {
  return date.toLocaleTimeString(fr ? "fr-FR" : "en-US", {
    hour: "2-digit", minute: "2-digit",
  })
}

// ═══════════════════════════════════════════
// PDF GENERATION
// ═══════════════════════════════════════════

export async function generatePDF(data: ReportData, fr = true): Promise<void> {
  const doc = new jsPDF()
  const now = new Date()
  const mod = MODULE_LABELS[data.moduleType]
  const pageWidth = doc.internal.pageSize.getWidth()
  const exporter = data.exporterName ?? "—"

  // ── Load logo ──
  let logoDataUrl: string | null = null
  try {
    const res = await fetch("/SaveMali_Logo.png")
    if (res.ok) {
      const blob = await res.blob()
      logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    }
  } catch {}

  // ── Header ──
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageWidth, 40, "F")

  // Logo image or text fallback
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", 14, 6, 22, 22) } catch {}
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text("ERP System", 14, 34)
  } else {
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont("helvetica", "bold")
    doc.text("Savemali", 14, 18)
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text("ERP System", 14, 24)
  }

  // Date/time
  doc.setFontSize(8)
  doc.text(`${formatDate(now, fr)} | ${formatTime(now, fr)}`, pageWidth - 14, 18, { align: "right" })

  // Module badge
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(pageWidth - 14 - 40, 22, 40, 10, 2, 2, "F")
  const rgb = hexToRgb(mod.color)
  doc.setTextColor(rgb.r, rgb.g, rgb.b)
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  doc.text(mod[fr ? "fr" : "en"], pageWidth - 14, 29, { align: "right" })

  // ── Title Page ──
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(24)
  doc.setFont("helvetica", "bold")
  const titleY = 60
  doc.text(data.workspaceName, pageWidth / 2, titleY, { align: "center" })

  doc.setFontSize(14)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text(
    fr ? `Rapport ${mod.fr}` : `${mod.en} Report`,
    pageWidth / 2,
    titleY + 10,
    { align: "center" }
  )

  doc.setFontSize(10)
  doc.text(
    fr ? `Généré le ${formatDate(now, fr)} à ${formatTime(now, fr)}` : `Generated on ${formatDate(now, fr)} at ${formatTime(now, fr)}`,
    pageWidth / 2,
    titleY + 18,
    { align: "center" }
  )

  // Exporter line
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(
    fr ? `Données exportées par ${exporter}` : `Data exported by ${exporter}`,
    pageWidth / 2,
    titleY + 26,
    { align: "center" }
  )

  // Divider
  doc.setDrawColor(200, 200, 200)
  doc.line(20, titleY + 32, pageWidth - 20, titleY + 32)

  // ── Stats Summary ──
  if (data.stats.length > 0) {
    let y = titleY + 35
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(15, 23, 42)
    doc.text(fr ? "Résumé" : "Summary", 14, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    data.stats.forEach((stat) => {
      doc.setTextColor(100, 116, 139)
      doc.text(`${stat[fr ? "label" : "labelEn"]}:`, 14, y)
      doc.setTextColor(15, 23, 42)
      doc.setFont("helvetica", "bold")
      doc.text(String(stat.value), 80, y)
      doc.setFont("helvetica", "normal")
      y += 7
    })
  }

  // ── Workspace Settings ──
  if (data.workspaceSettings.length > 0) {
    let y = titleY + 35 + (data.stats.length * 7) + 10
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(15, 23, 42)
    doc.text(fr ? "Paramètres du module" : "Module Settings", 14, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    data.workspaceSettings.forEach((s) => {
      doc.setTextColor(100, 116, 139)
      doc.text(`${s.label}:`, 14, y)
      doc.setTextColor(15, 23, 42)
      doc.setFont("helvetica", "bold")
      doc.text(s.value, 80, y)
      doc.setFont("helvetica", "normal")
      y += 7
    })
  }

  // ── Sections ──
  data.sections.forEach((section) => {
    doc.addPage()
    let y = 20

    // Section title with colored bar
    const secRgb = hexToRgb(mod.color)
    doc.setFillColor(secRgb.r, secRgb.g, secRgb.b)
    doc.rect(0, 0, pageWidth, 6, "F")

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(15, 23, 42)
    doc.text(section[fr ? "title" : "titleEn"] || section.title, 14, y + 10)
    y += 18

    if (section.rows.length === 0) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "italic")
      doc.setTextColor(148, 163, 184)
      doc.text(fr ? "Aucune donnée disponible" : "No data available", 14, y)
      return
    }

    autoTable(doc, {
      startY: y,
      head: [section.headers],
      body: section.rows.map(r => r.map(v => String(v ?? ""))),
      theme: "striped",
      headStyles: {
        fillColor: [secRgb.r, secRgb.g, secRgb.b],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
      styles: { cellPadding: 3 },
    })
  })

  // ── Footer on every page ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const h = doc.internal.pageSize.getHeight()
    doc.setFillColor(15, 23, 42)
    doc.rect(0, h - 20, pageWidth, 20, "F")
    doc.setFontSize(7)
    doc.setTextColor(200, 200, 200)
    doc.text(`© ${new Date().getFullYear()} Savemali. Tous droits réservés. | Développé par John Mocket`, 14, h - 10)
    doc.text(`Données exportées par ${exporter} — ${formatDate(now, fr)} ${formatTime(now, fr)}`, 14, h - 5)
    doc.setTextColor(148, 163, 184)
    doc.text(`${i}/${totalPages}`, pageWidth - 14, h - 10, { align: "right" })
  }

  const fileName = `Savemali_${mod.en}_${formatDate(now, false).replace(/\s/g, "_")}.pdf`
  doc.save(fileName)
}

// ═══════════════════════════════════════════
// DOCX GENERATION
// ═══════════════════════════════════════════

export async function generateDOCX(data: ReportData, fr = true): Promise<void> {
  const now = new Date()
  const mod = MODULE_LABELS[data.moduleType]
  const hex = mod.color.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const exporter = data.exporterName ?? "—"

  // ── Load logo ──
  let logoBase64: string | null = null
  let logoBuf: ArrayBuffer | null = null
  try {
    const res = await fetch("/SaveMali_Logo.png")
    if (res.ok) {
      logoBuf = await res.arrayBuffer()
      const bytes = new Uint8Array(logoBuf)
      let binary = ""
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      logoBase64 = btoa(binary)
    }
  } catch {}

  const children: (Paragraph | Table)[] = []

  // ── Logo ──
  if (logoBuf) {
    const { ImageRun } = await import("docx")
    children.push(
      new Paragraph({
        children: [new ImageRun({ data: logoBuf, transformation: { width: 60, height: 60 }, type: "png" })],
        spacing: { after: 100 },
      })
    )
  }

  // ── Title ──
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Savemali", bold: true, size: 48, color: "0F172A", font: "Calibri" }),
      ],
      spacing: { after: 100 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: data.workspaceName, bold: true, size: 32, color: "0F172A", font: "Calibri" }),
      ],
      spacing: { after: 100 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: fr ? `Rapport ${mod.fr}` : `${mod.en} Report`,
          size: 24, color: "64748B", font: "Calibri",
        }),
      ],
      spacing: { after: 100 },
    })
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: fr ? `Généré le ${formatDate(now, fr)} à ${formatTime(now, fr)}` : `Generated on ${formatDate(now, fr)} at ${formatTime(now, fr)}`,
          size: 20, color: "94A3B8", font: "Calibri", italics: true,
        }),
      ],
      spacing: { after: 50 },
    })
  )

  // Exporter line
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: fr ? `Données exportées par ${exporter}` : `Data exported by ${exporter}`,
          size: 20, color: "64748B", font: "Calibri", bold: true,
        }),
      ],
      spacing: { after: 200 },
    })
  )

  // Divider
  children.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "E2E8F0" } },
      spacing: { after: 300 },
    })
  )

  // ── Stats ──
  if (data.stats.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: fr ? "Résumé" : "Summary", bold: true, size: 26, color: "0F172A", font: "Calibri" }),
        ],
        spacing: { after: 200 },
      })
    )

    const statRows = data.stats.map(
      (s) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: s[fr ? "label" : "labelEn"], size: 20, color: "64748B", font: "Calibri" })] })],
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: String(s.value), bold: true, size: 20, color: "0F172A", font: "Calibri" })] })],
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
          ],
        })
    )

    children.push(
      new Table({
        rows: statRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    )

    children.push(new Paragraph({ spacing: { after: 300 } }))
  }

  // ── Workspace Settings ──
  if (data.workspaceSettings.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: fr ? "Paramètres du module" : "Module Settings", bold: true, size: 26, color: "0F172A", font: "Calibri" }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      })
    )

    const settingsRows = data.workspaceSettings.map(
      (s) =>
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: s.label, size: 20, color: "64748B", font: "Calibri" })] })],
              width: { size: 40, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: s.value, bold: true, size: 20, color: "0F172A", font: "Calibri" })] })],
              width: { size: 60, type: WidthType.PERCENTAGE },
            }),
          ],
        })
    )

    children.push(
      new Table({
        rows: settingsRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    )

    children.push(new Paragraph({ spacing: { after: 300 } }))
  }

  // ── Sections ──
  for (const section of data.sections) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: section[fr ? "title" : "titleEn"] || section.title, bold: true, size: 26, color: "0F172A", font: "Calibri" }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      })
    )

    if (section.rows.length === 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: fr ? "Aucune donnée disponible" : "No data available", italics: true, size: 20, color: "94A3B8", font: "Calibri" }),
          ],
          spacing: { after: 200 },
        })
      )
      continue
    }

    // Table header row
    const headerRow = new TableRow({
      tableHeader: true,
      children: section.headers.map(
        (h) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: "FFFFFF", font: "Calibri" })] })],
            shading: { fill: hex.toUpperCase() },
            width: { size: Math.floor(100 / section.headers.length), type: WidthType.PERCENTAGE },
          })
      ),
    })

    const dataRows = section.rows.map(
      (row) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: String(cell ?? ""), size: 18, color: "1E293B", font: "Calibri" })] })],
                width: { size: Math.floor(100 / section.headers.length), type: WidthType.PERCENTAGE },
              })
          ),
        })
    )

    children.push(
      new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    )

    children.push(new Paragraph({ spacing: { after: 200 } }))
  }

  // ── Copyright Footer ──
  children.push(
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: "E2E8F0" } },
      spacing: { before: 400, after: 100 },
    })
  )
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `© ${new Date().getFullYear()} Savemali. Tous droits réservés. | Développé par John Mocket`, size: 16, color: "94A3B8", font: "Calibri" }),
      ],
      alignment: AlignmentType.CENTER,
    })
  )
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: fr ? `Données exportées par ${exporter} — ${formatDate(now, fr)} ${formatTime(now, fr)}` : `Data exported by ${exporter} — ${formatDate(now, fr)} ${formatTime(now, fr)}`,
          size: 16, color: "94A3B8", font: "Calibri", italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  )

  const doc = new Document({
    creator: "Savemali ERP",
    title: `${mod[fr ? "fr" : "en"]} Report - ${data.workspaceName}`,
    description: fr ? `Rapport généré automatiquement` : `Auto-generated report`,
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Savemali", bold: true, size: 18, color: "0F172A", font: "Calibri" }),
                  new TextRun({ text: ` | ${mod[fr ? "fr" : "en"]}`, size: 18, color: "64748B", font: "Calibri" }),
                  new TextRun({ text: ` | ${exporter}`, size: 16, color: "94A3B8", font: "Calibri" }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `© ${new Date().getFullYear()} Savemali | Développé par John Mocket`, size: 14, color: "94A3B8", font: "Calibri" }),
                  new TextRun({ text: "    " }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "94A3B8", font: "Calibri" }),
                  new TextRun({ text: " / ", size: 14, color: "94A3B8", font: "Calibri" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: "94A3B8", font: "Calibri" }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const fileName = `Savemali_${mod.en}_${formatDate(now, false).replace(/\s/g, "_")}.docx`
  saveAs(blob, fileName)
}

// ═══════════════════════════════════════════
// XLSX GENERATION
// ═══════════════════════════════════════════

function autoColWidths(rows: (string | number)[][], headers?: string[]): { wch: number }[] {
  if (!rows.length) return []
  const cols = headers ? headers.length : Math.max(...rows.map((r) => r.length))
  const widths: { wch: number }[] = []
  for (let c = 0; c < cols; c++) {
    let max = headers?.[c] ? String(headers[c]).length : 10
    for (const row of rows) {
      const val = row[c] != null ? String(row[c]) : ""
      if (val.length > max) max = val.length
    }
    widths.push({ wch: Math.min(Math.max(max + 2, 12), 50) })
  }
  return widths
}

function detectNumberFormat(val: string | number): string | undefined {
  if (typeof val === "number") return "#,##0.00"
  if (typeof val !== "string") return undefined
  const trimmed = val.trim()
  if (/^-?\d+[.,]\d{1,2}$/.test(trimmed)) return "#,##0.00"
  if (/^\d{1,3}([\s.]\d{3})*([.,]\d{1,2})?$/.test(trimmed)) return "#,##0.00"
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return "yyyy-mm-dd"
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return "dd/mm/yyyy"
  return undefined
}

function applyHeaderStyle(sheet: XLSX.WorkSheet, colCount: number, modColor: string) {
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    const cell = sheet[addr]
    if (cell) {
      cell.s = {
        font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: modColor.replace("#", "").toUpperCase() } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
      }
    }
  }
}

export function generateXLSX(data: ReportData, fr = true): void {
  const now = new Date()
  const mod = MODULE_LABELS[data.moduleType]
  const modColor = mod.color.replace("#", "").toUpperCase()
  const wb = XLSX.utils.book_new()

  // ── Summary sheet ──
  const summaryRows: (string | number)[][] = [
    [data.workspaceName],
    [fr ? `Rapport ${mod.fr}` : `${mod.en} Report`],
    [fr ? `Généré le ${formatDate(now, fr)} à ${formatTime(now, fr)}` : `Generated on ${formatDate(now, fr)} at ${formatTime(now, fr)}`],
    [fr ? `Exporté le ${formatDate(now, fr)}` : `Exported on ${formatDate(now, fr)}`],
    [],
    [fr ? "Résumé" : "Summary"],
  ]
  data.stats.forEach((s) => {
    const val = s.value
    summaryRows.push([s[fr ? "label" : "labelEn"], typeof val === "number" ? val : String(val)])
  })
  if (data.workspaceSettings.length > 0) {
    summaryRows.push([])
    summaryRows.push([fr ? "Paramètres du module" : "Module Settings"])
    data.workspaceSettings.forEach((s) => {
      summaryRows.push([s.label, s.value])
    })
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)

  // Style title row
  const titleCell = summarySheet["A1"]
  if (titleCell) {
    titleCell.s = { font: { bold: true, sz: 16, color: { rgb: modColor } } }
  }
  const subtitleCell = summarySheet["A2"]
  if (subtitleCell) {
    subtitleCell.s = { font: { bold: true, sz: 12 } }
  }
  const dateCell = summarySheet["A3"]
  if (dateCell) {
    dateCell.s = { font: { italic: true, sz: 10, color: { rgb: "666666" } } }
  }
  const exportDateCell = summarySheet["A4"]
  if (exportDateCell) {
    exportDateCell.s = { font: { italic: true, sz: 10, color: { rgb: "666666" } } }
  }

  summarySheet["!cols"] = [{ wch: 35 }, { wch: 45 }]
  summarySheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ]
  XLSX.utils.book_append_sheet(wb, summarySheet, fr ? "Résumé" : "Summary")

  // ── One sheet per section ──
  for (const section of data.sections) {
    const rawName = section[fr ? "title" : "titleEn"] || section.title
    const sheetName = rawName.substring(0, 31).replace(/[\\/*?\[\]:]/g, "_")
    const rows: (string | number)[][] = [section.headers, ...section.rows]
    const sheet = XLSX.utils.aoa_to_sheet(rows)

    // Apply header styling
    applyHeaderStyle(sheet, section.headers.length, modColor)

    // Detect number formats per column
    for (let c = 0; c < section.headers.length; c++) {
      let detectedFmt: string | undefined
      for (let r = 1; r < rows.length; r++) {
        const fmt = detectNumberFormat(rows[r][c])
        if (fmt) { detectedFmt = fmt; break }
      }
      if (detectedFmt) {
        for (let r = 1; r < rows.length; r++) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = sheet[addr]
          if (cell && typeof cell.v === "number") {
            cell.z = detectedFmt
          }
        }
      }
    }

    // Auto-size columns
    sheet["!cols"] = autoColWidths(rows.slice(1), section.headers)

    XLSX.utils.book_append_sheet(wb, sheet, sheetName)
  }

  const dateStr = formatDate(now, false).replace(/\s/g, "_")
  const fileName = `Savemali_${mod.en}_${dateStr}.xlsx`

  try {
    XLSX.writeFile(wb, fileName, { bookType: "xlsx" })
  } catch {
    // Fallback: write as blob and trigger download manually
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// ═══════════════════════════════════════════
// MODULE DATA BUILDERS
// ═══════════════════════════════════════════

type Ws = { name: string; type: string; country?: string; created_at?: string }

function buildWorkspaceSettings(workspace: Ws, fr: boolean) {
  return [
    { label: fr ? "Nom" : "Name", value: workspace.name },
    { label: fr ? "Type" : "Type", value: MODULE_LABELS[workspace.type as ModuleType]?.[fr ? "fr" : "en"] ?? workspace.type },
    { label: fr ? "Pays" : "Country", value: workspace.country ?? "RD Congo" },
    { label: fr ? "Créé le" : "Created", value: workspace.created_at ? new Date(workspace.created_at).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—" },
  ]
}

function buildTeamSection(members: any[], fr: boolean): ReportSection {
  return {
    title: "Équipe / Utilisateurs",
    titleEn: "Team / Users",
    headers: [fr ? "Nom" : "Name", "Email", fr ? "Rôle" : "Role", fr ? "Statut" : "Status", fr ? "Inscrit" : "Joined"],
    rows: members.map((m) => [
      m.display_name ?? m.email ?? "—",
      m.email ?? "—",
      m.role ?? "—",
      m.status ?? "—",
      m.invited_at ? new Date(m.invited_at).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—",
    ]),
  }
}

export function buildEducationReport(
  workspace: Ws,
  data: {
    students: any[]
    teachers: any[]
    classes: any[]
    attendance: any[]
    feePayments: any[]
    members: any[]
  },
  fr: boolean
): ReportData {
  const totalFees = data.feePayments.reduce((s, p) => s + Number(p.amount_usd ?? 0), 0)
  const todayStr = new Date().toISOString().slice(0, 10)
  const present = data.attendance.filter((a) => a.status === "present" && a.date === todayStr).length
  const absent = data.attendance.filter((a) => a.status === "absent" && a.date === todayStr).length
  const late = data.attendance.filter((a) => a.status === "late" && a.date === todayStr).length
  const totalAttendance = data.attendance.length
  const presentAllTime = data.attendance.filter((a) => a.status === "present").length
  const attendanceRate = totalAttendance > 0 ? Math.round((presentAllTime / totalAttendance) * 100) : 0
  const totalFeesDue = data.classes.reduce((s, c) => s + (Number(c.fees_usd ?? 0) * (data.students.filter((st) => st.class_name === c.name).length)), 0)
  const feesBalance = totalFeesDue - totalFees

  return {
    workspaceName: workspace.name,
    workspaceSettings: buildWorkspaceSettings(workspace, fr),
    moduleType: "education",
    stats: [
      { label: "Élèves", labelEn: "Students", value: data.students.length },
      { label: "Enseignants", labelEn: "Teachers", value: data.teachers.length },
      { label: "Classes", labelEn: "Classes", value: data.classes.length },
      { label: fr ? "Taux de présence" : "Attendance rate", labelEn: "Attendance rate", value: `${attendanceRate}%` },
      { label: fr ? "Présents / Absents" : "Present / Absent", labelEn: "Present / Absent", value: `${present} / ${absent}` },
      { label: fr ? "Frais dus" : "Fees due", labelEn: "Fees due", value: formatCurrency(totalFeesDue) },
      { label: "Frais collectés", labelEn: "Fees collected", value: formatCurrency(totalFees) },
      { label: fr ? "Balance frais" : "Fees balance", labelEn: "Fees balance", value: formatCurrency(feesBalance) },
      { label: "Membres équipe", labelEn: "Team members", value: data.members.length },
    ],
    sections: [
      buildTeamSection(data.members, fr),
      {
        title: "Élèves",
        titleEn: "Students",
        headers: ["Nom", "Classe", "Genre", "Parent Tél.", "Statut"],
        rows: data.students.map((s) => [
          `${s.first_name} ${s.last_name}`,
          s.class_name ?? "—",
          s.gender ?? "—",
          s.parent_phone ?? "—",
          s.status ?? "Actif",
        ]),
      },
      {
        title: "Enseignants",
        titleEn: "Teachers",
        headers: ["Nom", "Matière", "Tél.", "Email", "Salaire"],
        rows: data.teachers.map((t) => [
          `${t.first_name} ${t.last_name}`,
          t.subject ?? "—",
          t.phone ?? "—",
          t.email ?? "—",
          t.salary_usd ? formatCurrency(Number(t.salary_usd)) : "—",
        ]),
      },
      {
        title: "Classes",
        titleEn: "Classes",
        headers: ["Nom", "Niveau", "Frais", "Statut"],
        rows: data.classes.map((c) => [
          c.name ?? "—",
          c.level ?? "—",
          c.fees_usd ? formatCurrency(Number(c.fees_usd)) : "—",
          c.status ?? "—",
        ]),
      },
      {
        title: "Paiements",
        titleEn: "Payments",
        headers: ["Élève", "Montant", "Description", "Date"],
        rows: data.feePayments.map((p) => {
          const student = data.students.find((s) => s.id === p.student_id)
          return [
            student ? `${student.first_name} ${student.last_name}` : "—",
            `${formatCurrency(Number(p.amount_usd ?? 0))}`,
            p.description ?? "—",
            p.paid_at ? new Date(p.paid_at).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—",
          ]
        }),
      },
      {
        title: fr ? "Résumé des présences" : "Attendance Summary",
        titleEn: "Attendance Summary",
        headers: [fr ? "Date" : "Date", fr ? "Présents" : "Present", fr ? "Absents" : "Absent", fr ? "Retards" : "Late", fr ? "Total" : "Total"],
        rows: (() => {
          const byDate: Record<string, { present: number; absent: number; late: number }> = {}
          data.attendance.forEach((a) => {
            if (!a.date) return
            if (!byDate[a.date]) byDate[a.date] = { present: 0, absent: 0, late: 0 }
            if (a.status === "present") byDate[a.date].present++
            else if (a.status === "absent") byDate[a.date].absent++
            else if (a.status === "late") byDate[a.date].late++
          })
          return Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 30).map(([date, counts]) => [
            new Date(date).toLocaleDateString(fr ? "fr-FR" : "en-US"),
            String(counts.present),
            String(counts.absent),
            String(counts.late),
            String(counts.present + counts.absent + counts.late),
          ])
        })(),
      },
    ],
  }
}

export function buildPharmacyReport(
  workspace: Ws,
  data: {
    medicines: any[]
    sales: any[]
    orders: any[]
    members: any[]
  },
  fr: boolean
): ReportData {
  const totalRevenue = data.sales.reduce((s, sl) => s + Number(sl.total_usd ?? 0), 0)
  const lowStock = data.medicines.filter((m) => (m.stock_quantity ?? 0) <= (m.min_stock_alert ?? 5)).length
  const totalStockValue = data.medicines.reduce((s, m) => s + (Number(m.price_usd ?? 0) * Number(m.stock_quantity ?? 0)), 0)
  const expiringCount = data.medicines.filter((m) => {
    if (!m.expiry_date) return false
    const daysLeft = (new Date(m.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return daysLeft > 0 && daysLeft <= 90
  }).length
  const totalOrders = data.orders.reduce((s, o) => s + Number(o.total_cost ?? 0), 0)

  return {
    workspaceName: workspace.name,
    workspaceSettings: buildWorkspaceSettings(workspace, fr),
    moduleType: "pharmacy",
    stats: [
      { label: "Médicaments", labelEn: "Medicines", value: data.medicines.length },
      { label: "Stock faible", labelEn: "Low stock", value: lowStock },
      { label: fr ? "Expire bientôt" : "Expiring soon", labelEn: "Expiring soon", value: expiringCount },
      { label: fr ? "Valorisation stock" : "Stock value", labelEn: "Stock value", value: formatCurrency(totalStockValue) },
      { label: "Ventes", labelEn: "Sales", value: data.sales.length },
      { label: "Revenu total", labelEn: "Total revenue", value: formatCurrency(totalRevenue) },
      { label: fr ? "Achats fournisseur" : "Supplier purchases", labelEn: "Supplier purchases", value: formatCurrency(totalOrders) },
      { label: "Membres équipe", labelEn: "Team members", value: data.members.length },
    ],
    sections: [
      buildTeamSection(data.members, fr),
      {
        title: fr ? "État des stocks" : "Stock Status",
        titleEn: "Stock Status",
        headers: ["Nom", "Catégorie", fr ? "Prix unit." : "Unit price", "Stock", fr ? "Alerte min." : "Min alert", fr ? "Valorisation" : "Valuation"],
        rows: data.medicines.map((m) => [
          m.name ?? "—",
          m.category ?? "—",
          `${formatCurrency(Number(m.price_usd ?? 0))}`,
          m.stock_quantity ?? 0,
          m.min_stock_alert ?? "—",
          `${formatCurrency(Number(m.price_usd ?? 0) * Number(m.stock_quantity ?? 0))}`,
        ]),
      },
      {
        title: "Ventes",
        titleEn: "Sales",
        headers: ["Montant", "Paiement", "Statut", "Date"],
        rows: data.sales.map((s) => [
          `${formatCurrency(Number(s.total_usd ?? 0))}`,
          s.payment_method ?? "—",
          s.status ?? "—",
          s.sold_at ? new Date(s.sold_at).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—",
        ]),
      },
      {
        title: "Commandes fournisseur",
        titleEn: "Supplier Orders",
        headers: ["Fournisseur", "Coût total", "Statut", "Date"],
        rows: data.orders.map((o) => [
          o.supplier_name ?? "—",
          `${formatCurrency(Number(o.total_cost ?? 0))}`,
          o.status ?? "—",
          o.ordered_at ? new Date(o.ordered_at).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—",
        ]),
      },
    ],
  }
}

export function buildCommerceReport(
  workspace: Ws,
  data: {
    products: any[]
    customers: any[]
    sales: any[]
    invoices: any[]
    members: any[]
  },
  fr: boolean
): ReportData {
  const totalRevenue = data.sales.reduce((s, sl) => s + Number(sl.total_usd ?? 0), 0)
  const pending = data.invoices.filter((i) => i.status === "draft" || i.status === "pending").length
  const totalStockValue = data.products.reduce((s, p) => s + (Number(p.price_usd ?? 0) * Number(p.stock_quantity ?? 0)), 0)
  const lowStockCount = data.products.filter((p) => (p.stock_quantity ?? 0) <= 5).length
  const totalInvoiced = data.invoices.reduce((s, i) => s + Number(i.total_usd ?? 0), 0)
  const paidInvoices = data.invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total_usd ?? 0), 0)

  return {
    workspaceName: workspace.name,
    workspaceSettings: buildWorkspaceSettings(workspace, fr),
    moduleType: "commerce",
    stats: [
      { label: "Produits", labelEn: "Products", value: data.products.length },
      { label: fr ? "Stock faible" : "Low stock", labelEn: "Low stock", value: lowStockCount },
      { label: fr ? "Valorisation stock" : "Stock value", labelEn: "Stock value", value: formatCurrency(totalStockValue) },
      { label: "Clients", labelEn: "Customers", value: data.customers.length },
      { label: "Ventes", labelEn: "Sales", value: data.sales.length },
      { label: "Revenu total", labelEn: "Total revenue", value: formatCurrency(totalRevenue) },
      { label: fr ? "Factures émises" : "Invoiced", labelEn: "Invoiced", value: formatCurrency(totalInvoiced) },
      { label: fr ? "Factures encaissées" : "Collected", labelEn: "Collected", value: formatCurrency(paidInvoices) },
      { label: "Membres équipe", labelEn: "Team members", value: data.members.length },
    ],
    sections: [
      buildTeamSection(data.members, fr),
      {
        title: "Produits",
        titleEn: "Products",
        headers: ["Nom", "Catégorie", "Prix", "Stock"],
        rows: data.products.map((p) => [
          p.name ?? "—",
          p.category ?? "—",
          `${formatCurrency(Number(p.price_usd ?? 0))}`,
          p.stock_quantity ?? 0,
        ]),
      },
      {
        title: "Clients",
        titleEn: "Customers",
        headers: ["Nom", "Tél.", "Email", "Total achat"],
        rows: data.customers.map((c) => [
          c.name ?? "—",
          c.phone ?? "—",
          c.email ?? "—",
          `${formatCurrency(Number(c.total_spent ?? 0))}`,
        ]),
      },
      {
        title: "Ventes",
        titleEn: "Sales",
        headers: ["Montant", "Paiement", "Statut", "Date"],
        rows: data.sales.map((s) => [
          `${formatCurrency(Number(s.total_usd ?? 0))}`,
          s.payment_method ?? "—",
          s.status ?? "—",
          s.sold_at ? new Date(s.sold_at).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—",
        ]),
      },
      {
        title: "Factures",
        titleEn: "Invoices",
        headers: ["N° Facture", "Client", "Montant", "Statut", "Échéance"],
        rows: data.invoices.map((inv) => {
          const customer = data.customers.find((c) => c.id === inv.customer_id)
          return [
            inv.invoice_number ?? "—",
            customer?.name ?? "—",
            `${formatCurrency(Number(inv.total_usd ?? 0))}`,
            inv.status ?? "—",
            inv.due_date ? new Date(inv.due_date).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—",
          ]
        }),
      },
    ],
  }
}

export function buildGestionReport(
  workspace: Ws,
  data: {
    employees: any[]
    accounting: any[]
    members: any[]
  },
  fr: boolean
): ReportData {
  const totalIncome = data.accounting.filter((e) => e.type === "income").reduce((s, e) => s + Number(e.amount_usd ?? 0), 0)
  const totalExpenses = data.accounting.filter((e) => e.type === "expense").reduce((s, e) => s + Number(e.amount_usd ?? 0), 0)
  const activeEmployees = data.employees.filter((e) => e.status === "active")
  const fixedPayroll = activeEmployees.filter((e) => e.salary_type !== "percentage" && e.salary_type !== "pourcentage").reduce((s, e) => s + Number(e.salary_usd ?? 0), 0)
  const pctPayroll = activeEmployees.filter((e) => e.salary_type === "percentage" || e.salary_type === "pourcentage").reduce((s, e) => s + (totalIncome * (Number(e.salary_percentage ?? 0)) / 100), 0)
  const totalPayroll = fixedPayroll + pctPayroll

  const incomeByCategory: Record<string, number> = {}
  const expenseByCategory: Record<string, number> = {}
  data.accounting.forEach((e) => {
    const cat = e.category || (fr ? "Non catégorisé" : "Uncategorized")
    if (e.type === "income") incomeByCategory[cat] = (incomeByCategory[cat] || 0) + Number(e.amount_usd ?? 0)
    else expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(e.amount_usd ?? 0)
  })

  return {
    workspaceName: workspace.name,
    workspaceSettings: buildWorkspaceSettings(workspace, fr),
    moduleType: "gestion",
    stats: [
      { label: "Employés", labelEn: "Employees", value: data.employees.length },
      { label: "Actifs", labelEn: "Active", value: activeEmployees.length },
      { label: "Revenus", labelEn: "Income", value: formatCurrency(totalIncome) },
      { label: "Dépenses", labelEn: "Expenses", value: formatCurrency(totalExpenses) },
      { label: "Profit net", labelEn: "Net profit", value: formatCurrency(totalIncome - totalExpenses) },
      { label: "Coût salarial", labelEn: "Payroll cost", value: formatCurrency(totalPayroll) },
      { label: "Résultat", labelEn: "Result", value: formatCurrency(totalIncome - totalExpenses - totalPayroll) },
      { label: "Membres équipe", labelEn: "Team members", value: data.members.length },
    ],
    sections: [
      buildTeamSection(data.members, fr),
      {
        title: fr ? "État des résultats" : "Income Statement",
        titleEn: "Income Statement",
        headers: [fr ? "Rubrique" : "Item", fr ? "Montant" : "Amount"],
        rows: [
          [fr ? "Produits (Revenus)" : "Revenue", formatCurrency(totalIncome)],
          ...Object.entries(incomeByCategory).map(([cat, amt]) => [`  ${cat}`, formatCurrency(amt)]),
          [fr ? "Charges (Dépenses)" : "Expenses", formatCurrency(totalExpenses)],
          ...Object.entries(expenseByCategory).map(([cat, amt]) => [`  ${cat}`, formatCurrency(amt)]),
          [fr ? "Résultat brut" : "Gross result", formatCurrency(totalIncome - totalExpenses)],
          [fr ? "Charges salariales" : "Payroll charges", formatCurrency(totalPayroll)],
          [fr ? "Résultat net" : "Net result", formatCurrency(totalIncome - totalExpenses - totalPayroll)],
        ],
      },
      {
        title: fr ? "Journal des opérations" : "Operations Journal",
        titleEn: "Operations Journal",
        headers: ["Date", fr ? "Réf." : "Ref.", fr ? "Journal" : "Journal", fr ? "Compte" : "Account", fr ? "Description" : "Description", fr ? "Débit" : "Debit", fr ? "Crédit" : "Credit"],
        rows: data.accounting.map((e) => [
          e.entry_date ? new Date(e.entry_date).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—",
          e.reference_number ?? "—",
          e.journal_code ?? "—",
          e.account_code ?? "—",
          e.description ?? "—",
          e.type === "expense" ? formatCurrency(Number(e.amount_usd ?? 0)) : "—",
          e.type === "income" ? formatCurrency(Number(e.amount_usd ?? 0)) : "—",
        ]),
      },
      {
        title: "Employés",
        titleEn: "Employees",
        headers: ["Nom", "Rôle", "Départ.", "Salaire", "Tél.", "Statut"],
        rows: data.employees.map((e) => [
          `${e.first_name} ${e.last_name}`,
          e.role ?? "—",
          e.department ?? "—",
          (e.salary_type === "percentage" || e.salary_type === "pourcentage")
            ? `${e.salary_percentage ?? 0}%`
            : (e.salary_usd ? formatCurrency(Number(e.salary_usd)) : "—"),
          e.phone ?? "—",
          e.status ?? "—",
        ]),
      },
      {
        title: "Entrées comptables",
        titleEn: "Accounting Entries",
        headers: ["Date", fr ? "Compte" : "Account", fr ? "Réf." : "Ref.", "Type", "Catégorie", "Description", "Montant"],
        rows: data.accounting.map((e) => [
          e.entry_date ? new Date(e.entry_date).toLocaleDateString(fr ? "fr-FR" : "en-US") : "—",
          e.account_code ?? "—",
          e.reference_number ?? "—",
          e.type === "income" ? (fr ? "Recette" : "Income") : (fr ? "Charge" : "Expense"),
          e.category ?? "—",
          e.description ?? "—",
          `${formatCurrency(Number(e.amount_usd ?? 0))}`,
        ]),
      },
    ],
  }
}

export function buildHRReport(
  workspace: Ws,
  data: {
    employees: any[]
    departments: any[]
    contracts: any[]
    leaves: any[]
    members: any[]
    payslips?: any[]
    paymentTransactions?: any[]
    payrollPeriods?: any[]
  },
  fr: boolean
): ReportData {
  const activeEmployees = data.employees.filter((e) => e.status === "active")
  const pendingLeaves = data.leaves.filter((l) => l.status === "pending")
  const activeContracts = data.contracts.filter((c) => c.status === "active")
  const totalPayroll = (data.payslips || []).filter((p) => p.status !== "cancelled").reduce((s, p) => s + Number(p.net_pay || 0), 0)
  const totalPaid = (data.payslips || []).filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.net_pay || 0), 0)
  const totalTransactions = (data.paymentTransactions || []).reduce((s, p) => s + Number(p.amount || 0), 0)

  const sections: ReportSection[] = [
    buildTeamSection(data.members, fr),
    {
      title: "Employés",
      titleEn: "Employees",
      headers: ["Nom", "Poste", "Départ.", "Salaire", "Tél.", "Statut"],
      rows: data.employees.map((e) => [
        `${e.first_name} ${e.last_name}`,
        e.position ?? "—",
        data.departments.find((d) => d.id === e.department_id)?.name ?? "—",
        e.salary ? formatCurrency(Number(e.salary)) : "—",
        e.phone ?? "—",
        e.status ?? "—",
      ]),
    },
    {
      title: "Départements",
      titleEn: "Departments",
      headers: ["Nom", "Description", "Responsable"],
      rows: data.departments.map((d) => [
        d.name,
        d.description ?? "—",
        data.employees.find((e) => e.id === d.manager_id)
          ? `${data.employees.find((e) => e.id === d.manager_id)?.first_name} ${data.employees.find((e) => e.id === d.manager_id)?.last_name}`
          : "—",
      ]),
    },
    {
      title: "Contrats",
      titleEn: "Contracts",
      headers: ["Employé", "Type", "Début", "Fin", "Salaire", "Statut"],
      rows: data.contracts.map((c) => {
        const emp = data.employees.find((e) => e.id === c.employee_id)
        return [
          emp ? `${emp.first_name} ${emp.last_name}` : "—",
          c.contract_type ?? "—",
          c.start_date ?? "—",
          c.end_date ?? "—",
          c.salary ? formatCurrency(Number(c.salary)) : "—",
          c.status ?? "—",
        ]
      }),
    },
    {
      title: "Demandes de congé",
      titleEn: "Leave Requests",
      headers: ["Employé", "Type", "Début", "Fin", "Statut"],
      rows: data.leaves.map((l) => {
        const emp = data.employees.find((e) => e.id === l.employee_id)
        return [
          emp ? `${emp.first_name} ${emp.last_name}` : "—",
          l.leave_type ?? "—",
          l.start_date ?? "—",
          l.end_date ?? "—",
          l.status ?? "—",
        ]
      }),
    },
  ]

  if (data.payslips && data.payslips.length > 0) {
    sections.push({
      title: "Bulletins de paie",
      titleEn: "Payslips",
      headers: ["Employé", "N° Bulletin", "Salaire base", "Net", "Statut"],
      rows: data.payslips.map((ps) => [
        `${ps.first_name || ""} ${ps.last_name || ""}`.trim() || "—",
        ps.payslip_number || "—",
        formatCurrency(Number(ps.base_salary || 0)),
        formatCurrency(Number(ps.net_pay || 0)),
        ps.status || "—",
      ]),
    })
  }

  if (data.paymentTransactions && data.paymentTransactions.length > 0) {
    sections.push({
      title: "Transactions de paiement",
      titleEn: "Payment Transactions",
      headers: ["Employé", "Montant", "Méthode", "Référence", "Statut", "Date"],
      rows: data.paymentTransactions.map((pt) => [
        `${pt.first_name || ""} ${pt.last_name || ""}`.trim() || "—",
        formatCurrency(Number(pt.amount || 0)),
        pt.payment_method || "—",
        pt.reference || "—",
        pt.status || "—",
        pt.processed_at ? new Date(pt.processed_at).toLocaleDateString() : "—",
      ]),
    })
  }

  return {
    workspaceName: workspace.name,
    workspaceSettings: buildWorkspaceSettings(workspace, fr),
    moduleType: "hr",
    stats: [
      { label: "Employés", labelEn: "Employees", value: data.employees.length },
      { label: "Actifs", labelEn: "Active", value: activeEmployees.length },
      { label: "Départements", labelEn: "Departments", value: data.departments.length },
      { label: "Contrats actifs", labelEn: "Active contracts", value: activeContracts.length },
      { label: "Congés en attente", labelEn: "Pending leaves", value: pendingLeaves.length },
      { label: "Masse salariale", labelEn: "Total payroll", value: formatCurrency(totalPayroll) },
      { label: "Payé", labelEn: "Paid", value: formatCurrency(totalPaid) },
      { label: "Transactions", labelEn: "Transactions", value: formatCurrency(totalTransactions) },
      { label: "Membres équipe", labelEn: "Team members", value: data.members.length },
    ],
    sections,
  }
}

// ═══════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════

function hexToRgb(hex: string) {
  const h = hex.replace("#", "")
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}
