import type { MessageDeletedBy, MessageType } from "@prisma/generated/enums";

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string | null;
  type: MessageType;
  content: string;
  deletedAt: Date | null;
  deletedBy: MessageDeletedBy | null;
  deletedByUserId: string | null;
  createdAt: Date;
}

export function serializeMessage(message: MessageRecord) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    type: message.type,
    content: message.deletedAt ? null : message.content,
    deletedAt: message.deletedAt,
    deletedBy: message.deletedBy,
    createdAt: message.createdAt,
  };
}

export function serializeAdminMessage(message: MessageRecord) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    type: message.type,
    content: message.content,
    deletedAt: message.deletedAt,
    deletedBy: message.deletedBy,
    deletedByUserId: message.deletedByUserId,
    createdAt: message.createdAt,
  };
}
