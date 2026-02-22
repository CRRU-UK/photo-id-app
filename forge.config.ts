import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import type { ForgeConfig } from "@electron-forge/shared-types";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import fs from "node:fs";
import path from "node:path";

import { PROJECT_FILE_EXTENSION } from "./src/constants";

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "**/@napi-rs/canvas*/**",
    },
    icon: path.join(__dirname, "src", "assets", "icon"),
    executableName: "photo-id",
    extraResource: [path.resolve(__dirname, "./.env")],
    extendInfo: {
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: "Photo ID Project",
          CFBundleTypeRole: "Editor",
          CFBundleTypeExtensions: [PROJECT_FILE_EXTENSION],
        },
      ],
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({ options: { mimeType: ["application/x-photoid"] } }),
    new MakerDeb({ options: { mimeType: ["application/x-photoid"] } }),
  ],
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
        externals: ["@napi-rs/canvas"],
        includeDeps: true,
      },
    },
  ],
  hooks: {
    generateAssets: async () => {
      // Only write .env file in CI/CD (i.e. published builds)
      if (process.env.NODE_ENV === "CI") {
        await fs.promises.writeFile(
          ".env",
          [
            `NODE_ENV=production`,
            `SENTRY_DSN=${process.env.SENTRY_DSN}`,
            `VITE_SENTRY_DSN=${process.env.SENTRY_DSN}`,
          ].join("\n"),
        );
      }
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
