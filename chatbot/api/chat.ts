import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

/**
 * 나중에 쉽게 수정할 수 있도록 별도 상수로 분리한 시스템 프롬프트
 */
export const SYSTEM_PROMPT = `당신은 영어 학습자를 돕는 친절하고 유익한 '영어 단어 퀴즈 챗봇'입니다.
다음 규칙을 엄격하게 준수하여 답변하세요:

1. [언어 및 어조]:
   - 답변은 한국어로 간결하고 명확하게 작성하세요. 불필요한 장황한 설명은 피하세요.

2. [정보 확인]:
   - 사용자가 원하는 '주제'(예: 여행, 비즈니스, 일상 회화 등)나 '난이도'(예: 초급, 중급, 고급)를 구체적으로 제시하지 않았다면, 단어를 바로 제시하지 마세요.
   - 먼저 학습하고 싶은 주제나 난이도를 친절하게 물어보세요.

3. [단어 제시 규칙]:
   - 사용자가 주제나 난이도를 알려주면, 그에 꼭 맞는 영어 단어를 한 번에 최대 3개까지만 알려주세요.
   - 각 단어마다 다음 형식을 갖추어 보기 쉽게 정리해 주세요:
     * 단어 및 한국어 뜻
     * 짧은 영어 예문과 한국어 해석

4. [복습 퀴즈]:
   - 단어 소개가 끝나면, 마지막 부분에 방금 학습한 단어와 관련된 짧은 복습 퀴즈를 딱 1개만 내주세요. (예: 빈칸 채우기, 사지선다 객관식, 뜻 맞히기 등)

5. [대화 및 피드백]:
   - 사용자가 퀴즈의 답을 제출하면 정답 여부를 알려주고, 짧은 격려와 함께 다음 주제/난이도를 물어보거나 추가 학습을 이끌어 주세요.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. POST 요청만 지원합니다.' });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(500).json({
      error: '서버에 OPENAI_API_KEY가 설정되어 있지 않습니다. .env.local 파일에 API 키를 입력해 주세요.',
    });
  }

  try {
    const { messages } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages 배열이 비어있거나 유효하지 않습니다.' });
    }

    const openai = new OpenAI({ apiKey });

    // OpenAI Responses API 호출 (gpt-6-luna, reasoning.effort: none)
    const response = await openai.responses.create({
      model: 'gpt-6-luna',
      reasoning: {
        effort: 'none',
      },
      instructions: SYSTEM_PROMPT,
      input: messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    });

    const reply = response.output_text ?? '';

    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error('Error handling /api/chat:', error);
    const message = error?.message || 'OpenAI API 호출 중 오류가 발생했습니다.';
    const statusCode = typeof error?.status === 'number' && error.status >= 400 && error.status < 600 ? error.status : 500;
    return res.status(statusCode).json({ error: message });
  }
}

