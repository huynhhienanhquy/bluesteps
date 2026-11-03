import { Artwork } from '../../design-system/DesignScreen';
import type { DragHandleProps } from './DragHandle';
export function DragHandle(p: DragHandleProps) {
  return (
    <button
      type="button"
      aria-label={`Đổi thứ tự ${p.name}`}
      disabled={p.disabled}
      title="Kéo để đổi thứ tự; dùng phím mũi tên hoặc Enter để hiện nút di chuyển."
      style={{
        border: 0,
        background: 'transparent',
        padding: 8,
        cursor: 'grab',
        touchAction: 'none',
        flexShrink: 0,
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        p.onStart(e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) p.onMove(e.clientY);
      }}
      onPointerUp={(e) => {
        p.onEnd(e.clientY);
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={p.onCancel}
      onKeyDown={(e) => {
        if (['ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape'].includes(e.key)) e.preventDefault();
        if (e.key === 'ArrowUp') p.onStep(-1);
        if (e.key === 'ArrowDown') p.onStep(1);
        if (e.key === 'Enter' || e.key === ' ') p.onActivate();
        if (e.key === 'Escape') p.onCancel();
      }}
    >
      <Artwork
        source={require('../../../assets/icons/collection/journey/grip-vertical.svg')}
        width={18}
        height={18}
      />
    </button>
  );
}
