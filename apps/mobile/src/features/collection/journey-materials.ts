import type { Schemas } from '../../services/api';

export function handoverMaterials(
  accepted: Schemas['MaterialRef'][],
  carried: readonly string[] = [],
) {
  return carried.length ? accepted.filter((material) => carried.includes(material.id)) : accepted;
}
