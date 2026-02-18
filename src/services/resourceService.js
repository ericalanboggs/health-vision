import supabase from '../lib/supabase'

/**
 * Get all resources for the current user
 */
export const getUserResources = async (userId = null) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    let uid = userId
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      uid = user.id
    }

    const { data, error } = await supabase
      .from('user_resources')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching resources:', error)
      return { success: false, error }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error in getUserResources:', error)
    return { success: false, error }
  }
}

/**
 * Add a new resource
 */
export const addResource = async (resource) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data, error } = await supabase
      .from('user_resources')
      .insert({
        user_id: user.id,
        title: resource.title,
        url: resource.url,
        topic: resource.topic || null,
        duration_minutes: resource.duration_minutes || null,
        origin: 'user',
        resource_type: 'link',
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding resource:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in addResource:', error)
    return { success: false, error }
  }
}

/**
 * Toggle pinned status for a resource
 */
export const togglePinResource = async (resourceId, pinned) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { data, error } = await supabase
      .from('user_resources')
      .update({ pinned: !pinned })
      .eq('id', resourceId)
      .select()
      .single()

    if (error) {
      console.error('Error toggling pin:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in togglePinResource:', error)
    return { success: false, error }
  }
}

/**
 * Delete a resource by ID
 */
export const deleteResource = async (resourceId) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const { error } = await supabase
      .from('user_resources')
      .delete()
      .eq('id', resourceId)

    if (error) {
      console.error('Error deleting resource:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteResource:', error)
    return { success: false, error }
  }
}

/**
 * Get distinct topics for the current user's resources
 */
export const getResourceTopics = async (userId = null) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured' }
    }

    let uid = userId
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }
      uid = user.id
    }

    const { data, error } = await supabase
      .from('user_resources')
      .select('topic')
      .eq('user_id', uid)
      .not('topic', 'is', null)

    if (error) {
      console.error('Error fetching resource topics:', error)
      return { success: false, error }
    }

    const topics = [...new Set(data.map(r => r.topic).filter(Boolean))]
    return { success: true, data: topics }
  } catch (error) {
    console.error('Error in getResourceTopics:', error)
    return { success: false, error }
  }
}

// Keyword-to-category mapping for auto-categorization
const TOPIC_KEYWORDS = {
  'Mindfulness': ['meditation', 'mindful', 'calm', 'breathing', 'awareness'],
  'Fitness': ['workout', 'exercise', 'fitness', 'hiit', 'strength', 'running', 'yoga', 'stretch'],
  'Nutrition': ['nutrition', 'meal', 'diet', 'eating', 'recipe', 'food'],
  'Sleep': ['sleep', 'rest', 'recovery', 'insomnia'],
  'Productivity': ['productivity', 'focus', 'deep work', 'time management'],
  'Wellness': ['stress', 'anxiety', 'mental health', 'wellbeing', 'self-care'],
}

/**
 * Auto-categorize a resource based on its description text
 */
export const categorizeResource = (text) => {
  if (!text) return null
  const lower = text.toLowerCase()
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return topic
    }
  }
  return null
}
