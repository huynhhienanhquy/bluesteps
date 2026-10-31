import type { captureRef } from 'react-native-view-shot';

export type TicketImageTarget = Parameters<typeof captureRef>[0];
export type TicketImageResult =
  'saved' | 'downloaded' | 'permission-denied' | 'share-opened' | 'unavailable';

export async function saveTicketImage(
  target: TicketImageTarget,
  eventId: string,
): Promise<TicketImageResult> {
  if (!target) throw new Error('Ticket is not ready');
  await document.fonts.ready;
  const element = typeof target === 'object' && 'current' in target ? target.current : target;
  if (!(element instanceof HTMLElement)) throw new Error('Ticket view is unavailable');
  await Promise.all(Array.from(element.querySelectorAll('img'), (image) => image.decode()));
  const { default: html2canvas } = await import('html2canvas-pro');
  const canvas = await html2canvas(element, {
    useCORS: true,
    backgroundColor: '#FFFFFF',
    onclone: (_document, clonedTicket) => {
      // Keep display shadows out of the exported image; they can render over white card margins.
      clonedTicket.style.boxShadow = 'none';
    },
  });
  const uri = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = uri;
  link.download = `bluesteps-demo-${eventId}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return 'downloaded';
}

export async function shareTicketImage(
  target: TicketImageTarget,
  eventId: string,
): Promise<TicketImageResult> {
  return saveTicketImage(target, eventId);
}
