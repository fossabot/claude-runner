#!/bin/bash
# Simulate Claude Code timeout behavior with proper JSON output and exit 1

# Parse -r parameter for session resumption
RESUME_SESSION=""
while [[ $# -gt 0 ]]; do
  case $1 in
    -r)
      RESUME_SESSION="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# If resuming a session, use that session ID; otherwise create new one
if [[ -n "$RESUME_SESSION" ]]; then
  SESSION_ID="$RESUME_SESSION"
else
  SESSION_ID="claude-session-$(date +%s)-$(openssl rand -hex 4)"
fi

# Simulate timeout - sleep to make it realistic, then output timeout error in Claude Code format
sleep 1

# Output to stdout (not stderr) even on failure - this is how Claude Code behaves
echo "{
  \"type\": \"error\",
  \"subtype\": \"timeout\",
  \"is_error\": true,
  \"error\": \"Request timed out after 30000ms. This is typically due to rate limiting or high server load.\",
  \"session_id\": \"$SESSION_ID\",
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
  \"retry_after_seconds\": 5,
  \"suggested_action\": \"retry_with_backoff\",
  \"request_id\": \"req_$(openssl rand -hex 8)\"
}"

# Exit with code 1 to indicate failure that should trigger retry
exit 1