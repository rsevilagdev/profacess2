import { useState, useEffect } from 'react';
import { Shield, Save, Loader2, Clock, Lock, Download, Upload, Trash2, Key, Globe, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useProfarmaAuth } from '@/lib/auth-context-profarma.jsx';
import { Button } from '@/components/ui/button';

const CARGOS = [
  { value: 'administrador_master', label: 'Admin Master' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'encarregado', label: 'Encarregado' },
  { value: 'operador', label: 'Operador' },
  { value: 'visualizador', label: 'Visualizador' },
];

const RULES = [
  { key: 'can_export', label: 'Exportar dados', icon: Download },
  { key: 'can_import', label: 'Importar dados', icon: Upload },
  { key: 'can_delete_records', label: 'Excluir registros', icon: Trash2 },
  { key: 'require_2fa', label: 'Exigir 2FA', icon: Key },
];

const DEFAULTS = {
  administrador_master: { can_export: true, can_import: true, can_delete_records: true, require_2fa: false, session_timeout_minutes: 60, max_login_attempts: 10, ip_restriction: '' },
  administrador: { can_export: true, can_import: true, can_delete_records: false, require_2fa: false, session_timeout_minutes: 45, max_login_attempts: 8, ip_restriction: '' },
  encarregado: { can_export: true, can_import: false, can_delete_records: false, require_2fa: false, session_timeout_minutes: 30, max_login_attempts: 5, ip_restriction: '' },
  operador: { can_export: false, can_import: false, can_delete_records: false, require_2fa: false, session_timeout_minutes: 20, max_login_attempts: 5, ip_restriction: '' },
  visualizador: { can_export: false, can_import: false, can_delete_records: false, require_2fa: false, session_timeout_minutes: 15, max_login_attempts: 3, ip_restriction: '' },
};

export default function SecurityRules() {
  const { colaborador } = useProfarmaAuth();
  const [configs, setConfigs] = useState({});
  const [configIds, setConfigIds] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadConfigs(); }, []);

  const loadConfigs = async () => {
    try {
      const list = await base44.entities.SecurityConfig.list();
      const map = {};
      const ids = {};
      CARGOS.forEach(c => { map[c.value] = { ...DEFAULTS[c.value] }; });
      list.forEach(c => { map[c.cargo] = { ...DEFAULTS[c.cargo], ...c }; ids[c.cargo] = c.id; });
      setConfigs(map);
      setConfigIds(ids);
    } catch (e) {
      const map = {};
      CARGOS.forEach(c => { map[c.value] = { ...DEFAULTS[c.value] }; });
      setConfigs(map);
    }
    setLoading(false);
  };

  const toggleRule = (cargo, ruleKey) => {
    setConfigs(prev => ({ ...prev, [cargo]: { ...prev[cargo], [ruleKey]: !prev[cargo][ruleKey] } }));
  };

  const updateNumber = (cargo, field, value) => {
    setConfigs(prev => ({ ...prev, [cargo]: { ...prev[cargo], [field]: parseInt(value) || 0 } }));
  };

  const updateText = (cargo, field, value) => {
    setConfigs(prev => ({ ...prev, [cargo]: { ...prev[cargo], [field]: value } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const cargo of CARGOS) {
        const config = configs[cargo.value];
        if (configIds[cargo.value]) {
          await base44.entities.SecurityConfig.update(configIds[cargo.value], config);
        } else {
          const created = await base44.entities.SecurityConfig.create({ ...config, cargo: cargo.value });
          setConfigIds(prev => ({ ...prev, [cargo.value]: created.id }));
        }
      }
      await base44.entities.AuditLog.create({
        user_name: colaborador.nome + (colaborador.sobrenome ? ' ' + colaborador.sobrenome : ''),
        user_cpf: colaborador.cpf, action: 'Regras de segurança atualizadas',
        details: 'Configuração de segurança por cargo salva', ip_address: 'local', domain: window.location.hostname,
        category: 'user_management', branch_id: colaborador.filial_id
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {}
    setSaving(false);
  };

  if (loading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></div>;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-heading font-bold">Regras de Segurança por Nível de Acesso</h3>
        </div>
        <Button onClick={save} disabled={saving} className="h-10 rounded-xl">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Regras'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-medium">Regra</th>
              {CARGOS.map(c => (
                <th key={c.value} className="text-center p-3 font-medium text-xs whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RULES.map(rule => {
              const Icon = rule.icon;
              return (
                <tr key={rule.key} className="border-b border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{rule.label}</span>
                    </div>
                  </td>
                  {CARGOS.map(c => (
                    <td key={c.value} className="text-center p-3">
                      <button
                        onClick={() => toggleRule(c.value, rule.key)}
                        className={`h-6 w-11 rounded-full transition-colors ${configs[c.value]?.[rule.key] ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${configs[c.value]?.[rule.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="border-b border-border">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Timeout sessão (min)</span>
                </div>
              </td>
              {CARGOS.map(c => (
                <td key={c.value} className="text-center p-3">
                  <input
                    type="number" value={configs[c.value]?.session_timeout_minutes || 0}
                    onChange={e => updateNumber(c.value, 'session_timeout_minutes', e.target.value)}
                    className="w-16 h-8 text-center rounded-lg border border-input bg-transparent text-sm"
                  />
                </td>
              ))}
            </tr>
            <tr className="border-b border-border">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span>Máx. tentativas login</span>
                </div>
              </td>
              {CARGOS.map(c => (
                <td key={c.value} className="text-center p-3">
                  <input
                    type="number" value={configs[c.value]?.max_login_attempts || 0}
                    onChange={e => updateNumber(c.value, 'max_login_attempts', e.target.value)}
                    className="w-16 h-8 text-center rounded-lg border border-input bg-transparent text-sm"
                  />
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>Restrição de IP</span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">vazio = sem restrição</p>
              </td>
              {CARGOS.map(c => (
                <td key={c.value} className="text-center p-3">
                  <input
                    type="text" value={configs[c.value]?.ip_restriction || ''}
                    onChange={e => updateText(c.value, 'ip_restriction', e.target.value)}
                    placeholder="192.168.0.1"
                    className="w-28 h-8 text-center rounded-lg border border-input bg-transparent text-xs"
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-3">As regras definidas aqui se aplicam a todos os usuários do cargo correspondente. Administradores Master sempre têm acesso total e não podem ser restritos.</p>
    </div>
  );
}