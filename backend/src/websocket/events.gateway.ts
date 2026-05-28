import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { assignmentRoom, WS_EVENTS } from './ws-events';

/**
 * Socket.io gateway. Clients join a per-assignment room and receive scoped
 * lifecycle events. CORS origins come from config and are wired in main.ts via
 * a custom adapter; the decorator default below covers the dev origin.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /** Client -> Server: subscribe to all updates for one assignment. */
  @SubscribeMessage(WS_EVENTS.JOIN_ASSIGNMENT)
  handleJoin(@MessageBody() data: { assignmentId: string }, @ConnectedSocket() client: Socket) {
    if (!data?.assignmentId) return { ok: false };
    client.join(assignmentRoom(data.assignmentId));
    this.logger.debug(`${client.id} joined ${assignmentRoom(data.assignmentId)}`);
    return { ok: true, room: assignmentRoom(data.assignmentId) };
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_ASSIGNMENT)
  handleLeave(@MessageBody() data: { assignmentId: string }, @ConnectedSocket() client: Socket) {
    if (!data?.assignmentId) return { ok: false };
    client.leave(assignmentRoom(data.assignmentId));
    return { ok: true };
  }

  /** Emit an event to everyone watching a given assignment. */
  emitToAssignment(assignmentId: string, event: string, payload: unknown) {
    this.server?.to(assignmentRoom(assignmentId)).emit(event, payload);
  }
}
