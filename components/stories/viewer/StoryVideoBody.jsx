import { useEffect } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';

/**
 * Ein Video-Slide: Player-Hook auf Top-Level; viewed nach kurzer Verzoegerung melden.
 */
export function StoryVideoBody({ uri, storyId, isOwn, onMarkViewed, width, height, isMuted, isActive }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = isMuted;
    p.play();
  });

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  useEffect(() => {
    if (isActive) player.play();
    else player.pause();
  }, [isActive, player]);

  useEffect(() => {
    const t = setTimeout(() => {
      onMarkViewed(storyId, isOwn);
    }, 500);
    return () => clearTimeout(t);
  }, [storyId, isOwn, onMarkViewed]);

  return <VideoView player={player} style={{ width, height }} contentFit="cover" nativeControls={false} />;
}
