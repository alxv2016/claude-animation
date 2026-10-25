// Effects toolbox: shader backgrounds, filters over footage, and liquid-glass UI.
// See docs/EFFECTS.md for every prop, the render rules and the traps.

export { ShaderCanvas, type ShaderCanvasProps, type ShaderHandle } from "./ShaderCanvas";
export { EffectLayer, MediaFeed, type MediaInput } from "./media";
export { type Ripple } from "./ripples";

export { Gradient, type GradientProps } from "./backgrounds/Gradient";
export { GradientWaves, type GradientWavesProps } from "./backgrounds/GradientWaves";
export { Sky, SKY_FRAGMENT, skyUniforms, type SkyProps } from "./backgrounds/Sky";

export { Dither, type DitherProps } from "./filters/Dither";
export { PixelField, type PixelFieldProps } from "./filters/PixelField";
export { GradientMap, type GradientMapProps } from "./filters/GradientMap";

export { LiquidGlass, DEFAULT_GLASS, type Backdrop, type GlassPanel, type GlassStyle, type LiquidGlassProps } from "./ui/LiquidGlass";
