import * as jspdfNS from 'jspdf'

// jsPDF v3 exposes the constructor as a named export under Node and as the
// default under the browser bundler. Taking both means this module can be
// rendered and eyeballed in a script, not just in a browser.
const JsPDF = jspdfNS.jsPDF || jspdfNS.default

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
}) => {
  const doc = new JsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 22
  const maxWidth = pageWidth - 2 * margin
  let y = 26

  // jsPDF font sizes are points, y positions are millimetres. Converting between
  // them is the whole trick: 1pt = 0.3528mm. Multiplying the point size directly
  // by a factor (as an earlier version did) left lines roughly 75% too far apart,
  // which looked like a rendering fault rather than a spacing choice.
  const PT_TO_MM = 0.3528
  const addText = (text, { size = 11, color = FOREST, lineGap = 1.35, after = 4, bold = false } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lineHeight = size * PT_TO_MM * lineGap
    doc.splitTextToSize(text, maxWidth).forEach(line => {
      if (y > 270) {
        doc.addPage()
        y = 26
      }
      doc.text(line, margin, y)
      y += lineHeight
    })
    doc.setFont('helvetica', 'normal')
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

  // Header is a small eyebrow, not a title. The vision statement is the headline
  // of this document — it is the thing they made, and it should be the first
  // thing the eye lands on.
  doc.setFontSize(9)
  doc.setTextColor(...EMERALD)
  doc.text('MY HEALTH VISION', margin, y)
  y += 5
  doc.setFontSize(9)
  doc.setTextColor(...GREY)
  doc.text(`Summit Health  ·  ${new Date().toLocaleDateString()}`, margin, y)
  y += 6
  doc.setDrawColor(...EMERALD)
  doc.setLineWidth(0.6)
  doc.line(margin, y, pageWidth - margin, y)
  y += 14

  if (visionParagraph) {
    addText(visionParagraph, { size: 19, lineGap: 1.3, after: 14, bold: true })
  }

  addLabel('Where I am starting')
  if (currentScore != null) addRow('Today', `${currentScore} out of 10`)
  if (timeCapacity) addRow('Time I can give', timeCapacity)
  if (barriers.length) addRow('In the way', barriers.join(', '))
  if (habitsToImprove.length) addRow('Worth working on', habitsToImprove.join(', '))
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
