/**
 * VoiceMessageBubble – Sprachnachricht mit Play/Pause, Waveform und verschiebbarem Fortschrittspunkt.
 * Hooks muessen hier bleiben (nicht in FlatList renderItem).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, PanResponder } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { PlayIcon, PauseIcon } from 'react-native-heroicons/solid';
import { theme } from '../../constants/theme';

const WAVEFORM_BARS = 40;
const BAR_WIDTH = 2;
const BAR_GAP = 1.5;
const MAX_BAR_HALF_HEIGHT = 11;
const DOT_SIZE = 10;
const WAVEFORM_WIDTH = WAVEFORM_BARS * BAR_WIDTH + (WAVEFORM_BARS - 1) * BAR_GAP;
const MIN_AMPLITUDE = 0.25;
const MIN_BAR_HEIGHT = 6;
const CAPTURE_OFFSET_SEC = 0.5;

function getProceduralWaveform(numBars) {
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed & 0x7fffffff) / 2147483647;
  };
  return Array.from({ length: numBars }, () => 0.15 + 0.85 * rand());
}

function normalizeWaveform(data, numBars) {
  if (!data || data.length === 0) return getProceduralWaveform(numBars);
  const allSame = data.every((v, _, arr) => Math.abs(v - arr[0]) < 0.05);
  if (allSame) return getProceduralWaveform(numBars);
  if (data.length === numBars) return data;
  if (data.length < numBars) {
    return Array.from({ length: numBars }, (_, i) => {
      const idx = (i / (numBars - 1)) * (data.length - 1);
      const lo = Math.floor(idx);
      const hi = Math.min(lo + 1, data.length - 1);
      const t = idx - lo;
      return data[lo] * (1 - t) + data[hi] * t;
    });
  }
  return Array.from({ length: numBars }, (_, i) => {
    const idx = Math.floor((i / numBars) * data.length);
    return data[idx];
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function VoiceMessageBubble({ mediaUrl, waveformData, isOwn }) {
  const player = useAudioPlayer(mediaUrl, 16);
  const status = useAudioPlayerStatus(player);

  const playStartRef = useRef({ time: 0, timestamp: 0 });
  const wasPlayingRef = useRef(false);
  const finishedRef = useRef(false);

  const [dragging, setDragging] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);
  const dragStartRef = useRef({ progress: 0, wasPlaying: false });
  const seekProgressRef = useRef(0);

  useEffect(() => {
    if (status.didJustFinish) {
      finishedRef.current = true;
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  useEffect(() => {
    if (finishedRef.current && !status.playing && status.currentTime < 0.1) {
      finishedRef.current = false;
    }
  }, [status.playing, status.currentTime]);

  useEffect(() => {
    const justStarted = status.playing && !wasPlayingRef.current;
    wasPlayingRef.current = status.playing;
    if (justStarted && status.duration > 0) {
      const raw = status.currentTime;
      const adjusted =
        raw < 0.2 ? raw : clamp(raw - CAPTURE_OFFSET_SEC, 0, status.duration);
      playStartRef.current = { time: adjusted, timestamp: Date.now() };
    }
  }, [status.playing, status.currentTime, status.duration]);

  const duration = status.duration || 0;
  let displayTime;
  if (finishedRef.current) {
    displayTime = 0;
  } else if (status.didJustFinish) {
    displayTime = duration;
  } else if (status.playing) {
    displayTime =
      playStartRef.current.time + (Date.now() - playStartRef.current.timestamp) / 1000;
  } else {
    displayTime = clamp(status.currentTime - CAPTURE_OFFSET_SEC, 0, duration);
  }
  displayTime = clamp(displayTime, 0, duration);
  const progress = duration > 0 ? clamp(displayTime / duration, 0, 1) : 0;
  const progressRef = useRef(0);
  progressRef.current = progress;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5,
        onPanResponderGrant: (_, g) => {
          const dx = g.dx || 0;
          dragStartRef.current = {
            progress: progressRef.current,
            wasPlaying: status.playing,
          };
          seekProgressRef.current = clamp(
            progressRef.current + dx / WAVEFORM_WIDTH,
            0,
            1
          );
          setSeekProgress(seekProgressRef.current);
          setDragging(true);
        },
        onPanResponderMove: (_, g) => {
          const delta = g.dx / WAVEFORM_WIDTH;
          const p = clamp(dragStartRef.current.progress + delta, 0, 1);
          seekProgressRef.current = p;
          setSeekProgress(p);
        },
        onPanResponderRelease: () => {
          const p = seekProgressRef.current;
          const wasPlaying = dragStartRef.current.wasPlaying;
          setDragging(false);
          const seekSec = p * duration;
          player.seekTo(seekSec);
          playStartRef.current = { time: seekSec, timestamp: Date.now() };
          if (wasPlaying) player.play();
        },
      }),
    [duration, status.playing, player]
  );

  const effectiveProgress = dragging ? seekProgress : progress;

  const togglePlayback = async () => {
    if (status.playing) {
      player.pause();
    } else {
      if (status.currentTime >= status.duration && status.duration > 0) {
        await player.seekTo(0);
      }
      player.play();
    }
  };

  const formatDuration = (seconds) => {
    const s = Math.round(seconds || 0);
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const bars = useMemo(
    () => normalizeWaveform(waveformData, WAVEFORM_BARS),
    [waveformData]
  );
  const filledColor = isOwn ? '#FFFFFF' : theme.colors.primary.main;
  const unfilledColor = isOwn ? 'rgba(255,255,255,0.3)' : theme.colors.neutral.gray[200];
  const barHeight = (amplitude) =>
    Math.max(MIN_BAR_HEIGHT, Math.max(MIN_AMPLITUDE, amplitude) * MAX_BAR_HALF_HEIGHT * 2);

  return (
    <View style={styles.container}>
      <Pressable onPress={togglePlayback} style={styles.playBtn}>
        {status.playing ? (
          <PauseIcon size={16} color={isOwn ? '#FFFFFF' : theme.colors.primary.main} />
        ) : (
          <PlayIcon size={16} color={isOwn ? '#FFFFFF' : theme.colors.primary.main} />
        )}
      </Pressable>

      <View style={styles.progressArea}>
        <View
          style={[styles.waveformContainer, { width: WAVEFORM_WIDTH }]}
          {...panResponder.panHandlers}
        >
          {bars.map((amplitude, i) => (
            <View
              key={`u-${i}`}
              style={[
                styles.waveformBar,
                {
                  width: BAR_WIDTH,
                  height: barHeight(amplitude),
                  marginHorizontal: BAR_GAP / 2,
                  backgroundColor: unfilledColor,
                },
              ]}
            />
          ))}
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.waveformReveal,
              { width: effectiveProgress * WAVEFORM_WIDTH },
            ]}
          >
            {bars.map((amplitude, i) => (
              <View
                key={`f-${i}`}
                style={[
                  styles.waveformBar,
                  {
                    width: BAR_WIDTH,
                    height: barHeight(amplitude),
                    marginHorizontal: BAR_GAP / 2,
                    backgroundColor: filledColor,
                  },
                ]}
              />
            ))}
          </View>
          <View
            style={[
              styles.progressDot,
              {
                left: effectiveProgress * WAVEFORM_WIDTH,
                backgroundColor: filledColor,
              },
            ]}
          />
        </View>
        <Text
          style={[
            styles.duration,
            { color: isOwn ? 'rgba(255,255,255,0.7)' : theme.colors.neutral.gray[500] },
          ]}
        >
          {status.playing || status.currentTime > 0
            ? formatDuration(dragging ? seekProgress * duration : displayTime)
            : formatDuration(duration)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 220,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  progressArea: {
    flex: 1,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: MAX_BAR_HALF_HEIGHT * 2,
    marginBottom: 6,
    position: 'relative',
  },
  waveformReveal: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  waveformBar: {
    borderRadius: 1.5,
  },
  progressDot: {
    position: 'absolute',
    top: (MAX_BAR_HALF_HEIGHT * 2 - DOT_SIZE) / 2,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginLeft: -(DOT_SIZE / 2),
  },
  duration: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
  },
});
