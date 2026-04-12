/**
 * Expo Config Plugin: iOS-Pod «fmt» und Apple Clang (C++20 consteval)
 */
const { withPodfile } = require("@expo/config-plugins");

/** Eindeutiger Marker, damit wir bei wiederholtem Prebuild nicht doppelt einfügen. */
const MARKER = "# FMT_USE_CONSTEVAL fix (N8LY plugin withFmtPodConstevalFix)";

/**
 * Ruby-Snippet: C++-Standard fuer das fmt-Pod-Ziel auf C++17 herabsetzen.
 * Wird am Ende von post_install eingefuegt (nach react_native_post_install).
 */
const RUBY_SNIPPET = `
    ${MARKER}
    # MUSS nach react_native_post_install stehen, da dieses C++20 global setzt
    # und unsere Target-Einstellung sonst ueberschrieben wird.
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
`;

/**
 * @param {import('@expo/config-types').ExpoConfig} config
 */
function withFmtPodConstevalFix(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes(MARKER)) {
      return config;
    }

    // Einfuegepunkt: direkt VOR dem schliessenden «end» des post_install-Blocks.
    // So landet unser Fix garantiert NACH allen anderen post_install-Aufrufen
    // (insbesondere react_native_post_install).
    const lastEndBeforeEOF = contents.lastIndexOf("\n  end\nend");
    if (lastEndBeforeEOF === -1) {
      throw new Error(
        "withFmtPodConstevalFix: Konnte das Ende des post_install-Blocks nicht finden. " +
          "Bitte Expo/React-Native-Version und Podfile manuell pruefen."
      );
    }

    config.modResults.contents =
      contents.slice(0, lastEndBeforeEOF) +
      "\n" +
      RUBY_SNIPPET +
      contents.slice(lastEndBeforeEOF);

    return config;
  });
}

module.exports = withFmtPodConstevalFix;
