// Lê o app.json e injeta o número de versão gerado pelo GitHub Actions.
module.exports = ({ config }) => {
  const build = Number(process.env.VERSION_CODE || 1);
  return {
    ...config,
    version: `3.0.${build}`,
    android: { ...config.android, versionCode: build },
  };
};
