/**
 * Format phone number to E.164 format for Twilio
 * Assumes US numbers if no country code is present
 * @param {string} phone - Phone number in any format
 * @returns {string} Phone number in E.164 format (+1XXXXXXXXXX)
 */
export function formatPhoneToE164(phone) {
  if (!phone) return ''
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // If already has country code (11 digits starting with 1), add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  
  // If 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`
  }
  
  // If already starts with +, return as is
  if (phone.startsWith('+')) {
    return phone
  }
  
  // Default: add +1 prefix for US numbers
  return `+1${digits}`
}

/**
 * Validate that a phone number has the correct number of digits
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid US phone number (10 digits)
 */
export function isValidUSPhoneNumber(phone) {
  if (!phone) return false
  
  const digits = phone.replace(/\D/g, '')
  
  // Valid if 10 digits (US) or 11 digits starting with 1 (US with country code)
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))
}

/**
 * Format phone number for display (XXX) XXX-XXXX
 * @param {string} phone - Phone number in any format
 * @returns {string} Formatted phone number for display
 */
export function formatPhoneForDisplay(phone) {
  if (!phone) return ''

  const digits = phone.replace(/\D/g, '')

  // Handle 10-digit US numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // Handle 11-digit numbers (with country code)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }

  // Return as-is if not a standard format
  return phone
}

/**
 * Format phone number as user types (XXX-XXX-XXXX)
 * @param {string} phone - Phone number input
 * @returns {string} Formatted phone number with dashes
 */
export function formatPhoneAsYouType(phone) {
  if (!phone) return ''

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Limit to 10 digits
  const limited = digits.slice(0, 10)

  // Format with dashes as user types
  if (limited.length <= 3) {
    return limited
  }
  if (limited.length <= 6) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`
  }
  return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`
}
