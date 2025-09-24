// Socket debugging utilities
class SocketDebugger {
  private sessionActivityLog: Map<string, Array<{ action: string; timestamp: number; user?: string }>> = new Map();
  private maxLogSize = 100;

  logSessionActivity(sessionId: string, action: string, user?: string) {
    if (!this.sessionActivityLog.has(sessionId)) {
      this.sessionActivityLog.set(sessionId, []);
    }
    
    const log = this.sessionActivityLog.get(sessionId)!;
    log.push({
      action,
      timestamp: Date.now(),
      user
    });

    // Limit log size
    if (log.length > this.maxLogSize) {
      log.shift();
    }

    // Detect rapid join/leave cycles
    if (log.length >= 5) {
      const recentActions = log.slice(-5);
      const timespan = recentActions[4].timestamp - recentActions[0].timestamp;
      
      if (timespan < 5000) { // 5 seconds
        console.warn(`🚨 Rapid session activity detected for session ${sessionId}:`, recentActions);
      }
    }
  }

  getSessionActivity(sessionId: string) {
    return this.sessionActivityLog.get(sessionId) || [];
  }

  clearSessionActivity(sessionId: string) {
    this.sessionActivityLog.delete(sessionId);
  }

  getAllSessions() {
    return Array.from(this.sessionActivityLog.keys());
  }
}

export const socketDebugger = new SocketDebugger();