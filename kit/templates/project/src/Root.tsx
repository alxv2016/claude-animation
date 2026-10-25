import { Composition } from "remotion";
import { Hello } from "./Hello";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Hello" component={Hello} durationInFrames={180} fps={60} width={1920} height={1080} />
  </>
);
