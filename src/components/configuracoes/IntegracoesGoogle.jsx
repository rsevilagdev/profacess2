import { useState, useEffect } from 'react';
import { Table2, Calendar, Check, X, Loader2, ExternalLink, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const SHEETS_CONNECTOR_ID = '6a55e0fd672f74bf2706a36a';
const CALENDAR_CONNECTOR_ID = '6a55e0eb7be8e64d717e793e';

export default function IntegracoesGoogle() {
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [spreadsheetId, setSpreadsheetId] = useState(localStorage.getItem('google_sheets_id') || '');
  const [connecting, setConnecting] = useState(null);
  const [savedId, setSavedId] = useState(false);

  const checkSheetsConnection = async () => {
    setLoadingSheets(true);
    try {
      await base44.functions.invoke('enviarParaGoogleSheets', { check_only: true });
      setSheetsConnected(true);
    } catch {
      setSheetsConnected(false);
    }
    setLoadingSheets(false);
  };

  const checkCalendarConnection = async () => {
    setLoadingCalendar(true);
    try {
      await base44.functions.invoke('enviarParaGoogleCalendar', { check_only: true });
      setCalendarConnected(true);
    } catch {
      setCalendarConnected(false);
    }
    setLoadingCalendar(false);
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        await Promise.all([checkSheetsConnection(), checkCalendarConnection()]);
      } else {
        setLoadingSheets(false);
        setLoadingCalendar(false);
      }
    });
  }, []);

  const handleConnectSheets = async () => {
    setConnecting('sheets');
    try {
      const url = await base44.connectors.connectAppUser(SHEETS_CONNECTOR_ID);
      const popup = window.open(url, '_blank');
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          checkSheetsConnection();
          setConnecting(null);
        }
      }, 500);
    } catch {
      setConnecting(null);
    }
  };

  const handleConnectCalendar = async () => {
    setConnecting('calendar');
    try {
      const url = await base44.connectors.connectAppUser(CALENDAR_CONNECTOR_ID);
      const popup = window.open(url, '_blank');
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          checkCalendarConnection();
          setConnecting(null);
        }
      }, 500);
    } catch {
      setConnecting(null);
    }
  };

  const handleDisconnectSheets = async () => {
    await base44.connectors.disconnectAppUser(SHEETS_CONNECTOR_ID);
    setSheetsConnected(false);
  };

  const handleDisconnectCalendar = async () => {
    await base44.connectors.disconnectAppUser(CALENDAR_CONNECTOR_ID);
    setCalendarConnected(false);
  };

  const saveSpreadsheetId = () => {
    localStorage.setItem('google_sheets_id', spreadsheetId.trim());
    setSavedId(true);
    setTimeout(() => setSavedId(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Google Sheets */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Table2 className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-bold">Google Sheets</h3>
            {loadingSheets ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : sheetsConnected ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1"><Check className="h-3 w-3" /> Conectado</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1"><X className="h-3 w-3" /> Desconectado</span>
            )}
          </div>
          {sheetsConnected ? (
            <Button onClick={handleDisconnectSheets} variant="secondary" className="h-9 rounded-xl">Desconectar</Button>
          ) : (
            <Button onClick={handleConnectSheets} disabled={connecting === 'sheets'} className="h-9 rounded-xl">
              {connecting === 'sheets' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Conectar
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-3">Envia registros de entrada e saída de veículos para uma planilha do Google Sheets sempre que uma liberação é concluída.</p>
        {sheetsConnected && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">ID da Planilha do Google Sheets</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={spreadsheetId}
                onChange={e => setSpreadsheetId(e.target.value)}
                placeholder="Cole o ID da planilha (ex: 1ABC...xyz)"
                className="flex-1 h-10 px-3 rounded-xl border border-input bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={saveSpreadsheetId} variant="secondary" className="h-10 rounded-xl shrink-0">
                {savedId ? <Check className="h-4 w-4" /> : 'Salvar'}
              </Button>
            </div>
            <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              <span>O ID está na URL da planilha: docs.google.com/spreadsheets/d/<span className="font-medium">AQUI</span>/edit</span>
            </div>
          </div>
        )}
      </div>

      {/* Google Calendar */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-bold">Google Calendar</h3>
            {loadingCalendar ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : calendarConnected ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1"><Check className="h-3 w-3" /> Conectado</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1"><X className="h-3 w-3" /> Desconectado</span>
            )}
          </div>
          {calendarConnected ? (
            <Button onClick={handleDisconnectCalendar} variant="secondary" className="h-9 rounded-xl">Desconectar</Button>
          ) : (
            <Button onClick={handleConnectCalendar} disabled={connecting === 'calendar'} className="h-9 rounded-xl">
              {connecting === 'calendar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Conectar
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">Cria eventos no Google Calendar com os horários de entrada e saída dos veículos, permitindo visualizar o fluxo operacional do dia em uma agenda.</p>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-2">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Como funciona:</p>
          <p>Ao conectar sua conta Google, cada liberação de saída (Acessos e CRDK) enviará automaticamente os dados do veículo para sua planilha e criará um evento na sua agenda. Se não estiver conectado, a liberação funciona normalmente sem enviar dados.</p>
        </div>
      </div>
    </div>
  );
}