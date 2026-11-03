export async function saveTicket(image: string, code: string) {
  if (!image.startsWith('data:image/png;base64,')) throw new Error('Ảnh vé không hợp lệ.');
  const link = document.createElement('a');
  link.href = image;
  link.download = `${code.replace(/[^a-z0-9-]/gi, '')}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
