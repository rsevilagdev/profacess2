import { useState, useRef } from 'react';
import { Upload, FileText, Eye, Loader2, CheckCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AverbacaoTableModal from '@/components/averbacao/AverbacaoTableModal';

function detectDelimiter(text) {
  const firstLine = (text.split('\n')[0] || '').trim();
  const candidates = ['\t', ';', '|', ','];
  let maxCount = 1;
  let delimiter = ';';
  for (const d of candidates) {
    const count = firstLine.split(d).length;
    if (count > maxCount) { maxCount = count; delimiter = d; }
  }
  return delimiter;
}

function parseDelimitedLine(line, delimiter) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === delimiter && !inQuotes) { values.push(current.trim()); current = ''; }
    else { current += char; }
  }
  values.push(current.trim());
  return values;
}

function parseDelimitedText(text) {
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseDelimitedLine(lines[0], delimiter);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseDelimitedLine(lines[i], delimiter);
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return { headers, rows };
}

export default function Averbacao() {
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseDelimitedText(text);
      setFileData({
        fileName: file.name,
        headers: parsed.headers,
        rows: parsed.rows,
        visibleColumns: [...parsed.headers],
        processed: false,
      });
      setLoading(false);
    };
    reader.onerror = () => { setLoading(false); };
    reader.readAsText(file);
  };

  const handleProcess = (selectedColumns) => {
    setFileData(prev => ({ ...prev, visibleColumns: selectedColumns, processed: true }));
  };

  const handleRestore = () => {
    setFileData(prev => ({ ...prev, visibleColumns: [...prev.headers], processed: false }));
  };

  const removeFile = () => {
    setFileData(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Averbação</h1>
        <p className="text-sm text-muted-foreground">Importe um arquivo .txt para visualizar como tabela</p>
      </div>

      {!fileData && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <label className="flex flex-col items-center justify-center gap-3 h-48 border-2 border-dashed border-input rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors">
            {loading ? (
              <>
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Importando arquivo...</span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Selecione um arquivo .txt</span>
                <span className="text-xs text-muted-foreground/70">O arquivo será exibido como tabela</span>
              </>
            )}
            <input type="file" accept=".txt,.csv" ref={fileRef} onChange={handleFile} className="hidden" />
          </label>
        </div>
      )}

      {fileData && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-heading font-bold text-sm">{fileData.fileName}</p>
                <p className="text-xs text-muted-foreground">{fileData.rows.length} registros · {fileData.visibleColumns.length} colunas</p>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
                <CheckCircle className="h-3.5 w-3.5" />
                Importado
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setModalOpen(true)} className="h-11 rounded-2xl">
                <Eye className="h-5 w-5" /> Visualizar
              </Button>
              <Button onClick={removeFile} variant="secondary" className="h-11 rounded-2xl">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && fileData && (
        <AverbacaoTableModal
          fileData={fileData}
          onClose={() => setModalOpen(false)}
          onProcess={handleProcess}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
}