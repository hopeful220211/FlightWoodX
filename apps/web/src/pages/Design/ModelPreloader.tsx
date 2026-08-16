// src/components/design/ModelPreloader.tsx

import { partsData } from '../../data/parts';
import { usePartConnectors } from '../../hooks/usePartConnectors';

function PreloadRunner({ modelUrl }: { modelUrl: string }) {
  usePartConnectors(modelUrl);
  return null;
}

export function ModelPreloader() {
  return (
    <>
      {partsData.map((part) => (
        <PreloadRunner key={part.id} modelUrl={part.modelUrl} />
      ))}
    </>
  );
}
