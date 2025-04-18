
# Edge Functions Development Guidelines

## Critical Warning: Protecting Edge Function Security and Functionality

### Authorization and Authentication

1. **DO NOT Remove Authorization Headers**
   - Authorization headers are crucial for securing edge functions
   - Removing these headers can cause:
     - 401 Unauthorized errors
     - Potential security vulnerabilities
     - Broken API integrations

2. **Authentication Handling**
   - Only set `verify_jwt = false` for truly public endpoints
   - Most internal functions require proper authentication
   - Always consult the team before modifying authentication mechanisms

### Common Pitfalls to Avoid

- **Never Modify Existing Authentication Flows**
  - Changes to authentication can break multiple system integrations
  - Any modifications must be reviewed by the entire team

- **Preserve Existing CORS and Error Handling**
  - Maintain existing error response structures
  - Keep CORS headers consistent
  - Do not alter error handling without thorough testing

### Best Practices

- Always test edge function changes in a staging environment
- Use console logging to track function behavior
- Verify all API integrations after making changes
- Consult with team members before making structural changes

### Emergency Contacts

If you encounter authentication or edge function issues:
- Contact Backend Team Lead
- Review recent changes with the development team
- Do not make unilateral changes to authentication mechanisms

### Documentation

Refer to our internal documentation for detailed guidelines on edge function development and security.

**IMPORTANT: When in doubt, ask first. Do not break existing functionality!**
