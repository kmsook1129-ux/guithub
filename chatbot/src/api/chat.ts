export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
}

export interface ChatErrorResponse {
  error: string;
}

/**
 * 백엔드 /api/chat 엔드포인트를 호출하는 함수
 * 프런트엔드 코드에는 OpenAI API Key가 전혀 노출되지 않으며 서버리스 함수를 통해 통신합니다.
 */
export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      data && typeof data.error === 'string'
        ? data.error
        : `요청 처리에 실패했습니다. (상태 코드: ${response.status})`;
    throw new Error(errorMessage);
  }

  if (!data || typeof data.reply !== 'string') {
    throw new Error('응답 데이터의 형식이 올바르지 않습니다.');
  }

  return data.reply;
}

