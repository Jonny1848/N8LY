import React from "react";
import { GluestackUIProvider as BaseProvider } from "@gluestack-ui/themed";
import { config } from "@gluestack-ui/config";
// Kein Barrel-Import @gluestack-ui/core: package.json zeigt auf lib/esm/index.js (fehlt bei 3.0.10, nur index.jsx).
// Subpath wie bei menu/creator – re-export in overlay/creator.ts -> lib/esm/overlay/creator
import { OverlayProvider } from "@gluestack-ui/core/overlay/creator";

type Props = { children?: React.ReactNode };

/**
 * themed-Provider fuer Tokens/Config; OverlayProvider (Portal) fuer Core-Overlays
 * wie Menu/Popover – ohne letzteren oeffnet das Menue zwar den State, zeigt aber keinen Inhalt.
 */
export function GluestackUIProvider({ children }: Props) {
  return (
    <BaseProvider config={config}>
      <OverlayProvider>{children}</OverlayProvider>
    </BaseProvider>
  );
}
