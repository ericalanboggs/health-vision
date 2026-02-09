import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Terrain,
  Favorite,
  Map,
  Schedule,
  Edit,
  ArrowBack,
  FileDownload,
  Print,
  Save,
  Close,
} from '@mui/icons-material'
import jsPDF from 'jspdf'
import { saveJourney } from '../services/journeyService'
import { Card, Button } from '@summit/design-system'

const VisionDisplay = ({ formData: initialFormData }) => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState(initialFormData || {})
  const [editingSection, setEditingSection] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)

  // Headroom behavior for nav
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setHeaderVisible(false)
      } else {
        setHeaderVisible(true)
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Update local state when prop changes (after data loads)
  useEffect(() => {
    if (initialFormData) {
      setFormData(initialFormData)
    }
  }, [initialFormData])

  const isEmpty = (value) => {
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim() === ''
    return false
  }

  const isArrayEmpty = (arr) => {
    return !arr || arr.length === 0
  }

  const handleEditSection = (section) => {
    setEditingSection(section)
  }

  const handleCancelEdit = () => {
    setEditingSection(null)
    setFormData(initialFormData)
  }

  const handleSaveSection = async (section) => {
    setIsSaving(true)
    try {
      await saveJourney(formData, 'vision')
      setEditingSection(null)
    } catch (error) {
      console.error('Error saving vision:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleArrayItem = (field, item) => {
    setFormData(prev => {
      const currentArray = prev[field] || []
      const newArray = currentArray.includes(item)
        ? currentArray.filter(i => i !== item)
        : [...currentArray, item]
      return { ...prev, [field]: newArray }
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    const maxWidth = pageWidth - 2 * margin
    let yPosition = 20

    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('My Health Vision', margin, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, yPosition)
    yPosition += 15

    const addSection = (title, content, icon = '') => {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 20
      }

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(34, 139, 34)
      doc.text(`${icon} ${title}`, margin, yPosition)
      yPosition += 8

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0)
      
      if (typeof content === 'string') {
        const lines = doc.splitTextToSize(content, maxWidth)
        doc.text(lines, margin, yPosition)
        yPosition += lines.length * 6 + 8
      } else if (Array.isArray(content)) {
        content.forEach(item => {
          const lines = doc.splitTextToSize(`• ${item}`, maxWidth - 5)
          doc.text(lines, margin + 5, yPosition)
          yPosition += lines.length * 6 + 2
        })
        yPosition += 6
      }
    }

    if (!isEmpty(formData.visionStatement) || !isEmpty(formData.feelingState) || !isEmpty(formData.whyMatters)) {
      let visionText = ''
      if (!isEmpty(formData.visionStatement)) visionText += formData.visionStatement
      if (!isEmpty(formData.feelingState)) visionText += (visionText ? ' ' : '') + formData.feelingState
      if (!isEmpty(formData.appearanceConfidence)) visionText += (visionText ? ' ' : '') + formData.appearanceConfidence
      if (!isEmpty(formData.futureAbilities)) visionText += (visionText ? ' ' : '') + formData.futureAbilities
      if (!isEmpty(formData.whyMatters)) visionText += (visionText ? ' This matters because ' : '') + formData.whyMatters
      
      addSection('Health Summit', visionText, '🏔️')
    }

    if (!isArrayEmpty(formData.motivationDrivers)) {
      addSection('My Biggest Drivers', formData.motivationDrivers, '💪')
    }

    if (!isEmpty(formData.currentScore)) {
      addSection('Current Position', `${formData.currentScore} / 10`, '📊')
    }

    if (!isArrayEmpty(formData.barriers)) {
      addSection('Obstacles', formData.barriers, '🚧')
    }

    if (!isArrayEmpty(formData.habitsToImprove)) {
      addSection('Habits to Improve', formData.habitsToImprove, '🔧')
    }

    if (!isEmpty(formData.timeCapacity)) {
      addSection('Time Capacity', formData.timeCapacity, '⏰')
    }

    if (!isEmpty(formData.readiness)) {
      addSection('Readiness Level', `${formData.readiness} / 10`, '🎯')
    }

    doc.save('my-health-vision.pdf')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      {/* Header */}
      <div className={`bg-transparent sticky top-0 z-10 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              leftIcon={<ArrowBack className="w-5 h-5" />}
            >
              <span className="hidden sm:inline">Back to Dashboard</span>
            </Button>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 no-print">
              <Button
                variant="ghost"
                onClick={handlePrint}
                leftIcon={<Print className="w-5 h-5" />}
              >
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button
                variant="ghost"
                onClick={handleDownloadPDF}
                leftIcon={<FileDownload className="w-5 h-5" />}
              >
                <span className="hidden sm:inline">Download PDF</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-h1 text-summit-forest mb-4">
            My Health Vision
          </h1>
          <p className="text-body-lg text-text-secondary">
            Your personalized roadmap to better health
          </p>
        </div>

        {/* Vision Content */}
        <Card className="border border-summit-sage overflow-hidden">
          {/* Health Summit */}
          <section className="pb-6 border-b border-summit-sage">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 text-summit-forest flex items-center gap-2">
                <Terrain className="w-5 h-5 text-summit-emerald" />
                Health Summit
              </h3>
              {editingSection !== 'summit' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditSection('summit')}
                  leftIcon={<Edit className="w-4 h-4" />}
                  className="no-print"
                >
                  Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2 no-print">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    leftIcon={<Close className="w-4 h-4" />}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveSection('summit')}
                    disabled={isSaving}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>
            
            {editingSection === 'summit' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">
                    Vision Statement (1-2 years from now)
                  </label>
                  <textarea
                    value={formData.visionStatement || ''}
                    onChange={(e) => updateFormData('visionStatement', e.target.value)}
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none"
                    placeholder="Describe your ideal health state..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">
                    How You Feel
                  </label>
                  <textarea
                    value={formData.feelingState || ''}
                    onChange={(e) => updateFormData('feelingState', e.target.value)}
                    className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none"
                    placeholder="Describe your energy, mood, confidence..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">
                    Why This Matters
                  </label>
                  <textarea
                    value={formData.whyMatters || ''}
                    onChange={(e) => updateFormData('whyMatters', e.target.value)}
                    className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none"
                    placeholder="Why is this important to you?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">
                    Motivation Drivers
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Health', 'Family', 'Longevity', 'Energy', 'Confidence', 'Performance', 'Appearance'].map((driver) => (
                      <button
                        key={driver}
                        onClick={() => toggleArrayItem('motivationDrivers', driver)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                          (formData.motivationDrivers || []).includes(driver)
                            ? 'bg-summit-sage text-summit-forest'
                            : 'bg-gray-100 text-text-secondary hover:bg-stone-200'
                        }`}
                      >
                        {driver}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-summit-forest leading-relaxed text-lg">
                  {isEmpty(formData.visionStatement) && isEmpty(formData.feelingState) && isEmpty(formData.whyMatters) ? (
                    <span className="text-text-muted italic text-sm">Not yet defined</span>
                  ) : (
                    <>
                      {!isEmpty(formData.visionStatement) && formData.visionStatement}
                      {!isEmpty(formData.feelingState) && (
                        <>{!isEmpty(formData.visionStatement) && ' '}{formData.feelingState}</>
                      )}
                      {!isEmpty(formData.appearanceConfidence) && (
                        <>{(!isEmpty(formData.visionStatement) || !isEmpty(formData.feelingState)) && ' '}{formData.appearanceConfidence}</>
                      )}
                      {!isEmpty(formData.futureAbilities) && (
                        <>{(!isEmpty(formData.visionStatement) || !isEmpty(formData.feelingState) || !isEmpty(formData.appearanceConfidence)) && ' '}{formData.futureAbilities}</>
                      )}
                      {!isEmpty(formData.whyMatters) && (
                        <>{(!isEmpty(formData.visionStatement) || !isEmpty(formData.feelingState) || !isEmpty(formData.appearanceConfidence) || !isEmpty(formData.futureAbilities)) && ' '}This matters because {formData.whyMatters}</>
                      )}
                    </>
                  )}
                </p>

                {!isArrayEmpty(formData.motivationDrivers) && (
                  <div>
                    <p className="text-sm font-semibold text-text-secondary mb-2">My Biggest Drivers:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.motivationDrivers.map((driver) => (
                        <span key={driver} className="px-3 py-1 bg-summit-sage text-summit-forest text-xs font-medium rounded-full">{driver}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Base Camp */}
          <section className="pt-4 pb-6 border-b border-summit-sage">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 text-summit-forest flex items-center gap-2">
                <Favorite className="w-5 h-5 text-summit-emerald" />
                Base Camp (Resources)
              </h3>
              {editingSection !== 'basecamp' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditSection('basecamp')}
                  leftIcon={<Edit className="w-4 h-4" />}
                  className="no-print"
                >
                  Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2 no-print">
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-summit-forest hover:bg-gray-100 rounded-lg transition"
                  >
                    <Close className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveSection('basecamp')}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            
            {editingSection === 'basecamp' ? (
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">⛔ Non-negotiables</label>
                  <textarea
                    value={formData.nonNegotiables || ''}
                    onChange={(e) => updateFormData('nonNegotiables', e.target.value)}
                    className="w-full h-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none text-sm"
                    placeholder="What must stay in place?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">💪 Strengths & Resources</label>
                  <textarea
                    value={formData.strengths || ''}
                    onChange={(e) => updateFormData('strengths', e.target.value)}
                    className="w-full h-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none text-sm"
                    placeholder="What's already working?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">⚡ Energizers</label>
                  <textarea
                    value={formData.energizers || ''}
                    onChange={(e) => updateFormData('energizers', e.target.value)}
                    className="w-full h-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none text-sm"
                    placeholder="What gives you energy?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">🎯 Gaps & Needs</label>
                  <textarea
                    value={formData.gapsWants || ''}
                    onChange={(e) => updateFormData('gapsWants', e.target.value)}
                    className="w-full h-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none text-sm"
                    placeholder="What's missing or needed?"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-1">⛔ Non-negotiables</h4>
                  <p className="text-summit-forest text-sm leading-relaxed">
                    {isEmpty(formData.nonNegotiables) ? <span className="text-text-muted italic">Not yet defined</span> : formData.nonNegotiables}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-1">💪 Strengths & Resources</h4>
                  <p className="text-summit-forest text-sm leading-relaxed">
                    {isEmpty(formData.strengths) ? <span className="text-text-muted italic">Not yet defined</span> : formData.strengths}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-1">⚡ Energizers</h4>
                  <p className="text-summit-forest text-sm leading-relaxed">
                    {isEmpty(formData.energizers) ? <span className="text-text-muted italic">Not yet defined</span> : formData.energizers}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-1">🎯 Gaps & Needs</h4>
                  <p className="text-summit-forest text-sm leading-relaxed">
                    {isEmpty(formData.gapsWants) ? <span className="text-text-muted italic">Not yet defined</span> : formData.gapsWants}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Assess the Route */}
          <section className="pt-4 pb-6 border-b border-summit-sage">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 text-summit-forest flex items-center gap-2">
                <Map className="w-5 h-5 text-summit-emerald" />
                Assess the Route
              </h3>
              {editingSection !== 'route' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditSection('route')}
                  leftIcon={<Edit className="w-4 h-4" />}
                  className="no-print"
                >
                  Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2 no-print">
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-summit-forest hover:bg-gray-100 rounded-lg transition"
                  >
                    <Close className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveSection('route')}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            
            {editingSection === 'route' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">Current Position (1-10)</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.currentScore || 5}
                    onChange={(e) => updateFormData('currentScore', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-center">
                    <span className="text-3xl font-bold text-summit-emerald">{formData.currentScore || 5}</span>
                    <span className="text-lg text-text-secondary"> / 10</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">🚧 Obstacles Blocking Your Path</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['Time', 'Energy', 'Motivation', 'Knowledge', 'Resources', 'Support', 'Pain/Injury'].map((barrier) => (
                      <button
                        key={barrier}
                        onClick={() => toggleArrayItem('barriers', barrier)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                          (formData.barriers || []).includes(barrier)
                            ? 'bg-summit-sage text-summit-forest'
                            : 'bg-gray-100 text-text-secondary hover:bg-stone-200'
                        }`}
                      >
                        {barrier}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={formData.barriersNotes || ''}
                    onChange={(e) => updateFormData('barriersNotes', e.target.value)}
                    className="w-full h-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none text-sm"
                    placeholder="Additional notes about obstacles..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">🔧 Skills/Habits to Navigate Terrain</label>
                  <div className="flex flex-wrap gap-2">
                    {['Movement/Exercise', 'Nutrition', 'Sleep', 'Stress Management', 'Alcohol/Substance Moderation', 'Planning/Organization', 'Tech Boundaries', 'Social Connection'].map((habit) => (
                      <button
                        key={habit}
                        onClick={() => toggleArrayItem('habitsToImprove', habit)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                          (formData.habitsToImprove || []).includes(habit)
                            ? 'bg-summit-sage text-summit-forest'
                            : 'bg-gray-100 text-text-secondary hover:bg-stone-200'
                        }`}
                      >
                        {habit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-summit-mint p-4 rounded-lg border border-summit-sage">
                  <h4 className="text-sm font-semibold text-summit-forest mb-1">Current Position on the Mountain</h4>
                  <p className="text-3xl font-bold text-summit-emerald">{formData.currentScore || 5} <span className="text-lg text-text-secondary">/ 10</span></p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-2">🚧 Obstacles Blocking Your Path</h4>
                  {!isArrayEmpty(formData.barriers) ? (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.barriers.map((barrier) => (
                        <span key={barrier} className="px-3 py-1 bg-summit-sage text-summit-forest text-xs font-medium rounded-full">{barrier}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-muted italic text-sm">None selected</p>
                  )}
                  {!isEmpty(formData.barriersNotes) && (
                    <p className="text-summit-forest text-sm mt-2">{formData.barriersNotes}</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-2">🔧 Skills/Habits to Navigate Terrain</h4>
                  {!isArrayEmpty(formData.habitsToImprove) ? (
                    <div className="flex flex-wrap gap-2">
                      {formData.habitsToImprove.map((habit) => (
                        <span key={habit} className="px-3 py-1 bg-gray-100 text-summit-forest text-xs font-medium rounded-full">{habit}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-muted italic text-sm">None selected</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Capacity & Support */}
          <section className="pt-4 pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 text-summit-forest flex items-center gap-2">
                <Schedule className="w-5 h-5 text-summit-emerald" />
                Capacity & Support
              </h3>
              {editingSection !== 'capacity' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditSection('capacity')}
                  leftIcon={<Edit className="w-4 h-4" />}
                  className="no-print"
                >
                  Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2 no-print">
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-summit-forest hover:bg-gray-100 rounded-lg transition"
                  >
                    <Close className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveSection('capacity')}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            
            {editingSection === 'capacity' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">⏰ Time Capacity</label>
                  <select
                    value={formData.timeCapacity || ''}
                    onChange={(e) => updateFormData('timeCapacity', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald text-sm"
                  >
                    <option value="">Select time capacity...</option>
                    <option value="5-10 min/day">5-10 min/day</option>
                    <option value="15-20 min/day">15-20 min/day</option>
                    <option value="30 min/day">30 min/day</option>
                    <option value="45-60 min/day">45-60 min/day</option>
                    <option value="Variable">Variable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">📅 Preferred Times</label>
                  <textarea
                    value={formData.preferredTimes || ''}
                    onChange={(e) => updateFormData('preferredTimes', e.target.value)}
                    className="w-full h-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none text-sm"
                    placeholder="When do you prefer to work on health habits?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">🌱 What Feels Sustainable</label>
                  <textarea
                    value={formData.sustainableNotes || ''}
                    onChange={(e) => updateFormData('sustainableNotes', e.target.value)}
                    className="w-full h-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-summit-emerald focus:border-summit-emerald resize-none text-sm"
                    placeholder="What approach feels realistic for you?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">Readiness Level (1-10)</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.readiness || 5}
                    onChange={(e) => updateFormData('readiness', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-center">
                    <span className="text-3xl font-bold text-summit-emerald">{formData.readiness || 5}</span>
                    <span className="text-lg text-text-secondary"> / 10</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-summit-forest mb-2">🤝 Support Needs</label>
                  <div className="flex flex-wrap gap-2">
                    {['Accountability', 'Education', 'Community', 'Professional Guidance', 'Tools/Apps', 'Family Support'].map((need) => (
                      <button
                        key={need}
                        onClick={() => toggleArrayItem('supportNeeds', need)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                          (formData.supportNeeds || []).includes(need)
                            ? 'bg-summit-sage text-summit-forest'
                            : 'bg-gray-100 text-text-secondary hover:bg-stone-200'
                        }`}
                      >
                        {need}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-1">⏰ Time Capacity</h4>
                  <p className="text-summit-forest text-sm font-medium">
                    {formData.timeCapacity || <span className="text-text-muted italic">Not yet defined</span>}
                  </p>
                </div>

                {!isEmpty(formData.preferredTimes) && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-secondary mb-1">📅 Preferred Times</h4>
                    <p className="text-summit-forest text-sm">{formData.preferredTimes}</p>
                  </div>
                )}

                {!isEmpty(formData.sustainableNotes) && (
                  <div>
                    <h4 className="text-sm font-semibold text-text-secondary mb-1">🌱 What Feels Sustainable</h4>
                    <p className="text-summit-forest text-sm">{formData.sustainableNotes}</p>
                  </div>
                )}

                <div className="bg-summit-mint p-4 rounded-lg border border-summit-sage">
                  <h4 className="text-sm font-semibold text-summit-forest mb-1">Readiness Level</h4>
                  <p className="text-3xl font-bold text-summit-emerald">{formData.readiness || 5} <span className="text-lg text-text-secondary">/ 10</span></p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-text-secondary mb-2">🤝 Support Needs</h4>
                  {!isArrayEmpty(formData.supportNeeds) ? (
                    <div className="flex flex-wrap gap-2">
                      {formData.supportNeeds.map((need) => (
                        <span key={need} className="px-3 py-1 bg-summit-sage text-summit-forest text-xs font-medium rounded-full">{need}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-text-muted italic text-sm">None selected</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </Card>

        {/* Footer Note */}
        <Card className="mt-8 border-l-4 border-summit-emerald no-print">
          <h4 className="text-h3 text-summit-forest mb-2">Tips for Using Your Vision</h4>
          <ul className="text-body-sm text-summit-forest space-y-1">
            <li>• Review your vision regularly to stay connected to your "why"</li>
            <li>• Update it every 3-6 months as you grow and learn</li>
            <li>• Share it with your health coach or accountability partner</li>
            <li>• Use it to guide your weekly habit choices</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default VisionDisplay
