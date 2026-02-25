import React from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface AvatarProps {
    url?: string | null;
    size?: number;
    borderWidth?: number;
    borderColor?: string;
    style?: ViewStyle | ImageStyle;
}

export function Avatar({
    url,
    size = 40,
    borderWidth = 2,
    borderColor = 'white',
    style
}: AvatarProps) {
    const containerStyle = [
        styles.container,
        {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth,
            borderColor
        },
        style
    ];

    if (!url) {
        return (
            <View style={[containerStyle, styles.fallback]}>
                <Ionicons name="person" size={size * 0.5} color={theme.colors.neutral.gray[400]} />
            </View>
        );
    }

    return (
        <Image
            source={{ uri: url }}
            style={containerStyle as ImageStyle}
        />
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.neutral.gray[100],
        overflow: 'hidden',
    },
    fallback: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});