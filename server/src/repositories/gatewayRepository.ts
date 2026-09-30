import { query } from "../db";

export interface ConversationRecord {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: string;
  organization_id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system_notice";
  sanitized_content: string;
  firewall_decision: Record<string, any> | null;
  tokens_in: number;
  tokens_out: number;
  created_at: string;
}

export class GatewayRepository {
  public static async createConversation(
    organizationId: string,
    userId: string,
    title: string = "New AI Conversation"
  ): Promise<ConversationRecord> {
    const res = await query<ConversationRecord>(
      `INSERT INTO ai_conversations (organization_id, user_id, title)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [organizationId, userId, title]
    );
    return res.rows[0];
  }

  public static async getConversations(
    organizationId: string,
    userId: string
  ): Promise<ConversationRecord[]> {
    const res = await query<ConversationRecord>(
      `SELECT * FROM ai_conversations 
       WHERE organization_id = $1 AND user_id = $2
       ORDER BY updated_at DESC`,
      [organizationId, userId]
    );
    return res.rows;
  }

  public static async getConversationById(
    organizationId: string,
    userId: string,
    conversationId: string
  ): Promise<ConversationRecord | null> {
    const res = await query<ConversationRecord>(
      `SELECT * FROM ai_conversations 
       WHERE id = $1 AND organization_id = $2 AND user_id = $3`,
      [conversationId, organizationId, userId]
    );
    return res.rows[0] || null;
  }

  public static async updateConversationTitle(
    organizationId: string,
    userId: string,
    conversationId: string,
    title: string
  ): Promise<void> {
    await query(
      `UPDATE ai_conversations SET title = $1, updated_at = NOW()
       WHERE id = $2 AND organization_id = $3 AND user_id = $4`,
      [title, conversationId, organizationId, userId]
    );
  }

  public static async deleteConversation(
    organizationId: string,
    userId: string,
    conversationId: string
  ): Promise<boolean> {
    const res = await query(
      `DELETE FROM ai_conversations 
       WHERE id = $1 AND organization_id = $2 AND user_id = $3`,
      [conversationId, organizationId, userId]
    );
    return (res.rowCount || 0) > 0;
  }

  public static async addMessage(params: {
    organization_id: string;
    conversation_id: string;
    role: "user" | "assistant" | "system_notice";
    sanitized_content: string;
    firewall_decision?: Record<string, any> | null;
    tokens_in?: number;
    tokens_out?: number;
  }): Promise<MessageRecord> {
    const res = await query<MessageRecord>(
      `INSERT INTO ai_messages (
        organization_id, conversation_id, role, sanitized_content, firewall_decision, tokens_in, tokens_out
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        params.organization_id,
        params.conversation_id,
        params.role,
        params.sanitized_content,
        params.firewall_decision ? JSON.stringify(params.firewall_decision) : null,
        params.tokens_in || 0,
        params.tokens_out || 0
      ]
    );

    // Touch conversation updated_at
    await query(
      `UPDATE ai_conversations SET updated_at = NOW() WHERE id = $1 AND organization_id = $2`,
      [params.conversation_id, params.organization_id]
    );

    return res.rows[0];
  }

  public static async getMessages(
    organizationId: string,
    conversationId: string
  ): Promise<MessageRecord[]> {
    const res = await query<MessageRecord>(
      `SELECT * FROM ai_messages 
       WHERE conversation_id = $1 AND organization_id = $2
       ORDER BY created_at ASC`,
      [conversationId, organizationId]
    );
    return res.rows;
  }
}
