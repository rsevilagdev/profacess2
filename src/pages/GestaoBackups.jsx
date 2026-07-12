import { useState, useEffect } from 'react';
import { HardDrive, Play, CheckCircle, XCircle, Loader2, Clock, Database } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

export default function GestaoBackups() {
  const { colaborador } = useProfarmaAuth();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadBackups(); }, []);

  const loadBackups = async () => {
    setLoading(true);
    const list = await base44.entities.BackupLog.list('-created_date', 100).catch(() => []);
    setBackups(list);
    setLoading(false);
  };

  const triggerBackup = async () => {
    setCreating(true);
    try {
      // Export all entities as a backup snapshot
      const entities = ['Vehicle', 'Driver', 'AccessLog', 'Colaborador', 'Filial', 'Notification', 'AuditLog', 'Liberacao', 'SolicitacaoAcesso', 'ReviewRequest'];
      const data = {};
      let totalRecords = 0;
      for (const ent of entities) {
        try {
          const records = await base44.entities[ent].list('-created_date', 1000);
          data[ent] = records;
          totalRecords += records.length;
        } catch (e) { data[ent] = []; }
      }
      const blob = new Blob([JSON.stringify({ backupDate: new Date().toISOString(), system: 'PROFARMA_LIBERAAUTO_PRO', entities: data }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `backup_profarma_${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);

      const sizeKb = Math.round(blob.size / 1024);
      await base44.entities.BackupLog.create({
        type: 'manual', triggered_by: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
        size_kb: sizeKb, status: 'success',
        details: `Backup manual: ${totalRecords} registros em ${entities.length} entidades`,
        branch_id: colaborador.filial_id
      });
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
        user_cpf: colaborador.cpf, action: 'Backup manual executado',
        details: `${sizeKb} KB | ${totalRecords} registros`, ip_address: 'local',
        domain: window.location.hostname, category: 'backup', branch_id: colaborador.filial_id
      });
      loadBackups();
    } catch (e) {
      await base44.entities.BackupLog.create({
        type: 'manual', triggered_by: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
        status: 'failed', details: e.message, branch_id: colaborador.filial_id
      });
      loadBackups();
    }
    setCreating(false);
  };

  const stats = {
    total: backups.length,
    success: backups.filter(b => b.status === 'success').length,
    failed: backups.filter(b => b.status === 'failed').length,
    lastBackup: backups[0]?.created_date,
    totalSize: backups.reduce((sum, b) => sum + (b.size_kb || 0), 0),
  };

  const statusIcon = (status) => {
    if (status === 'success') return <CheckCircle className="h-5 w-5 text-primary" />;
    if (status === 'failed') return <XCircle className="h-5 w-5 text-destructive" />;
    return <Loader2 className="h-5 w-5 text-orange-600 animate-spin" />;
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="brand-title text-2xl">Gestão de Backups</h1>
          <p className="text-sm text-muted-foreground">Visualize o status dos backups e dispare backups manuais</p>
        </div>
        <Button onClick={triggerBackup} disabled={creating} className="h-12 rounded-2xl">
          {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-4 w-4" />} Backup Manual
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Database} label="Total de Backups" value={stats.total} />
        <StatCard icon={CheckCircle} label="Sucessos" value={stats.success} color="text-primary" />
        <StatCard icon={XCircle} label="Falhas" value={stats.failed} color="text-destructive" />
        <StatCard icon={HardDrive} label="Tamanho Total" value={`${(stats.totalSize / 1024).toFixed(1)} MB`} />
      </div>

      {/* Last backup */}
      {stats.lastBackup && (
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Último backup</p>
            <p className="text-xs text-muted-foreground">{new Date(stats.lastBackup).toLocaleString('pt-BR')}</p>
          </div>
        </div>
      )}

      {/* Backup List */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h3 className="font-heading font-bold mb-3">Histórico de Backups</h3>
        {loading ? <div className="text-center py-8 text-muted-foreground">Carregando...</div> : backups.length === 0 ? (
          <div className="text-center py-12"><HardDrive className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-sm text-muted-foreground">Nenhum backup registrado</p></div>
        ) : (
          <div className="space-y-2">
            {backups.map(b => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  {statusIcon(b.status)}
                  <div>
                    <p className="text-sm font-medium capitalize">{b.type} · {b.status}</p>
                    <p className="text-xs text-muted-foreground">{new Date(b.created_date).toLocaleString('pt-BR')}</p>
                    {b.details && <p className="text-xs text-muted-foreground mt-0.5">{b.details}</p>}
                  </div>
                </div>
                <div className="text-right">
                  {b.triggered_by && <p className="text-xs text-muted-foreground">Por: {b.triggered_by}</p>}
                  {b.size_kb && <p className="text-xs text-muted-foreground">{b.size_kb} KB</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = 'text-foreground' }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}