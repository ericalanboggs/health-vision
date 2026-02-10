import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowBack,
  Search,
  Close,
  Add,
  OpenInNew,
  OndemandVideo,
  Podcasts,
  Article,
  Link as LinkIcon,
} from '@mui/icons-material'
import { getCurrentUser } from '../services/authService'
import {
  getUserResources,
  addResource,
  deleteResource,
  categorizeResource,
} from '../services/resourceService'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Tag,
  ToggleButtonGroup,
} from '@summit/design-system'
import TopNav from '../components/TopNav'

const TYPE_ICON = {
  youtube: <OndemandVideo className="h-5 w-5 text-red-500" />,
  podcast: <Podcasts className="h-5 w-5 text-purple-500" />,
  article: <Article className="h-5 w-5 text-blue-500" />,
  link: <LinkIcon className="h-5 w-5 text-text-muted" />,
}

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'youtube', label: 'Videos' },
  { value: 'podcast', label: 'Podcasts' },
  { value: 'article', label: 'Articles' },
]

const TOPIC_OPTIONS = [
  'Mindfulness',
  'Fitness',
  'Nutrition',
  'Sleep',
  'Productivity',
  'Wellness',
]

export default function Resources() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [topicFilter, setTopicFilter] = useState(searchParams.get('topic') || null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ url: '', title: '', topic: '', duration_minutes: '' })
  const [addingSaving, setAddingSaving] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)

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

  useEffect(() => {
    const loadResources = async () => {
      const userResult = await getCurrentUser()
      if (!userResult.user) {
        setLoading(false)
        return
      }

      const result = await getUserResources(userResult.user.id)
      if (result.success) {
        // Apply client-side categorization for resources with no topic
        const categorized = result.data.map(r => ({
          ...r,
          topic: r.topic || categorizeResource([r.title, r.description].filter(Boolean).join(' ')),
        }))
        setResources(categorized)
      }
      setLoading(false)
    }

    loadResources()
  }, [])

  // Derive topics from resources
  const availableTopics = [...new Set(resources.map(r => r.topic).filter(Boolean))]

  // Filter resources
  const filtered = resources.filter(r => {
    if (typeFilter !== 'all' && r.resource_type !== typeFilter) return false
    if (topicFilter && r.topic !== topicFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchTitle = r.title?.toLowerCase().includes(q)
      const matchDesc = r.description?.toLowerCase().includes(q)
      const matchSource = r.source?.toLowerCase().includes(q)
      if (!matchTitle && !matchDesc && !matchSource) return false
    }
    return true
  })

  const handleDelete = async (resourceId) => {
    const result = await deleteResource(resourceId)
    if (result.success) {
      setResources(prev => prev.filter(r => r.id !== resourceId))
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!addForm.url || !addForm.title) return

    setAddingSaving(true)
    const result = await addResource({
      title: addForm.title,
      url: addForm.url,
      topic: addForm.topic || categorizeResource(addForm.title) || null,
      duration_minutes: addForm.duration_minutes ? parseInt(addForm.duration_minutes) : null,
    })

    if (result.success) {
      setResources(prev => [result.data, ...prev])
      setAddForm({ url: '', title: '', topic: '', duration_minutes: '' })
      setShowAddForm(false)
    }
    setAddingSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint flex items-center justify-center">
        <p className="text-text-secondary">Loading resources...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      <div className={`sticky top-0 z-10 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <TopNav />
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-text-muted hover:text-summit-forest mb-6 transition-colors"
        >
          <ArrowBack className="h-5 w-5" />
          <span className="text-body">Back to Dashboard</span>
        </button>

        {/* Page Header */}
        <h1 className="text-h1 text-summit-forest mb-2">Your Resources</h1>
        <p className="text-body text-text-muted mb-6">
          Personalized content from your weekly digests.
        </p>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-body focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-summit-forest"
            >
              <Close className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Type Filter */}
        <div className="mb-4">
          <ToggleButtonGroup
            options={TYPE_FILTERS}
            value={typeFilter}
            onChange={setTypeFilter}
          />
        </div>

        {/* Topic Pills */}
        {availableTopics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {availableTopics.map(topic => (
              <button
                key={topic}
                onClick={() => setTopicFilter(topicFilter === topic ? null : topic)}
                className={`px-3 py-1 rounded-full text-body-sm transition-colors ${
                  topicFilter === topic
                    ? 'bg-summit-emerald text-white'
                    : 'bg-summit-sage text-summit-forest hover:bg-summit-emerald/20'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        )}

        {/* Resource List */}
        <div className="space-y-3 mb-6">
          {filtered.length === 0 ? (
            <Card className="border border-gray-200">
              <CardHeader>
                <CardDescription className="text-center py-4">
                  {resources.length === 0
                    ? 'No resources yet. Resources from your weekly digests will appear here.'
                    : 'No resources match your filters.'}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            filtered.map(resource => (
              <a
                key={resource.id}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card interactive className="border border-gray-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {TYPE_ICON[resource.resource_type] || TYPE_ICON.link}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-body font-semibold text-summit-forest truncate">
                            {resource.title}
                          </h3>
                          {resource.source && (
                            <p className="text-body-sm text-text-muted">{resource.source}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {resource.duration_minutes && (
                            <Tag size="sm" variant="secondary">
                              {resource.duration_minutes} min
                            </Tag>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDelete(resource.id)
                            }}
                            className="text-text-muted hover:text-red-500 transition-colors p-1"
                            title="Remove resource"
                          >
                            <Close className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {resource.description && (
                        <p className="text-body-sm text-text-muted mt-1 line-clamp-2">
                          {resource.description}
                        </p>
                      )}
                      {resource.topic && (
                        <Tag size="sm" variant="secondary" className="mt-2">
                          {resource.topic}
                        </Tag>
                      )}
                    </div>
                  </div>
                </Card>
              </a>
            ))
          )}
        </div>

        {/* Add Resource Button / Form */}
        {showAddForm ? (
          <Card className="border border-gray-200">
            <CardHeader className="mb-4">
              <CardTitle className="text-h3">Add Resource</CardTitle>
            </CardHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-body-sm font-semibold text-summit-forest mb-1">
                  URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={addForm.url}
                  onChange={(e) => setAddForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-body focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-body-sm font-semibold text-summit-forest mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.title}
                  onChange={(e) => setAddForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Resource title"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-body focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-body-sm font-semibold text-summit-forest mb-1">
                    Topic
                  </label>
                  <select
                    value={addForm.topic}
                    onChange={(e) => setAddForm(prev => ({ ...prev, topic: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-body focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
                  >
                    <option value="">Select topic...</option>
                    {TOPIC_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-body-sm font-semibold text-summit-forest mb-1">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addForm.duration_minutes}
                    onChange={(e) => setAddForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-body focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" variant="primary" disabled={addingSaving}>
                  {addingSaving ? 'Saving...' : 'Add Resource'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false)
                    setAddForm({ url: '', title: '', topic: '', duration_minutes: '' })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Button
            variant="ghost"
            leftIcon={<Add className="h-5 w-5" />}
            onClick={() => setShowAddForm(true)}
          >
            Add Resource
          </Button>
        )}
      </main>
    </div>
  )
}
