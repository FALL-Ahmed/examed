import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParseLib = require('pdf-parse');
const pdfParse = pdfParseLib.default ?? pdfParseLib;
import { parseText, limitPreview } from './text-parser';
import { parseArText, limitPreviewAr } from './ar-text-parser';

@Injectable()
export class PdfService {

  async parseAndPreview(fileBuffer: Buffer, filename: string) {
    const text = await this.extractText(fileBuffer);
    const result = parseText(text);
    return limitPreview(result);
  }

  async parseAndImport(fileBuffer: Buffer, filename: string) {
    const text = await this.extractText(fileBuffer);
    return parseText(text);
  }

  async parseTextPreview(text: string) {
    const result = parseText(text);
    return limitPreview(result);
  }

  async parseTextImport(text: string) {
    return parseText(text);
  }

  async parseArTextPreview(text: string) {
    const result = parseArText(text);
    return limitPreviewAr(result);
  }

  async parseArTextImport(text: string) {
    return parseArText(text);
  }

  parseJsonImport(json: Record<string, Record<string, any[]>>) {
    const themes: any[] = [];

    for (const [themeName, subThemesData] of Object.entries(json)) {
      const subThemes: any[] = [];

      for (const [subThemeName, questions] of Object.entries(subThemesData)) {
        const parsedQuestions = questions.map((q: any) => ({
          text: q.question || '',
          choiceA: q.options?.A || '',
          choiceB: q.options?.B || '',
          choiceC: q.options?.C || '',
          choiceD: q.options?.D || '',
          choiceE: q.options?.E || '',
          correctAnswer: Array.isArray(q.reponses) ? q.reponses.join(',') : String(q.reponses || ''),
          explanation: q.commentaire || '',
        }));

        subThemes.push({ name: subThemeName, questions: parsedQuestions });
      }

      themes.push({ name: themeName, subThemes });
    }

    const totalSubThemes = themes.reduce((a, t) => a + t.subThemes.length, 0);
    const totalQ = themes.reduce((a, t) => a + t.subThemes.reduce((b: number, s: any) => b + s.questions.length, 0), 0);

    return {
      themes,
      stats: { themes: themes.length, subThemes: totalSubThemes, questions: totalQ },
    };
  }

  private async extractText(fileBuffer: Buffer): Promise<string> {
    const data = await pdfParse(fileBuffer);
    return data.text;
  }
}
