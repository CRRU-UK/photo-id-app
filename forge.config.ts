import type { ForgeConfig } from "@electron-forge/shared-types";

import path from "path";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerDeb } from "@electron-forge/maker-deb";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseVersion, FuseV1Options } from "@electron/fuses";

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "**/node_modules/{sharp,@img}/**/*",
    },
    icon: path.join(__dirname, "src", "assets", "icon"),
    executableName: "photo-id",
    ignore: [/^\/\.github/, /^\/public/, /^\/src/, /^\/temp/],
  },
  rebuildConfig: {},
  makers: [new MakerSquirrel({}), new MakerZIP({}, ["darwin"]), new MakerRpm({}), new MakerDeb({})],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.ts",
          config: "vite.main.config.mts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.mts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.mts",
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "CRRU-UK",
          name: "photo-id-app",
        },
        force: true,
        prerelease: true,
        generateReleaseNotes: true,
      },
    },
  ],
};

export default config;
