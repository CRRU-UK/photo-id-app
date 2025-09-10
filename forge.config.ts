import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import type { ForgeConfig } from "@electron-forge/shared-types";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import fs from "fs";
import path from "path";

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "**/node_modules/{sharp,@img}/**/*",
    },
    icon: path.join(__dirname, "src", "assets", "icon"),
    executableName: "photo-id",
    extraResource: [path.resolve(__dirname, "./.env")],
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
    {
      name: "@timfish/forge-externals-plugin",
      config: {
        externals: ["sharp"],
        includeDeps: true,
      },
    },
  ],
  hooks: {
    generateAssets: async () => {
      await fs.promises.writeFile(
        ".env",
        [
          `SENTRY_DSN=${process.env.SENTRY_DSN || ""}`,
          `VITE_SENTRY_DSN=${process.env.SENTRY_DSN || ""}`,
          `SENTRY_ORG=${process.env.SENTRY_ORG || ""}`,
          `SENTRY_PROJECT=${process.env.SENTRY_PROJECT || ""}`,
        ].join("\n"),
      );
    },
  },
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "CRRU-UK",
          name: "photo-id-app",
        },
        force: true,
        generateReleaseNotes: true,
      },
    },
  ],
};

export default config;
