// Effects toolbox: shader backgrounds, filters over footage, and liquid-glass UI.
// Usage, props, rules and traps: .agents/skills/apply-effect (SKILL.md and references/).

export { ShaderCanvas, type ShaderCanvasProps, type ShaderHandle } from "./ShaderCanvas";
export { EffectLayer, MediaFeed, type MediaInput } from "./media";
export { type Ripple } from "./ripples";

export { Gradient, type GradientProps } from "./backgrounds/Gradient";
export { GradientWaves, type GradientWavesProps } from "./backgrounds/GradientWaves";
export { Sky, SKY_FRAGMENT, skyUniforms, type SkyProps } from "./backgrounds/Sky";

export { Dither, type DitherProps } from "./filters/Dither";
export { PixelField, type PixelFieldProps } from "./filters/PixelField";
export { GradientMap, type GradientMapProps } from "./filters/GradientMap";
export { FilterVideo, filterVideoMetadata, type FilterVideoProps } from "./FilterVideo";

export { LiquidGlass, DEFAULT_GLASS, type Backdrop, type GlassPanel, type GlassStyle, type LiquidGlassProps } from "./ui/LiquidGlass";
export { Cursor, type CursorProps } from "./ui/Cursor";
export { Assemble, type AssembleProps, type AssemblePiece } from "./ui/Assemble";
export { MorphBox, type MorphBoxProps, type MorphState } from "./ui/MorphBox";
export { MotionBlur, type MotionBlurProps } from "./MotionBlur";
