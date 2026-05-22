import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nexus-secret-key-2024';
const userSockets = new Map<string, string>();

export const setupSocket = (io: Server) => {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      (socket as Socket & { userId: string }).userId = payload.userId;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as Socket & { userId: string }).userId;
    userSockets.set(userId, socket.id);

    socket.join(`user:${userId}`);

    socket.on('send_message', (data: { receiverId: string; content: string; messageId: string }) => {
      io.to(`user:${data.receiverId}`).emit('new_message', {
        ...data,
        senderId: userId
      });
    });

    socket.on('typing', (data: { receiverId: string }) => {
      io.to(`user:${data.receiverId}`).emit('typing', { senderId: userId });
    });

    socket.on('stop_typing', (data: { receiverId: string }) => {
      io.to(`user:${data.receiverId}`).emit('stop_typing', { senderId: userId });
    });

    socket.on('disconnect', () => {
      userSockets.delete(userId);
    });
  });
};
