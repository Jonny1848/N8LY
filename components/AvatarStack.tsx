import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';
import { Avatar } from './Avatar';

interface AvatarStackProps {
    avatars: string[];
    totalCount?: number;
    maxVisible?: number;
    size?: number;
    spacing?: number;
    style?: ViewStyle;
}

export function AvatarStack({
    avatars = [],
    totalCount = 0,
    maxVisible = 3,
    size = 26,
    spacing = -8,
    style,
}: AvatarStackProps) {
    // Only show until limit
    const visibleAvatars = avatars.slice(0, maxVisible);
    // Calculate how many are left
    const remainingCount = Math.max(0, totalCount - maxVisible);

    return (
        <View style={[styles.container, style]}>
            {visibleAvatars.map((url, index) => (
                <Avatar
                    key={index}
                    url={url}
                    size={size}
                    style={{
                        marginLeft: index === 0 ? 0 : spacing,
                        zIndex: maxVisible + 1 - index,
                    }}
                />
            ))}

            {remainingCount > 0 && (
                <View
                    style={[
                        styles.avatar,
                        styles.countAvatar,
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            marginLeft: spacing,
                            zIndex: 0,
                        },
                    ]}
                >
                    <Text style={[styles.countText, { fontSize: size * 0.38 }]}>
                        +{remainingCount}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        borderWidth: 2,
        borderColor: 'white',
        backgroundColor: theme.colors.neutral.gray[100],
    },
    countAvatar: {
        backgroundColor: theme.colors.neutral.gray[50],
        justifyContent: 'center',
        alignItems: 'center',
    },
    countText: {
        fontWeight: '800',
        color: theme.colors.neutral.gray[600],
        letterSpacing: -0.5,
    },
});