export function maskCPF(cpf) {
  if (!cpf) return '';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return '***.***.***-**';
  return `${d[0]}xx.${d[3]}xx.xxx-xx`;
}

export function maskPlaca(placa) {
  if (!placa) return '';
  if (placa.length < 4) return '***';
  return `${placa[0]}xx${placa[3]}xxx`;
}

export function maskNome(nome) {
  if (!nome) return '';
  const parts = nome.trim().split(' ');
  if (parts.length === 1) return parts[0][0] + '***';
  return `${parts[0][0]}*** ${parts[parts.length - 1][0]}***`;
}

export function maskCNH(cnh) {
  if (!cnh) return '';
  if (cnh.length < 5) return '***';
  return `${cnh[0]}xxx${cnh[4]}xxxxxx`;
}

export function maskTelefone(tel) {
  if (!tel) return '';
  const d = tel.replace(/\D/g, '');
  if (d.length < 4) return '***';
  return `(${d.slice(0, 2)}) xxxx-xx${d.slice(-2)}`;
}