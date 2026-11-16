import * as Notifications from 'expo-notifications';
import { getState, onChange } from '../data/store';
import { planoDeAvisos } from '../domain/regras';

const CANAL = 'medcontrol-doses';
let iniciado = false;
let timer: ReturnType<typeof setTimeout> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

async function reagendar() {
  const s = getState();
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const a of planoDeAvisos(s, Date.now())) {
      await Notifications.scheduleNotificationAsync({
        identifier: a.chave,
        content: { title: a.titulo, body: a.corpo },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.em, channelId: CANAL },
      });
    }
  } catch (e) {
    console.warn('Falha ao agendar avisos', e);
  }
}

export function agendar() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(reagendar, 400);
}

export type EstadoPermissao = 'ativo' | 'negado' | 'pendente';

export async function estadoAvisos(): Promise<EstadoPermissao> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'ativo';
  return p.canAskAgain ? 'pendente' : 'negado';
}

export async function pedirAvisos(): Promise<EstadoPermissao> {
  const p = await Notifications.requestPermissionsAsync();
  agendar();
  if (p.granted) return 'ativo';
  return p.canAskAgain ? 'pendente' : 'negado';
}

export function iniciarAvisos() {
  if (iniciado) return;
  iniciado = true;
  Notifications.setNotificationChannelAsync(CANAL, {
    name: 'Doses',
    importance: Notifications.AndroidImportance.HIGH,
    enableVibrate: true,
  }).catch(() => {});
  Notifications.getPermissionsAsync()
    .then((p) => (p.granted || !p.canAskAgain ? p : Notifications.requestPermissionsAsync()))
    .then(() => agendar())
    .catch(() => {});
  onChange(() => agendar());
}
