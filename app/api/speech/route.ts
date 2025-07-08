import { experimental_generateSpeech as generateSpeech } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { text } = await req.json();

  if (!text) {
    return new Response('Text is required', { status: 400 });
  }

  try {
    const { audio } = await generateSpeech({
      model: openai.speech('gpt-4o-mini-tts'),
      text,
      voice: 'alloy',
    });

    // Manually create a ReadableStream from the audio data
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(audio.uint8Array);
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
    
  } catch (error) {
    console.error('Error generating speech:', error);
    return new Response('Error generating speech', { status: 500 });
  }
} 