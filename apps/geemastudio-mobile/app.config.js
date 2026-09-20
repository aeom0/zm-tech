/**
 * Config dinámica: parte de app.json y ajusta ABIs/minify según perfil EAS.
 * Perfiles preview/production → APK arm64 + R8; dev/local → ABIs completas.
 */
module.exports = ({ config }) => {
  /** Perfiles EAS de distribución: APK más liviano (solo arm64). */
  const SLIM_ABI_PROFILES = new Set(['preview', 'production'])
  const easProfile = process.env.EAS_BUILD_PROFILE ?? ''
  const slimAbi = SLIM_ABI_PROFILES.has(easProfile)

  const plugins = (config.plugins ?? []).map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== 'expo-build-properties') {
      return plugin
    }
    const [, options = {}] = plugin
    const android = { ...(options.android ?? {}) }
    if (slimAbi) {
      android.reactNativeArchitectures = ['arm64-v8a']
      android.enableMinifyInReleaseBuilds = true
      android.enableShrinkResourcesInReleaseBuilds = true
    } else {
      delete android.reactNativeArchitectures
      delete android.enableMinifyInReleaseBuilds
      delete android.enableShrinkResourcesInReleaseBuilds
    }
    return ['expo-build-properties', { ...options, android }]
  })

  return {
    ...config,
    plugins,
  }
}
