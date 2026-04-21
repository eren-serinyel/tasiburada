import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AppError, ValidationError } from '../../domain/errors/AppError';

const DEFAULT_AI_BASE_URL = 'http://127.0.0.1:8045/v1';
const DEFAULT_AI_MODEL = 'gemini-3-flash';

type SupportedChatRole = 'system' | 'user' | 'assistant';

interface ChatMessageInput {
  role: SupportedChatRole;
  content: string;
}

interface ChatRequestInput {
  message?: string;
  messages?: ChatMessageInput[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponseOutput {
  content: string;
  model: string;
  usage?: unknown;
}

export class AiService {
  async chat(input: ChatRequestInput): Promise<ChatResponseOutput> {
    const { apiKey, baseURL, model } = this.getConfig(input.model);
    const client = new OpenAI({ apiKey, baseURL });
    const messages = this.normalizeMessages(input);

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: input.temperature,
      max_tokens: input.maxTokens,
    });

    return {
      content: response.choices[0]?.message?.content ?? '',
      model: response.model,
      usage: response.usage,
    };
  }

  getStatus() {
    return {
      configured: Boolean(process.env.AI_API_KEY || process.env.OPENAI_API_KEY),
      baseURL: process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL,
      model: process.env.AI_MODEL || DEFAULT_AI_MODEL,
    };
  }

  private getConfig(requestedModel?: string) {
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new AppError('AI servisi yapılandırılmamış: AI_API_KEY gerekli.', 503, 'AI_NOT_CONFIGURED');
    }

    return {
      apiKey,
      baseURL: process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL,
      model: requestedModel || process.env.AI_MODEL || DEFAULT_AI_MODEL,
    };
  }

  private normalizeMessages(input: ChatRequestInput): ChatCompletionMessageParam[] {
    if (Array.isArray(input.messages) && input.messages.length > 0) {
      return input.messages.map((message) => this.normalizeMessage(message));
    }

    if (typeof input.message === 'string' && input.message.trim().length > 0) {
      return [{ role: 'user', content: input.message.trim() }];
    }

    throw new ValidationError('message veya messages alanı zorunludur.');
  }

  private normalizeMessage(message: ChatMessageInput): ChatCompletionMessageParam {
    if (!['system', 'user', 'assistant'].includes(message.role)) {
      throw new ValidationError('Geçersiz mesaj rolü.');
    }

    if (typeof message.content !== 'string' || message.content.trim().length === 0) {
      throw new ValidationError('Mesaj içeriği boş olamaz.');
    }

    return {
      role: message.role,
      content: message.content.trim(),
    };
  }
}
