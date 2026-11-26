import { Config } from "@remotion/cli/config";

// A pasta workspace/ é servida como "public": clipes, músicas e criativos ficam lá.
Config.setPublicDir("./workspace");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setEntryPoint("./src/index.ts");
