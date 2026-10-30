// Gera os documentos de exemplo fictícios em public/samples (SVG local).
// Uso: node scripts/generate-samples.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const PRESCRIBER = 'Dra. Helena Prado';
const CRM = 'CRM-DF 000000 (fictício)';
const MEDS = {
  los: ['Losartana potássica 50 mg', 'Comprimido'],
  met: ['Cloridrato de metformina 850 mg', 'Comprimido'],
  sin: ['Sinvastatina 20 mg', 'Comprimido'],
};

const docs = [
  { file: 'receita-maria-sem-data', patient: 'Maria das Graças Oliveira', date: null, meds: ['los', 'met'], category: 'Receituário simples' },
  { file: 'receita-maria-corrigida', patient: 'Maria das Graças Oliveira', date: '29/10/2026', meds: ['los', 'met'], category: 'Receituário simples', corrected: true },
  { file: 'receita-maria-direta', patient: 'Maria das Graças Oliveira', date: '20/10/2026', meds: ['los', 'met'], category: 'Receituário simples' },
  { file: 'receita-maria-prazo-curto', patient: 'Maria das Graças Oliveira', date: '06/10/2026', meds: ['los', 'met'], category: 'Receituário simples' },
  { file: 'receita-maria-tres-itens', patient: 'Maria das Graças Oliveira', date: '22/10/2026', meds: ['los', 'met', 'sin'], category: 'Receituário simples' },
  { file: 'receita-ana-categoria', patient: 'Ana Clara Souza', date: '27/10/2026', meds: ['sin'], category: null },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function render(d) {
  const meds = d.meds
    .map((k, i) => {
      const y = 330 + i * 70;
      return `<text x="64" y="${y}" font-size="20" font-weight="600" fill="#1d2b33">${i + 1}. ${esc(MEDS[k][0])}</text>
<text x="88" y="${y + 26}" font-size="16" fill="#4a5a63">${esc(MEDS[k][1])} · uso conforme orientação do prescritor</text>`;
    })
    .join('\n');
  const date = d.date
    ? `<text x="64" y="640" font-size="18" fill="#1d2b33">Data: ${d.date}</text>`
    : `<text x="64" y="640" font-size="18" fill="#1d2b33">Data:</text><path d="M120 634c18-10 30 8 48-2s26 6 40-4" stroke="#8b979e" stroke-width="2" fill="none"/>`;
  const category = d.category
    ? `<text x="64" y="160" font-size="16" fill="#4a5a63">${d.category}</text>`
    : `<rect x="64" y="146" width="160" height="18" rx="4" fill="#d9dee1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800" font-family="Georgia, 'Times New Roman', serif">
<rect width="600" height="800" fill="#fffdf8"/>
<rect x="24" y="24" width="552" height="752" rx="10" fill="none" stroke="#c9d2d6" stroke-width="2"/>
<text x="64" y="92" font-size="26" font-weight="700" fill="#1d2b33">Clínica Demonstrativa Bem-Estar</text>
<text x="64" y="122" font-size="15" fill="#4a5a63">Endereço fictício · Brasília/DF</text>
${category}
<line x1="64" y1="190" x2="536" y2="190" stroke="#c9d2d6"/>
<text x="64" y="232" font-size="16" fill="#4a5a63">Paciente</text>
<text x="64" y="262" font-size="22" font-weight="600" fill="#1d2b33">${esc(d.patient)}</text>
<text x="64" y="302" font-size="16" fill="#4a5a63">Prescrição</text>
${meds}
${date}
<path d="M330 660c30-30 50 10 80-12s40 20 70-6" stroke="#2b4f6b" stroke-width="2.4" fill="none"/>
<line x1="320" y1="680" x2="536" y2="680" stroke="#8b979e"/>
<text x="320" y="704" font-size="16" fill="#1d2b33">${PRESCRIBER}</text>
<text x="320" y="726" font-size="14" fill="#4a5a63">${CRM}</text>
${d.corrected ? '<text x="64" y="720" font-size="14" fill="#087F8C">Documento reemitido</text>' : ''}
<text x="300" y="470" font-size="54" font-weight="700" fill="#c0392b" fill-opacity="0.08" text-anchor="middle" transform="rotate(-28 300 470)" font-family="Arial, sans-serif">DOCUMENTO FICTÍCIO</text>
<text x="300" y="762" font-size="12" fill="#8b979e" text-anchor="middle" font-family="Arial, sans-serif">Exemplo para demonstração do FarmaFlux · sem validade</text>
</svg>
`;
}

mkdirSync('public/samples', { recursive: true });
for (const d of docs) writeFileSync(`public/samples/${d.file}.svg`, render(d));
console.log(`${docs.length} documentos gerados.`);
