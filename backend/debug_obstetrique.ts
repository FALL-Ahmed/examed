import * as fs from 'fs';
import * as JSZip from 'jszip';

const INPUT = 'C:\\Users\\PC\\Telechargement\\Guide-de-la-sage-femme-correction.docx';

async function extractParagraphs(docxPath: string): Promise<{ style: string; text: string }[]> {
  const buf = fs.readFileSync(docxPath);
  const zip = await (JSZip as any).loadAsync(buf);
  const xml: string = await zip.file('word/document.xml').async('string');
  const paraRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  const styleRegex = /<w:pStyle w:val="([^"]+)"/;
  const paras: { style: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = paraRegex.exec(xml)) !== null) {
    const sm = styleRegex.exec(m[0]);
    const style = sm ? sm[1] : 'Normal';
    const text = m[0].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text) paras.push({ style, text });
  }
  return paras;
}

async function main() {
  const paras = await extractParagraphs(INPUT);

  // Trouver le début de la section Obstetrique
  let inObs = false;
  let count = 0;

  for (const { style, text } of paras) {
    if ((style === 'Titre2' || style === 'Heading2') && text.toLowerCase().includes('obstetrique')) {
      inObs = true;
      console.log('\n=== SECTION:', text, '===\n');
      continue;
    }
    // Arrêter à la section suivante
    if (inObs && (style === 'Titre2' || style === 'Heading2') && !text.toLowerCase().includes('obstetrique')) {
      break;
    }
    if (inObs) {
      // Afficher seulement les 120 premiers paragraphes
      if (count < 120) {
        console.log(`[${style}] "${text}"`);
        count++;
      }
    }
  }
}

main().catch(console.error);
