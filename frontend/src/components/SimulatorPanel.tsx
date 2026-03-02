import React, { useEffect, useRef } from 'react';

const SimulatorPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    // Dynamic import so the heavy Three.js bundle is only loaded in sim mode
    import('../simulator/simulatorEngine.js').then((mod) => {
      if (destroyed || !containerRef.current) return;
      mod.initSimulator(containerRef.current);
      engineRef.current = { destroy: mod.destroySimulator };
    });

    return () => {
      destroyed = true;
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      // Clear any leftover DOM from the engine
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="simulator-container"
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    />
  );
};

export default SimulatorPanel;
