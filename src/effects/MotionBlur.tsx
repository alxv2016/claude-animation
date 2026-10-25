import { AbsoluteFill, Freeze, useCurrentFrame } from "remotion";

// Camera motion blur: the frame is the average of `samples` renders across the open shutter.
// Remotion's CameraMotionBlur adds layers at 1/n opacity, and the 8-bit compositor rounds each
// layer, so every colour snaps to a multiple of n (8 samples: steps of 8) — soft shadows and
// gradients band and flat colours shift. Here sample k is drawn over the running result at
// opacity 1/k instead: a pixel that does not move keeps its exact value, and rounding error
// stays under one step. The shutter opens at the frame's time, as a film camera's does.

export type MotionBlurProps = {
  children: React.ReactNode;
  /** Renders averaged per frame; 8 is smooth for most motion. */
  samples?: number;
  /** Degrees of the frame interval the shutter stays open; 180 is the film standard. */
  shutterAngle?: number;
};

export const MotionBlur: React.FC<MotionBlurProps> = ({ children, samples = 8, shutterAngle = 180 }) => {
  const frame = useCurrentFrame();
  const open = shutterAngle / 360;
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      {Array.from({ length: samples }, (_, k) => (
        <AbsoluteFill key={k} style={{ opacity: 1 / (k + 1) }}>
          <Freeze frame={frame + (k / samples) * open}>{children}</Freeze>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
