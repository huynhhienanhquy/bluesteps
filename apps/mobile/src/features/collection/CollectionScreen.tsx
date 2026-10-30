import { CollectionProposalScreen } from './CollectionProposalScreen';
import { CollectionReportScreen } from './CollectionReportScreen';

export { CollectionMapScreen as CollectionScreen } from './CollectionMapScreen';
export { JourneyScreen } from './JourneyScreen';
export { PointDetailScreen } from './PointDetailScreen';

export function PointFormScreen({ report = false }: { report?: boolean }) {
  return report ? <CollectionReportScreen /> : <CollectionProposalScreen />;
}
