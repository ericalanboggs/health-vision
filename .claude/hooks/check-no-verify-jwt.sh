#!/usr/bin/env bash
# PreToolUse(Bash) guard: block deploying an internal-only edge function
# without --no-verify-jwt. Any redeploy strips the flag, and the Supabase
# gateway then rejects the forwarded request with 401. See SUMMIT_HANDOFF.md
# (Deployment) and the project memory for the full list.
#
# Reads the hook payload on stdin, inspects .tool_input.command, and emits a
# PreToolUse "deny" decision when a listed internal function is being deployed
# without the flag. Stays silent (exit 0) for everything else.

set -euo pipefail

# Functions that MUST be deployed with --no-verify-jwt.
INTERNAL_FUNCTIONS="twilio-webhook habit-sms-response sms-backup-plan sms-reflection-response habit-sms-followup send-admin-sms send-admin-email notify-new-signup send-welcome-email"

cmd="$(jq -r '.tool_input.command // ""')"

# Only care about edge-function deploys.
case "$cmd" in
  *"functions deploy"*) ;;
  *) exit 0 ;;
esac

# Flag present anywhere in the command → fine.
case "$cmd" in
  *"--no-verify-jwt"*) exit 0 ;;
esac

# Flag absent. Does the command name a protected internal function?
hit=""
for fn in $INTERNAL_FUNCTIONS; do
  case "$cmd" in
    *"$fn"*) hit="$fn"; break ;;
  esac
done

# A bare `supabase functions deploy` with no function name deploys ALL
# functions — that strips the flag from the internal ones too.
bulk=""
if [ -z "$hit" ]; then
  trimmed="$(printf '%s' "$cmd" | sed -E 's/.*functions deploy[[:space:]]*//')"
  # If what follows "deploy" is empty or starts with a flag, it's a bulk deploy.
  case "$trimmed" in
    ""|"-"*) bulk="1" ;;
  esac
fi

[ -n "$hit" ] || [ -n "$bulk" ] || exit 0

if [ -n "$hit" ]; then
  reason="'$hit' is an internal-only edge function and MUST be deployed with --no-verify-jwt, or the Supabase gateway will 401 the forwarded request. Re-run the deploy with --no-verify-jwt appended. (See SUMMIT_HANDOFF.md → Deployment.)"
else
  reason="This deploys ALL edge functions, which strips --no-verify-jwt from the internal-only ones ($INTERNAL_FUNCTIONS), causing 401s. Deploy those functions individually with --no-verify-jwt, or append the flag. (See SUMMIT_HANDOFF.md → Deployment.)"
fi

jq -nc --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
