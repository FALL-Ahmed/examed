import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  async uploadImage(file: Express.Multer.File): Promise<string | undefined> {
    const ext = file.originalname.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await this.supabase.storage
      .from('question-images')
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) {
      console.error('Supabase Storage upload error:', error.message);
      return undefined;
    }

    const { data } = this.supabase.storage.from('question-images').getPublicUrl(filename);
    return data.publicUrl;
  }

  async uploadFiche(file: Express.Multer.File): Promise<string | undefined> {
    const ext = file.originalname.split('.').pop() || 'pdf';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await this.supabase.storage
      .from('fiches-memo')
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) {
      console.error('Supabase Storage upload error:', error.message);
      return undefined;
    }

    const { data } = this.supabase.storage.from('fiches-memo').getPublicUrl(filename);
    return data.publicUrl;
  }

  // Vignettes persistées dans Supabase : le disque Render Free est effacé à chaque mise en veille
  async getFicheThumb(ficheId: string): Promise<Buffer | null> {
    const { data, error } = await this.supabase.storage
      .from('fiches-memo')
      .download(`thumbs/${ficheId}.webp`);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }

  async saveFicheThumb(ficheId: string, buffer: Buffer): Promise<void> {
    const { error } = await this.supabase.storage
      .from('fiches-memo')
      .upload(`thumbs/${ficheId}.webp`, buffer, { contentType: 'image/webp', upsert: true });
    if (error) console.error('Supabase Storage thumb upload error:', error.message);
  }

  async uploadReceipt(file: Express.Multer.File): Promise<string | undefined> {
    const ext = file.originalname.split('.').pop() || 'jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await this.supabase.storage
      .from('receipts')
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) {
      console.error('Supabase Storage upload error:', error.message);
      return undefined;
    }

    const { data } = this.supabase.storage.from('receipts').getPublicUrl(filename);
    return data.publicUrl;
  }
}
