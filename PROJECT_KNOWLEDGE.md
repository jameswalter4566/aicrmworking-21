
# SMS Webhook Processing Configuration

## Persistent Issue: Webhook Authentication

### Problem
Periodically, SMS webhook processing breaks due to JWT verification preventing the functions from being called correctly.

### Solution
Ensure the following Supabase edge functions are configured with `verify_jwt = false` in `supabase/config.toml`:
- `sms-webhook-receiver`
- `ai-sms-agent`

### Why This Happens
These functions need to be publicly accessible to receive incoming webhooks from external services like Twilio without requiring authentication.

### Debugging Steps
1. Check `supabase/config.toml`
2. Verify these functions have `verify_jwt = false`
3. If webhooks stop working, this is likely the first thing to check

### Potential Causes of Breakage
- Automatic Supabase configuration resets
- Deployment processes that might revert configuration
- Security updates that inadvertently change function access

**IMPORTANT**: Always maintain these public function settings to ensure smooth SMS webhook processing.
