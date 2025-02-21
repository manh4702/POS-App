module.exports = {
  appId: "com.pos.app",
  productName: "POS App",
  directories: {
    output: "dist",
    buildResources: "assets"
  },
  files: [
    "package.json",
    "node_modules/**/*",
    "backend/build/**/*"
  ],
  extraResources: [
    {
      from: "frontend/build",
      to: "app",
      filter: ["**/*"]
    }
  ],
  win: {
    target: "nsis",
    icon: "frontend/public/logo.png"
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  asar: true,
  asarUnpack: [
    "node_modules/@journeyapps/sqlcipher/**/*"
  ]
}; 