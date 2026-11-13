const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Restricts the Android APK to arm64-v8a ABI only.
 * Most modern Android phones (2017+) use arm64-v8a.
 * This reduces APK size by ~30-40MB by excluding armeabi-v7a and x86_64 native libs.
 */
module.exports = function withArm64Only(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Method 1: Add abiFilters inside an existing ndk block
    if (contents.includes('ndk {')) {
      contents = contents.replace(
        /ndk \{([^}]+)\}/,
        (match, inner) => {
          if (inner.includes('abiFilters')) return match;
          return `ndk {\n            abiFilters "arm64-v8a"\n            ${inner.trim()}\n          }`;
        }
      );
    } else {
      // Method 2: Insert ndk block before the closing brace of defaultConfig
      contents = contents.replace(
        /(defaultConfig\s*\{[^}]+?)(\n\s*\})/,
        '$1\n        ndk {\n            abiFilters "arm64-v8a"\n        }\n    $2'
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
