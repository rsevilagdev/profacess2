import { useState, useRef } from 'react';
import { Upload, FileText, Eye, Loader2, CheckCircle, Trash2, Database } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import AverbacaoTableModal from '@/components/averbacao/AverbacaoTableModal';
import AverbacaoSavedData from '@/components/averbacao/AverbacaoSavedData';

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
  // Replace empty headers with synthetic names so data isn't lost
  for (let i = 0; i < headers.length; i++) {
    if (!headers[i]) headers[i] = `__col_${i}`;
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseDelimitedLine(lines[i], delimiter);
    // Extend headers for extra columns without headers in the header line
    while (headers.length < values.length) {
      headers.push(`__col_${headers.length}`);
    }
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return { headers, rows };
}

function findColumn(headers, possibleNames) {
  for (const name of possibleNames) {
    const upper = name.toUpperCase().trim();
    for (const h of headers) {
      if (h.toUpperCase().trim() === upper) return h;
    }
  }
  for (const name of possibleNames) {
    const upper = name.toUpperCase().trim();
    for (const h of headers) {
      if (h.toUpperCase().trim().includes(upper)) return h;
    }
  }
  return null;
}

function parseNumber(val) {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^\d,-]/g, '').replace('.', '').replace(',', '.');
  return Number(cleaned) || 0;
}

function formatNumber(val) {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseDate(val) {
  if (!val) return null;
  const str = String(val).trim();
  // Formato BR: DD[sep]MM[sep]YYYY (sep = / - . ou espaço)
  const brMatch = str.match(/^(\d{1,2})[/\s.-](\d{1,2})[/\s.-](\d{4})/);
  if (brMatch) {
    const d = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    if (!isNaN(d)) return d;
  }
  // Formato ISO: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!isNaN(d)) return d;
  }
  // Fallback
  const d = new Date(str);
  if (!isNaN(d)) return d;
  return null;
}

