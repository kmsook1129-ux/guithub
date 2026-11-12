import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { sendChatMessage, type ChatMessage } from '../api/chat';
import './Chatbot.css';

const INITIAL_GREETING = `안녕하세요! 👋 
저는 당신의 학습을 돕는 **영어 단어 퀴즈 챗봇**입니다.

공부하고 싶은 **주제**(예: 여행, 비즈니스, 일상 회화 등)와 **난이도**(초급, 중급, 고급)를 알려주세요.
맞춤 단어 3개와 복습 퀴즈를 준비해 드릴게요!`;

const QUICK_TOPICS = [
  '✈️ 여행 영어 (초급)',
  '💼 비즈니스 미팅 (중급)',
  '☕ 일상 카페/식당 (초급)',
  '🎯 토익 빈출 어휘 (고급)',
];

export function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: INITIAL_GREETING,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    setErrorMessage(null);
    setInput('');

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(newMessages);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
      // 입력창 포커스 복원
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: 'assistant',
        content: INITIAL_GREETING,
      },
    ]);
    setInput('');
    setErrorMessage(null);
  };

  return (
    <div className="chatbot-container">
      {/* 헤더 */}
      <header className="chatbot-header">
        <div className="chatbot-header-info">
          <div className="chatbot-avatar">📖</div>
          <div>
            <h1 className="chatbot-title">영어 단어 퀴즈 챗봇</h1>
            <p className="chatbot-subtitle">gpt-6-luna 기반 맞춤형 어휘 학습 및 복습 퀴즈</p>
          </div>
        </div>
        <button
          type="button"
          className="chatbot-reset-btn"
          onClick={handleReset}
          title="대화 다시 시작"
        >
          🔄 새로고침
        </button>
      </header>

      {/* 추천 칩 (첫 대화 시 도움말) */}
      {messages.length === 1 && (
        <div className="chatbot-quick-chips">
          <span className="chatbot-quick-title">💡 빠른 주제 선택:</span>
          <div className="chatbot-chips-list">
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                className="chatbot-chip"
                onClick={() => handleSendMessage(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="chatbot-messages">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`chatbot-message-row ${isUser ? 'user' : 'assistant'}`}
            >
              {!isUser && <div className="chatbot-msg-avatar">🤖</div>}
              <div className={`chatbot-bubble ${isUser ? 'user' : 'assistant'}`}>
                <div className="chatbot-bubble-text">{msg.content}</div>
              </div>
              {isUser && <div className="chatbot-msg-avatar user">👤</div>}
            </div>
          );
        })}

        {/* 로딩 표시 */}
        {isLoading && (
          <div className="chatbot-message-row assistant">
            <div className="chatbot-msg-avatar">🤖</div>
            <div className="chatbot-bubble assistant loading">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="loading-text">단어와 퀴즈를 생성하고 있어요...</span>
            </div>
          </div>
        )}

        {/* 에러 안내 */}
        {errorMessage && (
          <div className="chatbot-error-banner">
            <span className="chatbot-error-icon">⚠️</span>
            <div className="chatbot-error-text">
              <strong>오류가 발생했습니다:</strong> {errorMessage}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <form className="chatbot-input-form" onSubmit={handleSubmit}>
        <div className="chatbot-input-wrapper">
          <textarea
            ref={textareaRef}
            className="chatbot-textarea"
            placeholder="주제(예: 비즈니스)나 난이도, 또는 퀴즈 정답을 입력하세요... (Enter: 전송)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="chatbot-send-btn"
            disabled={!input.trim() || isLoading}
            aria-label="메시지 전송"
          >
            {isLoading ? (
              <span className="chatbot-btn-spinner" />
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>
        <p className="chatbot-input-hint">
          <span>Tip: Shift + Enter로 줄바꿈을 할 수 있습니다.</span>
          <span>API Key는 서버 환경 변수에서 안전하게 보호됩니다.</span>
        </p>
      </form>
    </div>
  );
}

export default Chatbot;
