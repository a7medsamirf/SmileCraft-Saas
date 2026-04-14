"use client";

// =============================================================================
// Smart Assistant — Chat Interface Component
// =============================================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Loader2,
  MessageSquare,
  AlertCircle,
  RotateCcw,
  Bot,
  User,
  Database,
  CheckCircle,
  TrendingUp,
  Users,
  Calendar,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { sendSmartMessageAction } from "@/features/assistant/serverActions";
import type { DataCard, SmartMessageResult } from "@/features/assistant/serverActions";
import type { ChatMessage } from "@/lib/gemini/types";

interface SmartAssistantChatProps {
  isConfigured: boolean;
}

interface EnrichedMessage extends ChatMessage {
  dataCards?: DataCard[];
  isDataMode?: boolean;
}

interface ActionState {
  messages: EnrichedMessage[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ActionState = {
  messages: [],
  isLoading: false,
  error: null,
};

type Action =
  | { type: "SEND_MESSAGE"; payload: string }
  | { type: "RECEIVE_RESPONSE"; payload: { content: string; dataCards?: DataCard[]; isDataMode?: boolean } }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_CHAT" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "CLEAR_ERROR" };

function chatReducer(state: ActionState, action: Action): ActionState {
  switch (action.type) {
    case "SEND_MESSAGE":
      return {
        ...state,
        isLoading: true,
        error: null,
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: "user",
            content: action.payload,
            timestamp: new Date(),
          },
        ],
      };
    case "RECEIVE_RESPONSE":
      return {
        ...state,
        isLoading: false,
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: action.payload.content,
            dataCards: action.payload.dataCards,
            isDataMode: action.payload.isDataMode,
            timestamp: new Date(),
          },
        ],
      };
    case "SET_ERROR":
      return { ...state, isLoading: false, error: action.payload };
    case "CLEAR_CHAT":
      return initialState;
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

