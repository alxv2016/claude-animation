import { Config } from "@remotion/cli/config";

// Encoding defaults from the studio rules (docs/MOTION_REEL.md §22.2)
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(16);
Config.setOverwriteOutput(true);
// WebGL effects: GPU rendering, identical output run to run (docs/EFFECTS.md §3).
Config.setChromiumOpenGlRenderer("angle");
