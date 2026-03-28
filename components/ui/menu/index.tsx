'use client';
import React from 'react';
import { createMenu } from '@gluestack-ui/core/menu/creator';
import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { cssInterop } from 'nativewind';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import {
  Motion,
  AnimatePresence,
  MotionComponentProps,
} from '@legendapp/motion';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';

type IMotionViewProps = React.ComponentProps<typeof View> &
  MotionComponentProps<typeof View, ViewStyle, unknown, unknown, unknown>;

// NativeWind v4: Motion.View (Third-Party) braucht cssInterop, damit className ankommt
const MotionView = Motion.View as React.ComponentType<IMotionViewProps>;
cssInterop(MotionView, { className: 'style' });

// Keine Gluestack-Semantik-Tokens im N8TLY-Tailwind (background-0, outline-100, …) -> sonst keine sichtbare Fuellfarbe
const MENU_SURFACE_BG = '#FFFFFF';

// PostScript-Namen von @expo-google-fonts/manrope (wie im restlichen N8TLY-UI)
const MENU_ITEM_FONT_MEDIUM = 'Manrope_500Medium';
const MENU_ITEM_FONT_BOLD = 'Manrope_700Bold';

const menuStyle = tva({
  base: 'min-w-[200px] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-md',
});

const menuItemStyle = tva({
  // gap-3: Abstand zwischen Icon und MenuItemLabel im flex-row (react-native ab ~0.71)
  base: 'min-w-[200px] flex-row items-center gap-3 rounded bg-white p-3 data-[hover=true]:bg-gray-100 data-[active=true]:bg-gray-100 data-[focus=true]:bg-gray-50 data-[focus=true]:web:outline-none data-[focus=true]:web:outline-0 data-[disabled=true]:opacity-40 data-[disabled=true]:web:cursor-not-allowed data-[focus-visible=true]:web:outline-2 data-[focus-visible=true]:web:outline-primary-600 data-[focus-visible=true]:web:outline data-[focus-visible=true]:web:cursor-pointer data-[disabled=true]:data-[focus=true]:bg-transparent',
});

const menuBackdropStyle = tva({
  base: 'absolute top-0 bottom-0 left-0 right-0 web:cursor-default',
  // add this classnames if you want to give background color to backdrop
  // opacity-50 bg-background-500,
});

const menuSeparatorStyle = tva({
  base: 'h-px w-full bg-gray-200',
});

const menuItemLabelStyle = tva({
  // Schriftgewicht ueber Manrope-Datei (bold-Variante unten im Label), nicht font-normal/font-bold von Tailwind
  base: 'text-base text-gray-900',

  variants: {
    isTruncated: {
      true: 'web:truncate',
    },
    bold: {
      true: '',
    },
    underline: {
      true: 'underline',
    },
    strikeThrough: {
      true: 'line-through',
    },
    size: {
      '2xs': 'text-2xs',
      'xs': 'text-xs',
      'sm': 'text-sm',
      'md': 'text-base',
      'lg': 'text-lg',
      'xl': 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl',
      '4xl': 'text-4xl',
      '5xl': 'text-5xl',
      '6xl': 'text-6xl',
    },
    sub: {
      true: 'text-xs',
    },
    italic: {
      true: 'italic',
    },
    highlight: {
      true: 'bg-yellow-500',
    },
  },
});

const BackdropPressable = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  React.ComponentPropsWithoutRef<typeof Pressable> &
    VariantProps<typeof menuBackdropStyle>
>(function BackdropPressable({ className, ...props }, ref) {
  return (
    <Pressable
      ref={ref}
      className={menuBackdropStyle({
        class: className,
      })}
      {...props}
    />
  );
});

type IMenuItemProps = VariantProps<typeof menuItemStyle> & {
  className?: string;
} & React.ComponentPropsWithoutRef<typeof Pressable>;

const Item = React.forwardRef<
  React.ComponentRef<typeof Pressable>,
  IMenuItemProps
>(function Item({ className, ...props }, ref) {
  return (
    <Pressable
      ref={ref}
      className={menuItemStyle({
        class: className,
      })}
      {...props}
    />
  );
});

const Separator = React.forwardRef<
  React.ComponentRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View> &
    VariantProps<typeof menuSeparatorStyle>
>(function Separator({ className, ...props }, ref) {
  return (
    <View
      ref={ref}
      className={menuSeparatorStyle({ class: className })}
      {...props}
    />
  );
});
export const UIMenu = createMenu({
  Root: MotionView,
  Item: Item,
  Label: Text,
  Backdrop: BackdropPressable,
  AnimatePresence: AnimatePresence,
  Separator: Separator,
});

// Root / ItemLabel / Backdrop: className per cssInterop ok.
cssInterop(UIMenu, { className: 'style' });
cssInterop(UIMenu.ItemLabel, { className: 'style' });
cssInterop(BackdropPressable, { className: 'style' });

type IMenuProps = React.ComponentProps<typeof UIMenu> &
  VariantProps<typeof menuStyle> & {
    className?: string;
    // Wird von useTreeState/useMenu genutzt, fehlt aber in den exportierten Core-Typen
    onAction?: (key: React.Key) => void;
  };
type IMenuItemLabelProps = React.ComponentProps<typeof UIMenu.ItemLabel> &
  VariantProps<typeof menuItemLabelStyle> & { className?: string };

const Menu = React.forwardRef<React.ComponentRef<typeof UIMenu>, IMenuProps>(
  function Menu({ className, style, ...props }, ref) {
    return (
      <UIMenu
        ref={ref}
        {...props}
        initial={{
          opacity: 0,
          scale: 0.8,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        exit={{
          opacity: 0,
          scale: 0.8,
        }}
        transition={{
          type: 'timing',
          duration: 100,
        }}
        className={menuStyle({
          class: className,
        })}
        // Zuletzt: eigene Flaechenfarbe, damit kein fremdes style= sie ueberschreibt; optional style von aussen mit mergen
        style={[{ backgroundColor: MENU_SURFACE_BG }, style]}
      />
    );
  }
);

const MenuItem = UIMenu.Item;

const MenuItemLabel = React.forwardRef<
  React.ComponentRef<typeof UIMenu.ItemLabel>,
  IMenuItemLabelProps
>(function MenuItemLabel(
  {
    className,
    isTruncated,
    bold,
    underline,
    strikeThrough,
    size = 'md',
    sub,
    italic,
    highlight,
    style,
    ...props
  },
  ref
) {
  const fontFamily = bold ? MENU_ITEM_FONT_BOLD : MENU_ITEM_FONT_MEDIUM;
  return (
    <UIMenu.ItemLabel
      ref={ref}
      className={menuItemLabelStyle({
        isTruncated: isTruncated as boolean,
        bold: bold as boolean,
        underline: underline as boolean,
        strikeThrough: strikeThrough as boolean,
        size,
        sub: sub as boolean,
        italic: italic as boolean,
        highlight: highlight as boolean,
        class: className,
      })}
      style={[{ fontFamily }, style]}
      {...props}
    />
  );
});

const MenuSeparator = UIMenu.Separator;

Menu.displayName = 'Menu';
MenuItem.displayName = 'MenuItem';
MenuItemLabel.displayName = 'MenuItemLabel';
MenuSeparator.displayName = 'MenuSeparator';
export { Menu, MenuItem, MenuItemLabel, MenuSeparator };
