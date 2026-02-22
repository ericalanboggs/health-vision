import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  Close,
  Add,
  OpenInNew,
  OndemandVideo,
  Podcasts,
  Article,
  Link as LinkIcon,
  PushPin,
  PushPinOutlined,
  Share,
  DeleteOutline,
  MoreVert,
} from '@mui/icons-material'
import { getCurrentUser } from '../services/authService'
import {
  getUserResources,
  addResource,
  deleteResource,
  togglePinResource,
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
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [overflowMenuId, setOverflowMenuId] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const addFormRef = useRef(null)

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

  // Derive topics and types from resources
  const availableTopics = [...new Set(resources.map(r => r.topic).filter(Boolean))]
  const availableTypes = [...new Set(resources.map(r => r.resource_type).filter(Boolean))]
  const showTypeFilter = false // Hidden until we have multiple resource types

  // Filter resources and sort pinned to top
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
  }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))

  const handleDelete = async (resourceId) => {
    const result = await deleteResource(resourceId)
    if (result.success) {
      setResources(prev => prev.filter(r => r.id !== resourceId))
    }
    setConfirmDeleteId(null)
  }

  const handlePin = async (resource) => {
    setResources(prev =>
      prev.map(r => r.id === resource.id ? { ...r, pinned: !r.pinned } : r)
    )
    await togglePinResource(resource.id, resource.pinned)
  }

  const handleShare = async (resource) => {
    const shareData = { title: resource.title, url: resource.url }
    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled share — ignore
      }
    } else {
      await navigator.clipboard.writeText(resource.url)
      setToastMessage('Link copied!')
      setTimeout(() => setToastMessage(null), 2000)
    }
    setOverflowMenuId(null)
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
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">Loading resources...</p>
      </div>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <h1 className="text-h1 text-summit-forest mb-2">Guides</h1>
        <p className="text-body text-text-muted mb-6">
          Personalized content from your weekly digests.
        </p>

        {/* Filters row: topic pills + search bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {availableTopics.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
          <div className="relative w-full md:w-64 md:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-body-sm focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-summit-forest"
              >
                <Close className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Type Filter — only when multiple resource types exist */}
        {showTypeFilter && (
          <div className="mb-4">
            <ToggleButtonGroup
              options={TYPE_FILTERS}
              value={typeFilter}
              onChange={setTypeFilter}
            />
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
              <div key={resource.id}>
                <Card className={`cursor-pointer border ${resource.pinned ? 'border-summit-emerald/40 bg-summit-mint/20' : 'border-gray-200'}`}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {TYPE_ICON[resource.resource_type] || TYPE_ICON.link}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-body font-semibold text-summit-pine hover:text-summit-forest underline decoration-summit-pine/30 hover:decoration-summit-forest/50 truncate transition-colors">
                                {resource.title}
                              </h3>
                              {resource.source && (
                                <p className="text-body-sm text-text-muted">{resource.source}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {resource.duration_minutes && (
                                <Tag size="sm" variant="secondary">
                                  {resource.duration_minutes} min
                                </Tag>
                              )}

                              {/* Pin — always visible */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handlePin(resource)
                                }}
                                className={`p-1 transition-colors ${resource.pinned ? 'text-summit-emerald hover:text-summit-forest' : 'text-text-muted hover:text-summit-emerald'}`}
                                title={resource.pinned ? 'Unpin' : 'Pin to top'}
                              >
                                {resource.pinned
                                  ? <PushPin className="h-4 w-4" />
                                  : <PushPinOutlined className="h-4 w-4" />
                                }
                              </button>

                              {/* Desktop: share + delete inline */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleShare(resource)
                                }}
                                className="hidden md:block p-1 text-text-muted hover:text-summit-emerald transition-colors"
                                title="Share"
                              >
                                <Share className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setConfirmDeleteId(resource.id)
                                }}
                                className="hidden md:block p-1 text-text-muted hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <DeleteOutline className="h-4 w-4" />
                              </button>

                              {/* Mobile: overflow menu for share + delete */}
                              <div className="relative md:hidden">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setOverflowMenuId(overflowMenuId === resource.id ? null : resource.id)
                                  }}
                                  className="p-1 text-text-muted hover:text-summit-forest transition-colors"
                                  title="More actions"
                                >
                                  <MoreVert className="h-4 w-4" />
                                </button>
                                {overflowMenuId === resource.id && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-10"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setOverflowMenuId(null)
                                      }}
                                    />
                                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          handleShare(resource)
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-body-sm text-summit-forest hover:bg-summit-mint transition"
                                      >
                                        <Share className="h-4 w-4 text-summit-emerald" />
                                        Share
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault()
                                          e.stopPropagation()
                                          setOverflowMenuId(null)
                                          setConfirmDeleteId(resource.id)
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-body-sm text-red-500 hover:bg-red-50 transition"
                                      >
                                        <DeleteOutline className="h-4 w-4" />
                                        Delete
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
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
                    </a>
                </Card>
              </div>
            ))
          )}
        </div>

        {/* Add Resource Button / Form */}
        {showAddForm ? (
          <Card ref={addFormRef}>
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
            onClick={() => {
              setShowAddForm(true)
              setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50)
            }}
          >
            Add Resource
          </Button>
        )}

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setConfirmDeleteId(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
              <h3 className="text-h3 text-summit-forest mb-2">Delete resource?</h3>
              <p className="text-body-sm text-text-muted mb-6">
                This will permanently remove the resource from your library.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </Button>
                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="px-4 py-2 text-body-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-summit-forest text-white px-4 py-2 rounded-lg shadow-lg text-body-sm z-50 animate-fade-in">
          {toastMessage}
        </div>
      )}
    </main>
  )
}
