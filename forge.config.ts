import fs from "node:fs";
import path from "node:path";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerDMG, type MakerDMGConfig } from "@electron-forge/maker-dmg";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import type { ForgeConfig } from "@electron-forge/shared-types";

import { version } from "./package.json";
import { PROJECT_FILE_EXTENSION } from "./src/constants";

let signingConfig = {};

if (process.env.APPLE_CERTIFICATE) {
  signingConfig = {
    osxSign: {
      "hardened-runtime": true,
      "gatekeeper-assess": false,
      "signature-flags": "library",
      entitlements: "entitlements.mac.plist",
      "entitlements-inherit": "entitlements.mac.plist",
    },
    osxNotarize: {
      keychainProfile: process.env.APPLE_KEYCHAIN_PROFILE,
    },
  };
}

/**
 * Windows: Azure Artifact Signing via `signtool /dlib` extension. The signing tools and
 * `metadata.json` are installed by the CI workflow before the build. Authentication uses the Azure
 * CLI session established via OIDC in the workflow.
 */
let windowsSignConfig: object | undefined;

if (process.env.AZURE_CODE_SIGNING_DLIB) {
  windowsSignConfig = {
    signToolPath: process.env.AZURE_CODE_SIGNING_SIGNTOOL,
    signWithParams: [
      "/dlib",
      process.env.AZURE_CODE_SIGNING_DLIB,
      "/dmdf",
      process.env.AZURE_CODE_SIGNING_METADATA,
    ],
    timestampServer: "http://timestamp.acs.microsoft.com",
    hashes: ["sha256"],
    automaticallySelectCertificate: false,
  };
}

const dmgOptions: MakerDMGConfig = {
  name: `Photo.ID-${version}`,
  format: "ULFO",
  icon: "resources/icon.icns",
  background: "resources/dmg-background.png",
  iconSize: 100,
  contents: (options) => [
    {
      x: 140,
      y: 125,
      type: "file",
      path: options.appPath,
    },
    {
      x: 520,
      y: 125,
      type: "link",
      path: "/Applications",
    },
  ],
};

const config: ForgeConfig = {
  packagerConfig: {
    appBundleId: "uk.org.crru.photo-id",
    asar: {
      unpack: "**/@napi-rs/canvas*/**",
    },
    icon: path.join(__dirname, "resources", "icon"),
    executableName: "photo-id",
    extraResource: process.env.CI === "true" ? [path.resolve(__dirname, "./.env")] : [],
    extendInfo: {
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: "Photo ID Project",
          CFBundleTypeRole: "Editor",
          CFBundleTypeExtensions: [PROJECT_FILE_EXTENSION],
        },
      ],
    },
    osxUniversal: {
      x64ArchFiles: "**/@napi-rs/canvas*/**",
    },
    ...signingConfig,
    ...(windowsSignConfig ? { windowsSign: windowsSignConfig } : {}),
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel(windowsSignConfig ? { windowsSign: windowsSignConfig } : {}),
    new MakerDMG(dmgOptions),
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
        {
          entry: "src/preload-editor.ts",
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
      // Disabled on Windows because code signing modifies the binary after ASAR integrity checksums
      // are embedded, which causes validation errors during Squirrel update events.
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: process.platform !== "win32",
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
      if (process.env.CI === "true") {
        await fs.promises.writeFile(
          ".env",
          [
            `NODE_ENV=production`,
            `SENTRY_DSN=${process.env.SENTRY_DSN || ""}`,
            `VITE_SENTRY_DSN=${process.env.SENTRY_DSN || ""}`,
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
        draft: true,
        force: true,
        generateReleaseNotes: true,
      },
    },
  ],
};

export default config;
