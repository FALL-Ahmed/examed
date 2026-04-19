import { Injectable, BadGatewayException } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { parseText, limitPreview } from './text-parser';

@Injectable()
export class PdfService {
  private parserUrl = process.env.PDF_PARSER_URL || 'http://localhost:8000';

  async parseAndPreview(fileBuffer: Buffer, filename: string) {
    return this.sendToParser('/parse-preview', fileBuffer, filename);
  }

  async parseAndImport(fileBuffer: Buffer, filename: string) {
    return this.sendToParser('/parse', fileBuffer, filename);
  }

  async parseTextPreview(text: string) {
    const result = parseText(text);
    return limitPreview(result);
  }

  async parseTextImport(text: string) {
    return parseText(text);
  }

  private async sendToParser(endpoint: string, fileBuffer: Buffer, filename: string) {
    try {
      const form = new FormData();
      form.append('file', fileBuffer, { filename, contentType: 'application/pdf' });
      const response = await axios.post(`${this.parserUrl}${endpoint}`, form, {
        headers: form.getHeaders(),
        timeout: 120000,
      });
      return response.data;
    } catch (error) {
      throw new BadGatewayException(`Erreur du parser PDF: ${error.message}`);
    }
  }
}