export function SmartAssistantChat({ isConfigured }: SmartAssistantChatProps) {
  const t = useTranslations("SmartAssistant");
  const locale = useLocale();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [state, dispatch] = React.useReducer(chatReducer, initialState);
  const [inputValue, setInputValue] = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  // Cooldown timer for rate limiting
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(
        () => setCooldownSeconds(cooldownSeconds - 1),
        1000,
      );
      return () => clearTimeout(timer);
    } else if (cooldownSeconds === 0 && isRateLimited) {
      setIsRateLimited(false);
      dispatch({ type: "CLEAR_ERROR" });
    }
  }, [cooldownSeconds, isRateLimited]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120,
      )}px`;
    }
  }, [inputValue]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || state.isLoading) return;

    const message = inputValue.trim();
    setInputValue("");
    dispatch({ type: "SEND_MESSAGE", payload: message });

    try {
      // Build chat history for context
      const chatHistory = state.messages.slice(-6).map((msg) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      }));

      // Single unified call
      const result: SmartMessageResult = await sendSmartMessageAction(
        message,
        locale,
        chatHistory,
      );

      if (result.success && result.response) {
        dispatch({
          type: "RECEIVE_RESPONSE",
          payload: {
            content: result.response,
            dataCards: result.dataCards,
            isDataMode: !!result.dataCards && result.dataCards.length > 0,
          },
        });
        setIsRateLimited(false);
        setCooldownSeconds(0);
      } else {
        const isRateLimit =
          result.error?.includes("Rate limit") ||
          result.error?.includes("حد الاستخدام") ||
          result.error?.includes("rate limit");

        if (isRateLimit) {
          setIsRateLimited(true);
          const waitTime = result.waitTimeSeconds || 30;
          setCooldownSeconds(waitTime);
          dispatch({ type: "SET_ERROR", payload: "RATE_LIMITED" });
        } else {
          dispatch({
            type: "SET_ERROR",
            payload: result.error || t("errorResponse"),
          });
        }
      }
    } catch (error) {
      dispatch({
        type: "SET_ERROR",
        payload: error instanceof Error ? error.message : t("errorGeneral"),
      });
    }
  }, [inputValue, state.messages, state.isLoading, locale, t]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    dispatch({ type: "CLEAR_CHAT" });
  };

  // Quick action buttons — locale-aware
  const quickActions = [
    { icon: Users, labelKey: "quickPatientCount" as const, sqlMode: true },
    { icon: MessageSquare, labelKey: "quickTreatment" as const, sqlMode: false },
    { icon: Calendar, labelKey: "quickTodayAppointments" as const, sqlMode: true },
    { icon: Receipt, labelKey: "quickMonthlyPayments" as const, sqlMode: true },
  ];

  // =========================================================================
  // Not configured state
  // =========================================================================

  if (!isConfigured) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6"
        >
          <AlertCircle className="w-10 h-10 text-amber-500" />
        </motion.div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
          {t("notConfiguredTitle")}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
          {t("notConfiguredDescription")}
        </p>
        <code className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono">
          GEMINI_API_KEY=your_api_key_here
        </code>
      </div>
    );
  }

  // =========================================================================
  // Render data card
  // =========================================================================

  function renderDataCard(card: DataCard, index: number) {
    if (card.type === "count" || card.type === "sum") {
      return (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              {card.type === "count" ? (
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
              {t("dataFromSystem")}
            </span>
            <CheckCircle className="w-3 h-3 text-emerald-500 ms-auto" />
          </div>
          <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
            {typeof card.value === "number"
              ? card.value.toLocaleString(locale === "ar" ? "ar-EG" : "en-US")
              : card.value}
          </p>
          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
            {card.explanation}
          </p>
        </motion.div>
      );
    }

    if (card.type === "table" && card.rows && card.rows.length > 0) {
      return (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <Database className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
              {t("dataFromSystem")}
            </span>
            <span className="text-[10px] text-slate-500 ms-auto">
              {card.rows.length} {t("recordsFound")}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900">
                  {card.columns?.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-start font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {card.rows.slice(0, 10).map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    {card.columns?.map((col) => (
                      <td
                        key={col}
                        className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap"
                      >
                        {formatCellValue(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {card.rows.length > 10 && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 p-2 text-center border-t border-slate-200 dark:border-slate-700">
              {t("showingFirst", { count: 10, total: card.rows.length })}
            </p>
          )}
        </motion.div>
      );
    }

    return null;
  }

  // =========================================================================
  // Main render
  // =========================================================================

  return (
    <div className="glass-card flex flex-col h-[calc(100vh-20rem)] min-h-[600px] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30"
          >
            <Bot className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t("title")}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {t("subtitle")}
            </p>
          </div>
        </div>

        {state.messages.length > 0 && (
          <Button
            onClick={handleClearChat}
            variant="outline"
            size="sm"
            className="rounded-xl gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {t("clearChat")}
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-900/50">
        <AnimatePresence mode="popLayout">
          {state.messages.length === 0 && (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center h-full text-center py-20"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 flex items-center justify-center mb-6"
              >
                <MessageSquare className="w-12 h-12 text-violet-500" />
              </motion.div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">
                {t("welcomeTitle")}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
                {t("welcomeDescription")}
              </p>

              {/* Quick Actions */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {quickActions.map((item, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    onClick={() => {
                      setInputValue(t(item.labelKey));
                      textareaRef.current?.focus();
                    }}
                    className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-500 dark:hover:border-violet-500 transition-all text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400"
                  >
                    <item.icon className="w-5 h-5 text-violet-500" />
                    {t(item.labelKey)}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {state.messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
                }`}
              >
                {/* Data mode indicator */}
                {message.isDataMode && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {t("dataFromSystem")}
                    </span>
                    <CheckCircle className="w-3 h-3 text-emerald-500 ms-auto" />
                  </div>
                )}

                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>

                {/* Data cards */}
                {message.dataCards?.map((card, cardIdx) =>
                  renderDataCard(card, cardIdx),
                )}

                <p
                  className={`text-[10px] mt-2 ${
                    message.role === "user"
                      ? "text-blue-100"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString(
                    locale === "ar" ? "ar-EG" : "en-US",
                    { hour: "2-digit", minute: "2-digit" },
                  )}
                </p>
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              )}
            </motion.div>
          ))}

          {state.isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-start"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {t("thinking")}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {state.error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {t("errorTitle")}
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                {isRateLimited
                  ? t("errorRateLimit", { seconds: cooldownSeconds })
                  : state.error}
              </p>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("inputPlaceholder")}
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            disabled={state.isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || state.isLoading || isRateLimited}
            size="icon"
            className="rounded-2xl h-12 w-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/30 relative"
          >
            {state.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRateLimited ? (
              <span className="text-xs font-bold">{cooldownSeconds}</span>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 text-center">
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Utility: Format cell value for table display
// =============================================================================

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "✅" : "❌";
  if (value instanceof Date) return value.toLocaleDateString("ar-EG");
  if (typeof value === "object") return JSON.stringify(value);

  const str = String(value);

  // Format ISO date strings
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    try {
      const d = new Date(str);
      return d.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return str;
    }
  }

  // Format status labels
  const statusMap: Record<string, string> = {
    SCHEDULED: "📅 مجدول",
    CONFIRMED: "✅ مؤكد",
    COMPLETED: "✔️ مكتمل",
    CANCELLED: "❌ ملغي",
    NO_SHOW: "⚠️ لم يحضر",
    PAID: "💰 مدفوعة",
    PARTIAL: "⏳ جزئي",
    OVERDUE: "🔴 متأخرة",
    DRAFT: "📝 مسودة",
    PLANNED: "📋 مخطط",
    IN_PROGRESS: "🔄 جاري",
    MALE: "👨 ذكر",
    FEMALE: "👩 أنثى",
  };

  if (statusMap[str]) return statusMap[str];

  return str;
}
