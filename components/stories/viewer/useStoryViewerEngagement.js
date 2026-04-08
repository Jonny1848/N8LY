import { useCallback, useEffect, useState } from 'react';
import { buildDefaultReactions, getVisibleReactionPresets, simpleHash } from './utils';

/**
 * Lokales Bundle-Engagement (ein Eintrag pro Autor), Kommentar- und Reaktions-Modal-State.
 * Server-Persistenz spaeter ersetzt setBundleEngagementByAuthor.
 */
export function useStoryViewerEngagement({ authorNorm, isOwn, stories }) {
  const [bundleEngagementByAuthor, setBundleEngagementByAuthor] = useState({});
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [reactionPickVisible, setReactionPickVisible] = useState(false);

  useEffect(() => {
    if (stories.length === 0 || !authorNorm) return;
    setBundleEngagementByAuthor((prev) => {
      const next = { ...prev };
      const seedCacheKey = authorNorm + stories.map((s) => s.id).sort().join('|');
      const seed = simpleHash(seedCacheKey);
      if (!next[authorNorm]) {
        next[authorNorm] = {
          liked: false,
          reactions: buildDefaultReactions(seed),
          comments: 100 + (seed % 120),
          shares: 25 + (seed % 80),
          bookmarks: 80 + (seed % 100),
          bookmarked: false,
        };
      } else if (!next[authorNorm].reactions) {
        const old = next[authorNorm];
        const migratedHeart =
          typeof old.likes === 'number' ? old.likes : buildDefaultReactions(seed).heart;
        const { likes: _drop, ...rest } = old;
        next[authorNorm] = {
          ...rest,
          reactions: { ...buildDefaultReactions(seed), heart: migratedHeart },
        };
      }
      return next;
    });
  }, [stories, authorNorm]);

  const handleDoubleTapLike = useCallback(() => {
    if (isOwn || !authorNorm) return;
    setBundleEngagementByAuthor((prev) => {
      const e = prev[authorNorm];
      if (!e || e.liked) return prev;
      const r = { ...(e.reactions || buildDefaultReactions(0)) };
      r.heart = (r.heart ?? 0) + 1;
      return { ...prev, [authorNorm]: { ...e, liked: true, reactions: r } };
    });
  }, [authorNorm, isOwn]);

  const toggleHeartReaction = useCallback(() => {
    if (isOwn || !authorNorm) return;
    setBundleEngagementByAuthor((prev) => {
      const e = prev[authorNorm];
      if (!e) return prev;
      const base = { ...(e.reactions || buildDefaultReactions(0)) };
      if (e.liked) {
        return {
          ...prev,
          [authorNorm]: {
            ...e,
            liked: false,
            reactions: { ...base, heart: Math.max(0, (base.heart ?? 0) - 1) },
          },
        };
      }
      return {
        ...prev,
        [authorNorm]: {
          ...e,
          liked: true,
          reactions: { ...base, heart: (base.heart ?? 0) + 1 },
        },
      };
    });
  }, [authorNorm, isOwn]);

  const bumpReaction = useCallback(
    (reactionKey) => {
      if (isOwn || !authorNorm) return;
      setBundleEngagementByAuthor((prev) => {
        const e = prev[authorNorm];
        if (!e) return prev;
        const r = { ...(e.reactions || buildDefaultReactions(0)) };
        r[reactionKey] = (r[reactionKey] ?? 0) + 1;
        return { ...prev, [authorNorm]: { ...e, reactions: r } };
      });
    },
    [authorNorm, isOwn]
  );

  const openCommentModal = useCallback(() => {
    if (isOwn) return;
    setCommentDraft('');
    setCommentModalVisible(true);
  }, [isOwn]);

  const submitComment = useCallback(() => {
    const text = commentDraft.trim();
    if (isOwn || !authorNorm || !text) {
      setCommentModalVisible(false);
      return;
    }
    setBundleEngagementByAuthor((prev) => {
      const e = prev[authorNorm];
      if (!e) return prev;
      return { ...prev, [authorNorm]: { ...e, comments: e.comments + 1 } };
    });
    setCommentModalVisible(false);
    setCommentDraft('');
  }, [commentDraft, authorNorm, isOwn]);

  const recordShare = useCallback(() => {
    if (!authorNorm) return;
    setBundleEngagementByAuthor((prev) => {
      const e = prev[authorNorm];
      if (!e) return prev;
      return { ...prev, [authorNorm]: { ...e, shares: e.shares + 1 } };
    });
  }, [authorNorm]);

  const toggleBookmark = useCallback(() => {
    if (isOwn || !authorNorm) return;
    setBundleEngagementByAuthor((prev) => {
      const e = prev[authorNorm];
      if (!e) return prev;
      const nextMarked = !e.bookmarked;
      const delta = nextMarked ? 1 : -1;
      return {
        ...prev,
        [authorNorm]: {
          ...e,
          bookmarked: nextMarked,
          bookmarks: Math.max(0, e.bookmarks + delta),
        },
      };
    });
  }, [authorNorm, isOwn]);

  const openReactionPicker = useCallback(() => {
    if (isOwn) return;
    setReactionPickVisible(true);
  }, [isOwn]);

  const pickReactionEmoji = useCallback(
    (reactionKey) => {
      bumpReaction(reactionKey);
      setReactionPickVisible(false);
    },
    [bumpReaction]
  );

  const bundleEng =
    authorNorm && stories.length > 0 ? bundleEngagementByAuthor[authorNorm] ?? null : null;
  const bundleReactions = bundleEng?.reactions || buildDefaultReactions(0);
  const visibleReactionPresets = bundleEng ? getVisibleReactionPresets(bundleReactions) : [];

  return {
    bundleEng,
    bundleReactions,
    visibleReactionPresets,
    handleDoubleTapLike,
    toggleHeartReaction,
    bumpReaction,
    openCommentModal,
    submitComment,
    commentModalVisible,
    setCommentModalVisible,
    commentDraft,
    setCommentDraft,
    recordShare,
    toggleBookmark,
    reactionPickVisible,
    setReactionPickVisible,
    openReactionPicker,
    pickReactionEmoji,
  };
}
