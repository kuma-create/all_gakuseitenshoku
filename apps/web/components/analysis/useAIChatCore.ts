'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ChatRole = 'user' | 'assistant' | 'system';
export type ChatMsg = { id: string; role: ChatRole; content: string; createdAt: number };
export type BasicMsg = { role: ChatRole; content: string };

// Fallback-safe UUID
const newId = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

/**
 * Headless AIChat core (logic only). No UI. Manages messages &amp; typing.
 * You can inject `onSend` which returns assistant text, or omit it to POST to `endpoint` (defaults to "/api/aichat").
 */
export function useAIChatCore(params: {
  userId: string | null;
  /**
   * Custom onSend. If omitted, the hook will POST to `endpoint` with the built history.
   */
  onSend?: (userText: string, history: BasicMsg[]) => Promise<string>;
  /**
   * When onSend is not provided, POST here. Defaults to "/api/aichat".
   */
  endpoint?: string;
  /**
   * Optional values forwarded to the endpoint when using the built-in onSend.
   */
  mode?: string;
  threadId?: string | null;
  headers?: Record<string, string>;
  /**
   * Custom response mapper when using built-in onSend.
   * Should return the assistant's text content.
   */
  mapResponse?: (json: any) => string;
}) {
  const {
    userId,
    onSend,
    endpoint = '/api/aichat',
    mode,
    threadId,
    headers,
    mapResponse,
  } = params;
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const msgsRef = useRef<ChatMsg[]>([]);
  const aliveRef = useRef(true);

  // Built-in onSend that posts to an API endpoint if a custom onSend isn't provided
  const defaultOnSend = useCallback(
    async (userText: string, history: BasicMsg[]): Promise<string> => {
      try {
        const payload: any = { messages: history };
        if (typeof mode !== 'undefined') payload.mode = mode;
        if (typeof threadId !== 'undefined') payload.threadId = threadId;

        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(headers || {}),
          },
          body: JSON.stringify(payload),
        });

        // Non-2xx: surface a friendly message
        if (!resp.ok) {
          return 'サーバーとの通信で問題が発生しました。少し時間を置いて再度お試しください。';
        }

        const json = await resp.json().catch(() => null);
        if (!json) return '応答の解析に失敗しました。もう一度お試しください。';

        if (mapResponse) {
          const mapped = mapResponse(json);
          if (mapped) return mapped;
        }

        // Common shapes: {content}, {data:{content}}, {answer}
        const content =
          json?.content ??
          json?.data?.content ??
          json?.answer ??
          (Array.isArray(json?.choices) && json.choices[0]?.message?.content) ??
          '';

        return content || 'うまく処理できませんでした。別の聞き方で教えてください。';
      } catch (e) {
        console.warn('defaultOnSend failed:', e);
        return 'うまく処理できませんでした。別の聞き方で教えてください。';
      }
    },
    [endpoint, headers, mapResponse, mode, threadId]
  );

  // Use provided onSend if present; otherwise use the built-in fetcher
  const effectiveOnSend = useMemo(() => onSend ?? defaultOnSend, [onSend, defaultOnSend]);

  // storage key per user (fallback to anon)
  const storageKey = useMemo(() => `aichat:${userId || 'anon'}:messages:v2`, [userId]);

  // load from localStorage once
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed as ChatMsg[]);
          return;
        }
      }
    } catch {}
    // seed assistant welcome only when no valid history
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'こんにちは！今日は何から始めますか？強み整理、経験の棚卸し、将来ビジョン…何でも聞いてください。',
      createdAt: Date.now(),
    }]);
  }, [storageKey]);

  useEffect(() => { msgsRef.current = messages; }, [messages]);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  // persist to localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(messages));
      }
    } catch {}
  }, [messages, storageKey]);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || isTyping) return;

    const userMsg: ChatMsg = { id: newId(), role: 'user', content, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // build short history from the latest ref
    const base = [...msgsRef.current, userMsg];
    const history: BasicMsg[] = base.slice(-10).map((m) => ({ role: m.role, content: m.content }));

    let assistantText = '';
    try {
      assistantText = await effectiveOnSend(content, history);
    } catch (e) {
      console.warn('onSend failed:', e);
      assistantText = 'うまく処理できませんでした。別の聞き方で教えてください。';
    }

    if (!aliveRef.current) return; // component unmounted during await

    const aiMsg: ChatMsg = { id: newId(), role: 'assistant', content: assistantText, createdAt: Date.now() };
    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  }, [effectiveOnSend, isTyping]);

  return { messages, isTyping, send } as const;
}