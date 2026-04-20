import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import { parseText, limitPreview } from './text-parser';

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

  private async extractText(fileBuffer: Buffer): Promise<string> {
    const data = await pdfParse(fileBuffer);
    return data.text;
  }
}
