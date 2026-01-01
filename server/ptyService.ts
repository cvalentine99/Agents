/**
 * REAL PTY Terminal Service
 * Actually spawns shell processes and streams output
 */

import * as pty from 'node-pty';
import { EventEmitter } from 'events';

export interface PtySession {
  id: string;
  ptyProcess: pty.IPty;
  cwd: string;
  createdAt: Date;
  userId: string;
}

class PtyService extends EventEmitter {
  private sessions: Map<string, PtySession> = new Map();

  /**
   * Create a new PTY session with a real shell
   */
  createSession(sessionId: string, userId: string, cwd: string = '/home/ubuntu'): PtySession {
    // Kill existing session if any
    this.killSession(sessionId);

    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
    });

    const session: PtySession = {
      id: sessionId,
      ptyProcess,
      cwd,
      createdAt: new Date(),
      userId,
    };

    // Stream output to event emitter
    ptyProcess.onData((data: string) => {
      this.emit('output', sessionId, data);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      this.emit('exit', sessionId, exitCode, signal);
      this.sessions.delete(sessionId);
    });

    this.sessions.set(sessionId, session);
    this.emit('created', sessionId);

    return session;
  }

  /**
   * Write input to a PTY session
   */
  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    session.ptyProcess.write(data);
    return true;
  }

  /**
   * Execute a command in a PTY session
   */
  executeCommand(sessionId: string, command: string): boolean {
    return this.write(sessionId, command + '\n');
  }

  /**
   * Resize PTY terminal
   */
  resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    session.ptyProcess.resize(cols, rows);
    return true;
  }

  /**
   * Kill a PTY session
   */
  killSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    session.ptyProcess.kill();
    this.sessions.delete(sessionId);
    this.emit('killed', sessionId);
    return true;
  }

  /**
   * Get session info
   */
  getSession(sessionId: string): PtySession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): PtySession[] {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  /**
   * Check if session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}

// Singleton instance
export const ptyService = new PtyService();
