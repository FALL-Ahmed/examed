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

  private async extractText(fileBuffer: Buffer): Promise<string> {
    const data = await pdfParse(fileBuffer);
    return data.text;
  }
}
