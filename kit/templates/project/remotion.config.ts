import { Config } from "@remotion/cli/config";

// motion-kit render defaults: H.264, yuv420p, CRF 16; WebGL effects on the GPU via ANGLE.
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setCrf(16);
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");
