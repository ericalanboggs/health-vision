import { FiberNew, Warning, CheckCircle, EventBusy } from '@mui/icons-material'

/**
 * Quick filter chips for user engagement status
 * @param {Object} props
 * @param {string|null} props.activeFilter - Currently active filter
 * @param {Function} props.onFilterChange - Callback when filter changes
 * @param {Object} props.counts - Count of users in each category
 */
export default function EngagementFilter({ activeFilter, onFilterChange, counts }) {
  const filters = [
    {
      id: null,
      label: 'All',
      icon: null,
      color: 'stone',
      count: counts.all
    },
    {
      id: 'new',
      label: 'New',
      icon: FiberNew,
      color: 'blue',
      count: counts.new,
      description: 'Joined in last 7 days'
    },
    {
      id: 'active',
      label: 'Active',
      icon: CheckCircle,
      color: 'emerald',
      count: counts.active,
      description: 'Recent login & habits'
    },
    {
      id: 'inactive',
      label: 'Inactive',
      icon: EventBusy,
      color: 'amber',
      count: counts.inactive,
      description: 'No login in 7+ days'
    },
    {
      id: 'no_habits',
      label: 'No Habits',
      icon: Warning,
      color: 'red',
      count: counts.no_habits,
      description: 'Has vision but 0 habits'
    }
  ]

  const getButtonClasses = (filter) => {
    const isActive = activeFilter === filter.id
    const baseClasses = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all'

    if (isActive) {
      switch (filter.color) {
        case 'blue':
          return `${baseClasses} bg-blue-100 text-blue-700 ring-2 ring-blue-500`
        case 'emerald':
          return `${baseClasses} bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500`
        case 'amber':
          return `${baseClasses} bg-amber-100 text-amber-700 ring-2 ring-amber-500`
        case 'red':
          return `${baseClasses} bg-red-100 text-red-700 ring-2 ring-red-500`
        default:
          return `${baseClasses} bg-stone-200 text-stone-700 ring-2 ring-stone-500`
      }
    }

    return `${baseClasses} bg-stone-100 text-stone-600 hover:bg-stone-200`
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm text-stone-500 mr-1">Filter:</span>
      {filters.map((filter) => (
        <button
          key={filter.id || 'all'}
          onClick={() => onFilterChange(filter.id)}
          className={getButtonClasses(filter)}
          title={filter.description}
        >
          {filter.icon && <filter.icon className="w-4 h-4" />}
          <span>{filter.label}</span>
          <span className={`ml-1 text-xs ${activeFilter === filter.id ? 'opacity-80' : 'opacity-60'}`}>
            ({filter.count})
          </span>
        </button>
      ))}
    </div>
  )
}
