
'use server';
/**
 * @fileOverview نظام تحويل النص إلى صوت للمساعد الذكي.
 * يستخدم موديل gemini-2.5-flash-preview-tts لتوليد أصوات طبيعية.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';
import { googleAI } from '@genkit-ai/google-genai';

const TTSInputSchema = z.string().describe('النص المراد تحويله إلى صوت.');
const TTSOutputSchema = z.object({
  media: z.string().describe('بيانات الصوت بصيغة Base64/WAV.'),
});

export async function generateSpeech(text: string): Promise<{ media: string }> {
  return generateSpeechFlow(text);
}

const generateSpeechFlow = ai.defineFlow(
  {
    name: 'generateSpeechFlow',
    inputSchema: TTSInputSchema,
    outputSchema: TTSOutputSchema,
  },
  async (text) => {
    // إزالة رموز الماركداون والرموز التعبيرية للحصول على صوت أنقى
    const cleanText = text.replace(/[*#_~`>\[\]()]/g, '').replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' },
          },
        },
      },
      prompt: cleanText,
    });

    if (!media) {
      throw new Error('فشل توليد الصوت من الموديل.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    return {
      media: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
