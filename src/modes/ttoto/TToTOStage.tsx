import { useEffect, useState } from 'react';

// TToTO's designed screens are all authored at a fixed 1600x900 canvas (per
// docs/designs/ttoto-visual-notes.md §2: "All measurements in the reference file
// assume a 1600×900 canvas... scale proportionally if the real build target differs").
// Rather than re-deriving every measurement in vw/vh units (fragile — vw-based font
// sizing doesn't track vh-based positioning unless the window is exactly 16:9, which
// caused the intro screen's wordmark/tagline overlap bug), render the canvas at its
// literal pixel size and scale the whole thing as one unit to fit the viewport. Same
// technique already used by Survey Says's board screen (SSShowComponent.tsx, fixed
// 1920x1080 stage + `transform: scale()`).
export const STAGE_WIDTH = 1600;
export const STAGE_HEIGHT = 900;

export const useStageScale = (width: number = STAGE_WIDTH, height: number = STAGE_HEIGHT): number => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      setScale(Math.min(window.innerWidth / width, window.innerHeight / height));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [width, height]);

  return scale;
};

/** Wraps children in a fixed 1600x900 stage, centered and uniformly scaled to fit the viewport. */
export function TToTOStage({ children, width = STAGE_WIDTH, height = STAGE_HEIGHT }: {
  children: React.ReactNode; width?: number; height?: number;
}) {
  const scale = useStageScale(width, height);
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#000', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'center center', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
}
