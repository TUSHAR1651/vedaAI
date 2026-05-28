import { io, Socket } from 'socket.io-client';

/** Server -> Client + Client -> Server event names (mirror of backend). */
export const WS_EVENTS = {
  JOIN_ASSIGNMENT: 'join_assignment',
  LEAVE_ASSIGNMENT: 'leave_assignment',
  GENERATION_STARTED: 'generation_started',
  GENERATION_PROGRESS: 'generation_progress',
  GENERATION_COMPLETED: 'generation_completed',
  GENERATION_FAILED: 'generation_failed',
  PDF_STARTED: 'pdf_started',
  PDF_COMPLETED: 'pdf_completed',
  PDF_FAILED: 'pdf_failed',
} as const;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

/** Lazily-created singleton Socket.io client shared across the app. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}
