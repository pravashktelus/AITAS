import OpenAI from 'openai';
import { Logger } from './Logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from features/ directory where the API keys are stored
dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Also try root .env as fallback
dotenv.config();

/**
 * Centralized OpenAI API client — optimized for minimal token usage.
 * 
 * Token optimization strategies:
 * 1. Uses gpt-4o-mini for locator suggestions (cheap, fast, good enough)
 * 2. Uses gpt-4o-mini for failure analysis (structured output, no creativity needed)
 * 3. Limits DOM context to 1500 chars max
 * 4. Concise system prompts (saves ~200 tokens per call)
 * 5. Caches repeated suggestions for same locator patterns
 * 6. max_tokens capped aggressively per use case
 */
export class OpenAIClient {
  private static instance: OpenAI;
  private static suggestionCache: Map<string, string> = new Map();
  private static totalTokensUsed: number = 0;

  // Models — use cheapest that works
  private static readonly MODEL_LOCATOR = 'gpt-4o-mini'; // ~$0.15/1M input tokens
  private static readonly MODEL_ANALYSIS = 'gpt-4o-mini'; // ~$0.15/1M input tokens
  private static readonly MODEL_VISUAL = 'gpt-4o-mini';  // For visual tasks where needed

  static getInstance(): OpenAI {
    if (!this.instance) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        Logger.warn('OPENAI_API_KEY not set in environment. OpenAI features will be limited.');
      }
      this.instance = new OpenAI({ apiKey });
    }
    return this.instance;
  }

  static getTokenUsage(): number {
    return this.totalTokensUsed;
  }

  private static trackTokens(response: any): void {
    const usage = response?.usage;
    if (usage) {
      this.totalTokensUsed += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
      Logger.debug(`OpenAI tokens this call: ${usage.prompt_tokens + usage.completion_tokens} | Total session: ${this.totalTokensUsed}`);
    }
  }

  static async suggestSelfHeal(
    originalLocator: string,
    elementContext: string,
    pageState: string
  ): Promise<string> {
    // Cache key: hash of locator + truncated context
    const cacheKey = `${originalLocator}::${elementContext.substring(0, 200)}`;
    if (this.suggestionCache.has(cacheKey)) {
      Logger.debug('Using cached self-heal suggestion');
      return this.suggestionCache.get(cacheKey)!;
    }

    try {
      const client = this.getInstance() as any;

      // Trim DOM context aggressively — only need 1500 chars max
      const trimmedContext = elementContext.substring(0, 1500);

      const response = await client.chat.completions.create({
        model: this.MODEL_LOCATOR,
        max_tokens: 150, // Locator suggestions are short strings
        temperature: 0, // Deterministic — no creativity needed
        messages: [
          {
            role: 'system',
            content: 'Return ONLY alternative Playwright locators, one per line. No explanations.',
          },
          {
            role: 'user',
            content: `Locator failed: ${originalLocator}\nContext:\n${trimmedContext}\nSuggest 2-3 alternatives.`,
          },
        ],
      });

      this.trackTokens(response);
      const suggestion = response.choices[0]?.message?.content || '';
      Logger.info(`Self-heal suggestion: ${suggestion.substring(0, 80)}`);

      // Cache for reuse
      this.suggestionCache.set(cacheKey, suggestion.trim());
      return suggestion.trim();
    } catch (error) {
      Logger.error(`Failed to generate self-heal suggestion: ${error}`);
      return '';
    }
  }

  static async analyzeFailure(
    failureMessage: string,
    lastActions: string[],
    screenshot?: string
  ): Promise<string> {
    try {
      const client = this.getInstance() as any;

      // Truncate error message to essential info only
      const trimmedError = failureMessage.substring(0, 500);
      const recentActions = lastActions.slice(-5).join(' -> '); // Only last 5 actions

      const response = await client.chat.completions.create({
        model: this.MODEL_ANALYSIS,
        max_tokens: 200, // Reduced from 300 — concise analysis
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'Analyze test failure concisely. Format: Cause: <1 line> | Fixes: 1. <fix1> 2. <fix2> 3. <fix3>',
          },
          {
            role: 'user',
            content: `Error: ${trimmedError}\nActions: ${recentActions}`,
          },
        ],
      });

      this.trackTokens(response);
      const analysis = response.choices[0]?.message?.content || '';
      Logger.info(`Failure Analysis: ${analysis.substring(0, 100)}...`);
      return analysis;
    } catch (error) {
      Logger.error(`Failed to analyze failure: ${error}`);
      return 'Failure analysis unavailable - could not connect to OpenAI API';
    }
  }

  static async analyzeScreenshot(
    imageBase64: string,
    context: string
  ): Promise<string> {
    try {
      const client = this.getInstance() as any;
      const response = await client.chat.completions.create({
        model: this.MODEL_VISUAL,
        max_tokens: 256, // Reduced from 1024 — brief insights only
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: `Briefly analyze this UI screenshot for testing. Context: ${context.substring(0, 200)}. List issues found (max 3 bullet points).`,
          },
        ],
      });

      this.trackTokens(response);
      const analysisResult = response.choices[0]?.message?.content || '';
      Logger.info(`Screenshot Analysis: ${analysisResult.substring(0, 100)}...`);
      return analysisResult;
    } catch (error) {
      Logger.error(`Failed to analyze screenshot: ${error}`);
      return 'Screenshot analysis unavailable - could not connect to OpenAI API';
    }
  }

  static async validateVisuals(
    currentImageBase64: string,
    expectedImageBase64: string,
    testContext: string
  ): Promise<{ match: boolean; feedback: string }> {
    try {
      const client = this.getInstance() as any;
      const response = await client.chat.completions.create({
        model: this.MODEL_VISUAL,
        max_tokens: 100, // Reduced from 512 — just need match + brief diff
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'Return JSON only: {"match":bool,"differences":"brief description"}',
          },
          {
            role: 'user',
            content: `Compare current vs expected UI. Context: ${testContext.substring(0, 150)}`,
          },
        ],
      });

      this.trackTokens(response);
      const result = response.choices[0]?.message?.content || '{}';
      try {
        const parsed = JSON.parse(result);
        return {
          match: parsed.match || false,
          feedback: parsed.differences || 'No differences detected',
        };
      } catch {
        return {
          match: false,
          feedback: 'Visual validation could not be completed',
        };
      }
    } catch (error) {
      Logger.error(`Failed to validate visuals: ${error}`);
      return { match: false, feedback: 'Visual validation failed - could not connect to OpenAI API' };
    }
  }
}
