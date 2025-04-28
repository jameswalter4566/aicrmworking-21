
// Simple session manager for tracking call attempts
export class SessionManager {
  private sessions: Record<string, Session> = {};

  // Create a new session
  createSession(sessionId: string, timeout = 30 * 60 * 1000): Session {
    const session: Session = {
      id: sessionId,
      created: Date.now(),
      attempts: {},
      calls: {},
      lastActivity: Date.now()
    };
    
    this.sessions[sessionId] = session;
    
    // Set up automatic cleanup after timeout
    setTimeout(() => {
      this.cleanupSession(sessionId);
    }, timeout);
    
    return session;
  }

  // Get an existing session
  getSession(sessionId: string): Session | null {
    const session = this.sessions[sessionId];
    if (session) {
      session.lastActivity = Date.now();
      return session;
    }
    return null;
  }

  // Clean up an expired session
  cleanupSession(sessionId: string): void {
    delete this.sessions[sessionId];
  }
}

export interface Session {
  id: string;
  created: number;
  lastActivity: number;
  attempts: Record<string, number>;  // phoneNumber -> number of attempts
  calls: Record<string, CallInfo>;    // callSid -> call info
}

export interface CallInfo {
  phoneNumber: string;
  startTime: number;
  attemptCount: number;
}
