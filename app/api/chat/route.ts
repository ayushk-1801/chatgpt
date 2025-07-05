import { openai } from '@ai-sdk/openai';
import { streamText, convertToCoreMessages, UIMessage } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
      model: openai('gpt-4o'),
      system: 'You are a helpful assistant. Provide clear, concise, and accurate responses.',
      messages: convertToCoreMessages(messages),
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 