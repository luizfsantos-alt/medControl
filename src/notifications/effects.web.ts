// Na pré-visualização web não há avisos agendados.
export type EstadoPermissao = 'ativo' | 'negado' | 'pendente';
export function agendar() {}
export async function estadoAvisos(): Promise<EstadoPermissao> {
  return 'pendente';
}
export async function pedirAvisos(): Promise<EstadoPermissao> {
  return 'pendente';
}
export function iniciarAvisos() {}
