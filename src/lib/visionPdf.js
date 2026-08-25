import jsPDF from 'jspdf'

// One-page PDF of the vision built on /plan, for someone who has not created an
// account yet.
//
// The point is not the file. It is that the quiz stops feeling like a lead form
// and starts feeling like it produced something — a thing you can print, keep,
// or hand to a doctor. Giving it away before signup is deliberate: the artifact
// is the proof, and the account is for having Summit actually run it.
//
// Follows the jsPDF pattern already used by the authenticated summary
// (src/components/steps/SummaryPage.jsx) rather than adding a second approach.

// summit-forest and summit-emerald, as RGB. Kept local rather than imported so
// this file has no dependency on the design system at build time.
const FOREST = [12, 44, 34]
const EMERALD = [16, 139, 94]
const GREY = [110, 110, 110]

export const downloadVisionPdf = ({
  visionParagraph,
  currentScore,
  timeCapacity,
  barriers = [],
  habitsToImprove = [],
  lifeContextLabel,
}) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 22
  const maxWidth = pageWidth - 2 * margin
  let y = 26

  const addText = (text, { size = 11, color = FOREST, lineGap = 1.6, after = 4 } = {}) => {
    doc.setFontSize(size)
    doc.setTextColor(...color)
    doc.splitTextToSize(text, maxWidth).forEach(line => {
      if (y > 270) {
        doc.addPage()
        y = 26
      }
      doc.text(line, margin, y)
      y += size * 0.5 * lineGap
    })
    y += after
  }

  const addLabel = (text) => {
    doc.setFontSize(9)
    doc.setTextColor(...EMERALD)
    doc.text(text.toUpperCase(), margin, y)
    y += 7
  }

  const addRow = (label, value) => {
    doc.setFontSize(10)
    doc.setTextColor(...GREY)
    doc.text(label, margin, y)
    doc.setTextColor(...FOREST)
    doc.text(String(value), margin + 55, y)
    y += 7
  }

  // Header
  doc.setFontSize(20)
  doc.setTextColor(...FOREST)
  doc.text('My Health Vision', margin, y)
  y += 8
  doc.setFontSize(9)
  doc.setTextColor(...GREY)
  doc.text(`Summit Health  ·  ${new Date().toLocaleDateString()}`, margin, y)
  y += 6
  doc.setDrawColor(...EMERALD)
  doc.setLineWidth(0.6)
  doc.line(margin, y, pageWidth - margin, y)
  y += 12

  if (visionParagraph) {
    addLabel('Where I am headed')
    addText(visionParagraph, { size: 13, lineGap: 1.7, after: 10 })
  }

  addLabel('Where I am starting')
  if (currentScore != null) addRow('Today', `${currentScore} out of 10`)
  if (timeCapacity) addRow('Time I can give', timeCapacity)
  if (barriers.length) addRow('In the way', barriers.join(', '))
  if (habitsToImprove.length) addRow('Worth working on', habitsToImprove.join(', '))
  if (lifeContextLabel) addRow('Right now', lifeContextLabel)
  y += 8

  addLabel('What comes next')
  addText(
    'One habit. Something small enough to survive a bad week. Pick it, run it for ' +
      'a week, and see what actually happens rather than what you hoped would.',
    { size: 11, after: 10 }
  )

  // Footer. Deliberately not a hard sell — the document should be useful on its
  // own, including to someone who never comes back.
  if (y > 250) {
    doc.addPage()
    y = 26
  }
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8
  doc.setFontSize(9)
  doc.setTextColor(...GREY)
  doc.text('Made with Summit Health  ·  summithealth.app', margin, y)
  y += 6
  doc.setFontSize(8)
  doc.text(
    'Summit offers lifestyle and habit coaching, not medical advice.',
    margin,
    y
  )

  doc.save(`my-health-vision-${new Date().toISOString().split('T')[0]}.pdf`)
}
