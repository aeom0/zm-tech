/**
 * Config dinámica: parte de app.json y ajusta ABIs/minify según perfil EAS.
 * Perfiles preview/production → APK arm64 + R8; dev/local → ABIs completas.
 * Push FCM: googleServicesFile vía EAS secret GOOGLE_SERVICES_JSON (file) o
 * ./google-services.json local (gitignored; Firebase app com.geemastudio.app
 * en proyecto zm-lash-nails-beauty — mismo FCM_SERVICE_ACCOUNT que ZM).
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
    android: {
      ...(config.android ?? {}),
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
    plugins,
  }
}