function groupByPriority(rows, headers) {
  const colPrioridade = findColumn(headers, ['PRIORIDADE', 'PRIORIDAD', 'PRIORITY', 'PRIOR']);
  const colRota = findColumn(headers, ['ROTA', 'RUTA', 'ITINERÁRIO', 'ITINERARIO', 'ITINERARY', 'ITINER', 'ROUTE']);
  const colNumNf = findColumn(headers, ['NU-NF', 'NU NF', 'NUNF', 'NUMNF', 'NUM NF', 'NUM_NF', 'NF', 'NOTA FISCAL', 'NUMERO NF', 'NÚMERO NF', 'NUMERONF', 'NRO NF', 'Nº NF', 'NUMERO NOTA FISCAL', 'NUM NOTA', 'NUM. NF', 'NÚM. NF']);
  const lastCol = headers.length > 0 ? headers[headers.length - 1] : null;

  if (!colPrioridade) return { groupedRows: rows.map(r => ({ row: r, lists: {}, count: 1 })), totalGeral: 0, vlNfColumn: lastCol, priorityColumn: null };

  // Sum columns from the column AFTER NumNf (NumNf is a note number, not a value)
  const numNfIdx = colNumNf ? headers.indexOf(colNumNf) : -1;
  const vlNfIndex = (numNfIdx >= 0 && numNfIdx + 1 < headers.length)
    ? numNfIdx + 1
    : (lastCol ? headers.indexOf(lastCol) : -1);

  const groups = {};
  const groupKeys = [];

  for (const row of rows) {
    const priority = String(row[colPrioridade] || '').trim();
    const priorityNum = parseInt(priority) || 0;
    let groupKey;
    let groupRota = '';
    if ((priorityNum === 90 || priorityNum === 91) && colRota) {
      groupRota = String(row[colRota] || '').trim();
      groupKey = `${priority}_${groupRota}`;
    } else {
      groupKey = priority;
    }
    if (!groups[groupKey]) {
      groups[groupKey] = [];
      groupKeys.push({ key: groupKey, priority: priorityNum, rota: groupRota });
    }
    groups[groupKey].push(row);
  }

  groupKeys.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (parseInt(a.rota) || 0) - (parseInt(b.rota) || 0);
  });

  const groupedRows = [];
  let totalGeral = 0;

  for (const gk of groupKeys) {
    const groupRows = groups[gk.key];
    const groupedRow = {};
    const lists = {};

    headers.forEach((h, idx) => {
      if (vlNfIndex >= 0 && idx >= vlNfIndex) {
        const sum = groupRows.reduce((acc, r) => acc + parseNumber(r[h]), 0);
        groupedRow[h] = formatNumber(sum);
        if (h === lastCol) totalGeral += sum;
      } else {
        const uniqueValues = [...new Set(groupRows.map(r => String(r[h] || '').trim()).filter(Boolean))];
        groupedRow[h] = uniqueValues.length > 1 ? `${uniqueValues[0]} +${uniqueValues.length - 1}` : (uniqueValues[0] || '');
        lists[h] = uniqueValues;
      }
    });

    groupedRows.push({ row: groupedRow, lists, count: groupRows.length });
  }

  return { groupedRows, totalGeral, vlNfColumn: lastCol, priorityColumn: colPrioridade };
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function Averbacao() {
  const { colaborador } = useProfarmaAuth();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [savedDataVersion, setSavedDataVersion] = useState(0);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError('');
    setSavedMsg('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        if (!text || !text.trim()) {
          setError('O arquivo está vazio ou não pôde ser lido.');
          setLoading(false);
          return;
        }
        const parsed = parseDelimitedText(text);
        if (parsed.headers.length === 0 || parsed.rows.length === 0) {
          setError('Não foi possível identificar colunas e dados no arquivo. Verifique o formato.');
          setLoading(false);
          return;
        }
        // Remove duplicate NumNf — keep only one record per nota fiscal
        const colNumNfDedup = findColumn(parsed.headers, ['NU-NF', 'NU NF', 'NUNF', 'NUMNF', 'NUM NF', 'NUM_NF', 'NF', 'NOTA FISCAL', 'NUMERO NF', 'NÚMERO NF', 'NUMERONF', 'NRO NF', 'Nº NF', 'NUMERO NOTA FISCAL', 'NUM NOTA', 'NUM. NF', 'NÚM. NF']);
        if (colNumNfDedup) {
          const seen = new Set();
          parsed.rows = parsed.rows.filter(r => {
            const nf = String(r[colNumNfDedup] || '').trim();
            if (!nf || seen.has(nf)) return false;
            seen.add(nf);
            return true;
          });
        }
        setFileData({
          fileName: file.name,
          headers: parsed.headers,
          rows: parsed.rows,
          visibleColumns: [...parsed.headers],
          processed: false,
        });
      } catch (err) {
        setError('Erro ao processar o arquivo: ' + (err.message || 'desconhecido'));
      }
      setLoading(false);
    };
    reader.onerror = () => {
      setError('Erro ao ler o arquivo. Tente novamente.');
      setLoading(false);
    };
    reader.readAsText(file, 'ISO-8859-1');
  };

  const handleProcess = (selectedColumns) => {
    const result = groupByPriority(fileData.rows, fileData.headers);
    setFileData(prev => ({
      ...prev,
      visibleColumns: selectedColumns,
      processed: true,
      processedRows: result.groupedRows,
      processedMeta: { totalGeral: result.totalGeral, vlNfColumn: result.vlNfColumn, priorityColumn: result.priorityColumn },
    }));
    setSavedMsg('');
  };

  const handleRestore = () => {
    setFileData(prev => ({
      ...prev,
      visibleColumns: [...prev.headers],
      processed: false,
      processedRows: null,
      processedMeta: null,
    }));
    setSavedMsg('');
  };

  const handleSaveToDatabase = async () => {
    if (!fileData?.processedRows) return;
    setSaving(true);
    setError('');
    setSavedMsg('');
    try {
      const colPrioridade = fileData.processedMeta?.priorityColumn || findColumn(fileData.headers, ['PRIORIDADE', 'PRIORIDAD', 'PRIORITY', 'PRIOR']);
      const colData = findColumn(fileData.headers, ['DATA', 'DATA EMBARQUE', 'DATA DO EMBARQUE', 'DT_EMBARQUE', 'DTEMBARQUE', 'EMBARQUE', 'DT EMBARQUE']);
      const colRota = findColumn(fileData.headers, ['ROTA', 'RUTA', 'ITINERÁRIO', 'ITINERARIO', 'ITINERARY', 'ITINER', 'ROUTE']);
      // Find the column after "Vl Lito" — the first column without header (synthetic __col_X) after it
      const colVlLito = findColumn(fileData.headers, ['VL LITO', 'VL LIT', 'VLLITO', 'VL_LITO', 'VALOR LÍQUIDO', 'VALOR LIQUIDO', 'VLLIQUIDO', 'VL_LIQUIDO', 'LIQUIDO', 'LÍQUIDO', 'VL. LÍQ', 'VL LIQ', 'VL LÍQ']);
      let colVlNf = null;
      if (colVlLito) {
        const vlLitoIdx = fileData.headers.indexOf(colVlLito);
        for (let i = vlLitoIdx + 1; i < fileData.headers.length; i++) {
          if (fileData.headers[i].startsWith('__col_')) {
            colVlNf = fileData.headers[i];
            break;
          }
        }
        if (!colVlNf && vlLitoIdx + 1 < fileData.headers.length) {
          colVlNf = fileData.headers[vlLitoIdx + 1];
        }
      }
      if (!colVlNf) {
        colVlNf = fileData.processedMeta?.vlNfColumn || (fileData.headers.length > 0 ? fileData.headers[fileData.headers.length - 1] : null);
      }

      const records = [];
      for (const item of fileData.processedRows) {
        const dadosJson = JSON.stringify({
          row: item.row,
          lists: Object.fromEntries(
            Object.entries(item.lists || {}).map(([k, v]) => [k, v.slice(0, 100)])
          ),
          count: item.count
        });
        let prioridadeStr = colPrioridade ? String(item.row[colPrioridade] || '') : '';
        // For priorities 90/91, include route in prioridade to ensure unique keys per route
        const priorityNum = parseInt(prioridadeStr) || 0;
        if ((priorityNum === 90 || priorityNum === 91) && colRota) {
          const rota = item.lists?.[colRota]?.[0] || String(item.row[colRota] || '').trim();
          if (rota) prioridadeStr = `${prioridadeStr}_${rota}`;
        }
        const totalGeral = colVlNf ? parseNumber(item.row[colVlNf]) : 0;

        // Find original rows matching this priority (and route for 90/91) to compute per-date totals
        const priorityVal = colPrioridade ? String(item.row[colPrioridade] || '').trim() : '';
        let matchingRows = fileData.rows.filter(row =>
          String(row[colPrioridade] || '').trim() === priorityVal
        );
        if ((priorityNum === 90 || priorityNum === 91) && colRota) {
          const routeVal = item.lists?.[colRota]?.[0] || String(item.row[colRota] || '').trim();
          matchingRows = matchingRows.filter(row =>
            String(row[colRota] || '').trim() === routeVal
          );
        }

        // Group matching rows by date and sum value column per date
        const dateGroups = {};
        for (const row of matchingRows) {
          const dateStr = colData ? String(row[colData] || '').trim() : '';
          const d = parseDate(dateStr);
          if (d) {
            const mesNome = MESES[d.getMonth()];
            const diaStr = String(d.getDate()).padStart(2, '0');
            const dataRef = d.toLocaleDateString('pt-BR');
            const key = `${mesNome}_${diaStr}`;
            if (!dateGroups[key]) {
              dateGroups[key] = { mes: mesNome, dia: diaStr, dataRef, total: 0 };
            }
            if (colVlNf) {
              dateGroups[key].total += parseNumber(row[colVlNf]);
            }
          }
        }
        const uniqueDates = Object.values(dateGroups);

        if (uniqueDates.length === 0) {
          records.push({
            mes: '', dia: '', data_referencia: '',
            prioridade: prioridadeStr,
            arquivo_origem: fileData.fileName,
            dados_json: dadosJson,
            total_geral: totalGeral,
            operador_nome: colaborador?.nome || '',
            filial_id: colaborador?.filial_id || '',
            filial_nome: colaborador?.filial_nome || '',
          });
        } else {
          for (const dt of uniqueDates) {
            records.push({
              mes: dt.mes,
              dia: dt.dia,
              data_referencia: dt.dataRef,
              prioridade: prioridadeStr,
              arquivo_origem: fileData.fileName,
              dados_json: dadosJson,
              total_geral: dt.total,
              operador_nome: colaborador?.nome || '',
              filial_id: colaborador?.filial_id || '',
              filial_nome: colaborador?.filial_nome || '',
            });
          }
        }
      }

      // UPSERT: update existing records, create only new ones — no deletions
      const monthsToCheck = [...new Set(records.map(r => r.mes).filter(Boolean))];
      const existingRecords = [];
      for (const mes of monthsToCheck) {
        const found = await base44.entities.AverbacaoRecord.filter({ mes }, '-created_date', 2000);
        existingRecords.push(...found);
      }
      if (records.some(r => !r.mes)) {
        const noMes = await base44.entities.AverbacaoRecord.filter({ mes: '' }, '-created_date', 2000);
        existingRecords.push(...noMes);
      }

      // Build lookup map: mes_dia_prioridade → existing record id
      const existingMap = {};
      for (const ex of existingRecords) {
        const key = `${ex.mes || ''}_${ex.dia || ''}_${String(ex.prioridade || '').trim()}`;
        existingMap[key] = ex.id;
      }

      const toUpdate = [];
      const toCreate = [];
      const seenUpdateIds = new Set();
      const seenCreateKeys = new Set();
      for (const r of records) {
        const key = `${r.mes || ''}_${r.dia || ''}_${String(r.prioridade || '').trim()}`;
        if (existingMap[key]) {
          const existingId = existingMap[key];
          if (!seenUpdateIds.has(existingId)) {
            toUpdate.push({ id: existingId, ...r });
            seenUpdateIds.add(existingId);
          }
        } else if (!seenCreateKeys.has(key)) {
          toCreate.push(r);
          seenCreateKeys.add(key);
        }
      }

      // Update existing records in batches of 100
      const BATCH_SIZE = 100;
      let updated = 0;
      for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + BATCH_SIZE);
        await base44.entities.AverbacaoRecord.bulkUpdate(batch);
        updated += batch.length;
      }

      // Create new records in batches of 100
      let created = 0;
      for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
        const batch = toCreate.slice(i, i + BATCH_SIZE);
        await base44.entities.AverbacaoRecord.bulkCreate(batch);
        created += batch.length;
      }
      setSavedMsg(`${updated} atualizado(s) · ${created} criado(s) com sucesso!`);
      setSavedDataVersion(v => v + 1);
      setTimeout(() => setSavedMsg(''), 6000);
    } catch (e) {
      setError('Erro ao salvar: ' + (e.message || 'desconhecido'));
    }
    setSaving(false);
  };

  const removeFile = () => {
    setFileData(null);
    setSavedMsg('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Averbação</h1>
        <p className="text-sm text-muted-foreground">Importe, processe e salve dados de averbação</p>
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
          {error && (
            <div className="mt-3 bg-destructive/5 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
              {error}
            </div>
          )}
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
                <p className="text-xs text-muted-foreground">
                  {fileData.processed && fileData.processedRows
                    ? `${fileData.processedRows.length} prioridades · ${fileData.rows.length} registros originais`
                    : `${fileData.rows.length} registros · ${fileData.visibleColumns.length} colunas`}
                </p>
                <p className="text-xs text-primary font-medium flex items-center gap-1 mt-0.5">
                  <CheckCircle className="h-3 w-3" /> Todos os dados importados
                </p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${fileData.processed ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <CheckCircle className="h-3.5 w-3.5" />
                {fileData.processed ? 'Processado' : 'Importado'}
              </div>
            </div>
            <div className="flex gap-2">
              {fileData.processed && (
                <Button onClick={handleSaveToDatabase} disabled={saving} className="h-11 rounded-2xl">
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Database className="h-5 w-5" />}
                  Salvar na Base de Dados
                </Button>
              )}
              <Button onClick={() => setModalOpen(true)} className="h-11 rounded-2xl">
                <Eye className="h-5 w-5" /> Visualizar
              </Button>
              <Button onClick={removeFile} variant="secondary" className="h-11 rounded-2xl">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {savedMsg && (
            <div className="mt-3 bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm text-primary">
              {savedMsg}
            </div>
          )}
          {error && (
            <div className="mt-3 bg-destructive/5 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      )}

      <AverbacaoSavedData refreshTrigger={savedDataVersion} />

      {modalOpen && fileData && (
        <AverbacaoTableModal
          fileData={fileData}
          onClose={() => setModalOpen(false)}
          onProcess={handleProcess}
          onRestore={handleRestore}
          onSave={handleSaveToDatabase}
          saving={saving}
        />
      )}
    </div>
  );
}