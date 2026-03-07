import { FiberNew, Warning, CheckCircle, EventBusy, SmsFailed } from '@mui/icons-material'

/**
 * Quick filter chips for user engagement status, subscription tier, and SMS opt-out
 * @param {Object} props
 * @param {string|null} props.activeFilter - Currently active engagement filter
 * @param {Function} props.onFilterChange - Callback when engagement filter changes
 * @param {Object} props.counts - Count of users in each engagement category
 * @param {string|null} props.tierFilter - Currently active tier filter
 * @param {Function} props.onTierFilterChange - Callback when tier filter changes
 * @param {Object} props.tierCounts - Count of users in each tier
 * @param {boolean} props.smsFilter - Whether SMS opt-out filter is active
 * @param {Function} props.onSmsFilterChange - Callback when SMS filter toggles
 * @param {number} props.smsOptOutCount - Count of SMS opt-out users
 */
export default function EngagementFilter({
  activeFilter,
  onFilterChange,
  counts,
  tierFilter,
  onTierFilterChange,
  tierCounts = {},
  smsFilter,
  onSmsFilterChange,
  smsOptOutCount = 0,
}) {
  const engagementFilters = [
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

  const tierFilters = [
    { id: null, label: 'All Tiers', color: 'stone', count: tierCounts.all || 0 },
    { id: 'free', label: 'Free', color: 'stone', count: tierCounts.free || 0 },
    { id: 'core', label: 'Core', color: 'blue', count: tierCounts.core || 0 },
    { id: 'plus', label: 'Plus', color: 'violet', count: tierCounts.plus || 0 },
    { id: 'premium', label: 'Premium', color: 'amber', count: tierCounts.premium || 0 },
  ]

  const getChipClasses = (color, isActive) => {
    const baseClasses = 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all'

    if (isActive) {
      switch (color) {
        case 'blue':
          return `${baseClasses} bg-blue-100 text-blue-700 ring-2 ring-blue-500`
        case 'emerald':
          return `${baseClasses} bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500`
        case 'amber':
          return `${baseClasses} bg-amber-100 text-amber-700 ring-2 ring-amber-500`
        case 'red':
          return `${baseClasses} bg-red-100 text-red-700 ring-2 ring-red-500`
        case 'violet':
          return `${baseClasses} bg-violet-100 text-violet-700 ring-2 ring-violet-500`
        default:
          return `${baseClasses} bg-stone-200 text-stone-700 ring-2 ring-stone-500`
      }
    }

    return `${baseClasses} bg-stone-100 text-stone-600 hover:bg-stone-200`
  }

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* Engagement filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-stone-500 mr-1">Status:</span>
        {engagementFilters.map((filter) => (
          <button
            key={filter.id || 'all'}
            onClick={() => onFilterChange(filter.id)}
            className={getChipClasses(filter.color, activeFilter === filter.id)}
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

      {/* Tier filters + SMS opt-out */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-stone-500 mr-1">Tier:</span>
        {tierFilters.map((filter) => (
          <button
            key={filter.id || 'all-tiers'}
            onClick={() => onTierFilterChange(filter.id)}
            className={getChipClasses(filter.color, tierFilter === filter.id)}
          >
            <span>{filter.label}</span>
            <span className={`ml-1 text-xs ${tierFilter === filter.id ? 'opacity-80' : 'opacity-60'}`}>
              ({filter.count})
            </span>
          </button>
        ))}

        <span className="mx-1 text-stone-300">|</span>

        <button
          onClick={() => onSmsFilterChange(!smsFilter)}
          className={getChipClasses('red', smsFilter)}
        >
          <SmsFailed className="w-4 h-4" />
          <span>SMS Opt-out</span>
          <span className={`ml-1 text-xs ${smsFilter ? 'opacity-80' : 'opacity-60'}`}>
            ({smsOptOutCount})
          </span>
        </button>
      </div>
    </div>
  )
}
