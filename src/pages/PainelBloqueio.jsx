import { useState, useEffect } from 'react';
import { ShieldAlert, Truck, Users, ChevronLeft, ChevronRight, Search, X, Camera, CheckCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';
import { maskPlaca, maskCPF, maskNome } from '@/lib/lgpd-utils.js';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: 'bloqueado', label: 'Bloqueado' },
  { value: 'validado', label: 'Validado' },
  { value: 'pendente_revisao', label: 'Pendente de Revisão' },
];

export default function PainelBloqueio() {
  const { colaborador } = useProfarmaAuth();
  const [tab, setTab] = useState('veiculos');
  const [veiculos, setVeiculos] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(['bloqueado']);
  const [filialFilter, setFilialFilter] = useState([]);
  const [validating, setValidating] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Vehicle.list('-created_date', 500).catch(() => []),
      base44.entities.Driver.list('-created_date', 500).catch(() => []),
      base44.entities.Filial.list().catch(() => []),
    ]).then(([v, m, f]) => {
      setVeiculos(v); setMotoristas(m); setFiliais(f); setLoading(false);
    });
  }, []);

  // Real-time — atualiza listas sem refresh
  useEffect(() => {
    const unsubV = base44.entities.Vehicle.subscribe(() => {
      base44.entities.Vehicle.list('-created_date', 500).then(setVeiculos).catch(() => {});
    });
    const unsubD = base44.entities.Driver.subscribe(() => {
      base44.entities.Driver.list('-created_date', 500).then(setMotoristas).catch(() => {});
    });
    return () => { unsubV(); unsubD(); };
  }, []);

  const toggleStatus = (s) => {
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    setPage(0);
  };

  const toggleFilial = (id) => {
    setFilialFilter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setPage(0);
  };

  const filtered = (tab === 'veiculos' ? veiculos : motoristas).filter(item => {
    if (!statusFilter.includes(item.status)) return false;
    if (filialFilter.length > 0 && !filialFilter.includes(item.filial_id)) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    if (tab === 'veiculos') return item.placa?.toLowerCase().includes(term) || item.modelo?.toLowerCase().includes(term);
    return item.nome?.toLowerCase().includes(term) || item.cpf?.includes(term);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openValidate = (item) => {
    setValidating(item);
    setPhoto(null);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) setPhoto(file);
  };

  const confirmValidate = async () => {
    if (!validating || !photo) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
      const entityType = tab === 'veiculos' ? 'Vehicle' : 'Driver';
      await base44.entities[entityType].update(validating.id, {
        status: 'validado',
        comprovante_foto: file_url,
      });
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome, user_cpf: colaborador.cpf,
        action: `${tab === 'veiculos' ? 'Veículo' : 'Motorista'} validado com comprovante`,
        details: `${tab === 'veiculos' ? 'Placa' : 'Nome'}: ${tab === 'veiculos' ? validating.placa : validating.nome} | Status: validado | Foto: ${file_url}`,
        ip_address: 'local', domain: window.location.hostname,
        category: tab === 'veiculos' ? 'vehicle' : 'driver', branch_id: colaborador.filial_id
      });
      // Refresh data
      const [v, m] = await Promise.all([
        base44.entities.Vehicle.list('-created_date', 500).catch(() => []),
        base44.entities.Driver.list('-created_date', 500).catch(() => []),
      ]);
      setVeiculos(v); setMotoristas(m);
      setValidating(null); setPhoto(null);
    } catch (e) {}
    setUploading(false);
  };

  const statusBadge = (status) => {
    if (status === 'validado') return 'bg-primary/10 text-primary';
    if (status === 'bloqueado') return 'bg-destructive/10 text-destructive';
    return 'bg-orange-500/10 text-orange-600';
  };
  const statusLabel = (status) => status === 'pendente_revisao' ? 'Pendente' : status;

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="brand-title text-2xl">Painel de Bloqueio</h1>
        <p className="text-sm text-muted-foreground">Gestão de veículos e motoristas por status</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => { setTab('veiculos'); setPage(0); }} className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${tab === 'veiculos' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
          <Truck className="h-4 w-4 inline mr-2" /> Veículos
        </button>
        <button onClick={() => { setTab('motoristas'); setPage(0); }} className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${tab === 'motoristas' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
          <Users className="h-4 w-4 inline mr-2" /> Motoristas
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar por placa, modelo, nome ou CPF..." className="w-full h-12 pl-10 pr-4 rounded-2xl border border-input bg-card text-base focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {/* Multi-filters */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => toggleStatus(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${statusFilter.includes(opt.value) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {filiais.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Filiais</p>
            <div className="flex gap-2 flex-wrap">
              {filiais.map(f => (
                <button key={f.id} onClick={() => toggleFilial(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filialFilter.includes(f.id) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}>
                  {f.codigo || f.nome}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : pageData.length === 0 ? (
          <div className="text-center py-12">
            <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum registro encontrado com os filtros selecionados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pageData.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${statusBadge(item.status)}`}>
                    {tab === 'veiculos' ? <Truck className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tab === 'veiculos' ? maskPlaca(item.placa) : maskNome(item.nome)}</p>
                    <p className="text-xs text-muted-foreground">{tab === 'veiculos' ? item.modelo || '—' : maskCPF(item.cpf)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge(item.status)}`}>{statusLabel(item.status)}</span>
                  {item.status !== 'validado' && (
                    <Button size="sm" className="h-8 rounded-xl" onClick={() => openValidate(item)}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Validar
                    </Button>
                  )}
                  {item.comprovante_foto && (
                    <a href={item.comprovante_foto} target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Camera className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">Página {page + 1} de {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Validate with photo modal */}
      {validating && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <h2 className="font-heading font-bold text-lg">Validar Registro</h2>
              </div>
              <button onClick={() => { setValidating(null); setPhoto(null); }} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Confirmar validação de <span className="font-medium text-foreground">{tab === 'veiculos' ? validating.placa : validating.nome}</span>? Faça upload de uma foto como comprovante de atualização no Opentech.
            </p>
            <div className="space-y-3">
              <label className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-2xl p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                {photo ? (
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 text-primary mx-auto mb-1" />
                    <p className="text-sm font-medium">{photo.name}</p>
                    <p className="text-xs text-muted-foreground">Clique para trocar</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm text-muted-foreground">Selecionar foto do comprovante</p>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 h-11 rounded-xl" onClick={() => { setValidating(null); setPhoto(null); }}>
                  Cancelar
                </Button>
                <Button className="flex-1 h-11 rounded-xl" disabled={!photo || uploading} onClick={confirmValidate}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Confirmar Validação
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}