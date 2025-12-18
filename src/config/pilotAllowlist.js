const PILOT_ALLOWLIST = [
  'eric.alan.boggs@gmail.com',
]

export const isPilotApproved = (email) => {
  if (!email) return false
  
  const normalizedEmail = email.toLowerCase().trim()
  
  // Check exact email matches
  if (PILOT_ALLOWLIST.includes(normalizedEmail)) {
    return true
  }
  
  // Check domain wildcards (e.g., '*@company.com')
  const emailDomain = normalizedEmail.split('@')[1]
  const domainWildcard = `*@${emailDomain}`
  
  return PILOT_ALLOWLIST.includes(domainWildcard)
}

export const addPilotEmail = (email) => {
  const normalizedEmail = email.toLowerCase().trim()
  if (!PILOT_ALLOWLIST.includes(normalizedEmail)) {
    PILOT_ALLOWLIST.push(normalizedEmail)
  }
}

export default PILOT_ALLOWLIST
