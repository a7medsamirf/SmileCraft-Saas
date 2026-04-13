"use server";

import { z } from "zod";
import {
  GEMINI_API_URL,
  createSystemInstruction,
  isGeminiApiKeyConfigured,
  type GeminiRequest,
  type GeminiMessage,
} from "@/lib/gemini/types";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "Message content is required"),
});

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Server Action: Send message to Gemini AI and get response
 * Handles the API call to Gemini with proper error handling and retry logic
 */
export async function sendGeminiMessageAction(
  messages: Array<{ role: string; content: string }>,
  locale: string = "ar",
): Promise<{ success: boolean; response?: string; error?: string; waitTimeSeconds?: number }> {
  const maxRetries = 3;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Validate input
      if (!messages || messages.length === 0) {
        return {
          success: false,
          error: "No messages provided",
        };
      }

      // Check API key
      if (!isGeminiApiKeyConfigured()) {
        return {
          success: false,
          error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.",
        };
      }

      const apiKey = process.env.GEMINI_API_KEY;

      // Validate messages
      const validatedMessages = messages.map((msg) => {
        const validation = chatMessageSchema.safeParse(msg);
        if (!validation.success) {
          throw new Error(`Invalid message: ${validation.error.message}`);
        }
        return validation.data;
      });

      // Convert messages to Gemini format
      const geminiMessages: GeminiMessage[] = validatedMessages.map((msg) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      // Build request payload
      const requestBody: GeminiRequest = {
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        systemInstruction: {
          parts: [{ text: createSystemInstruction(locale) }],
        },
      };

      // Make API call to Gemini
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // Log the request for debugging (only in development)
      if (process.env.NODE_ENV === "development" && !response.ok) {
        console.error("[Gemini Request Body]", JSON.stringify(requestBody, null, 2));
      }

      // Handle rate limiting with retry
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s

        console.warn(
          `[Gemini API] Rate limit hit (attempt ${attempt}/${maxRetries}). Waiting ${waitTime}ms...`,
        );

        if (attempt < maxRetries) {
          await sleep(waitTime);
          continue; // Retry
        }

        // Return the actual wait time for the client to use
        const waitTimeSeconds = retryAfter 
          ? parseInt(retryAfter) 
          : Math.ceil(waitTime / 1000);

        return {
          success: false,
          error: "تم تجاوز حد الاستخدام. يرجى الانتظار قليلاً والمحاولة مرة أخرى. (Rate limit exceeded - please wait a moment and try again)",
          waitTimeSeconds,
        };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("[Gemini API Error]", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });

        // Show the actual Gemini error message if available
        const geminiError = errorData?.error?.message || errorData?.error?.status || "";
        
        const errorMessage =
          response.status === 400
            ? geminiError 
              ? `طلب غير صالح: ${geminiError}`
              : "طلب غير صالح. يرجى التحقق من رسالتك."
            : response.status === 401
              ? "مفتاح API غير صالح."
              : response.status === 403
                ? "ليس لديك صلاحية للوصول."
                : response.status === 404
                  ? "نموذج غير موجود. يرجى التحقق من الإعدادات."
                  : response.status === 429
                    ? "تم تجاوز حد الاستخدام. يرجى الانتظار قليلاً."
                    : response.status === 500
                      ? "خطأ في الخادم. يرجى المحاولة لاحقاً."
                      : `API request failed: ${response.statusText}`;

        return {
          success: false,
          error: errorMessage,
        };
      }

      const data = await response.json();

      // Extract response text from Gemini response
      if (
        !data.candidates ||
        data.candidates.length === 0 ||
        !data.candidates[0].content?.parts?.[0]?.text
      ) {
        return {
          success: false,
          error: "Invalid response from Gemini AI",
        };
      }

      const responseText = data.candidates[0].content.parts[0].text;

      return {
        success: true,
        response: responseText,
      };
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(`[sendGeminiMessageAction] Error (attempt ${attempt}):`, error);

      if (attempt < maxRetries) {
        await sleep(1000 * attempt); // Wait before retry
      }
    }
  }

  return {
    success: false,
    error: lastError || "Failed after multiple retries. Please try again.",
  };
}

/**
 * Server Action: Check if Gemini API is configured
 */
export async function isGeminiConfiguredAction(): Promise<{
  configured: boolean;
}> {
  return {
    configured: isGeminiApiKeyConfigured(),
  };
}
