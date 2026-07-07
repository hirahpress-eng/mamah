'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Clock,
  Trash2,
  FileText,
  BookOpen,
  X,
} from 'lucide-react';

import { useArticleStore, type ArticleHistoryEntry } from '@/store/article-store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ─── Relative Time Helper ─────────────────────────────────────────

function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 2) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffMonths < 12) {
    const d = new Date(dateString);
    return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`;
  }
  const d = new Date(dateString);
  return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`;
}

// ─── History Item Component ───────────────────────────────────────

function HistoryItem({
  entry,
  onLoad,
  onDelete,
}: {
  entry: ArticleHistoryEntry;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const visibleKeywords = entry.keywords.slice(0, 3);
  const extraCount = Math.max(0, entry.keywords.length - 3);

  return (
    <div className="group rounded-lg border border-border/60 bg-card p-3 transition-colors hover:bg-muted/30">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex-shrink-0 flex items-center justify-center size-7 rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
            <FileText className="size-3.5" />
          </div>
          <h4 className="text-sm font-medium text-foreground truncate leading-snug">
            {entry.title}
          </h4>
        </div>
      </div>

      {/* Keywords */}
      <div className="flex items-center gap-1 flex-wrap mb-2">
        {visibleKeywords.map((kw) => (
          <Badge
            key={kw}
            variant="secondary"
            className="text-[10px] px-1.5 py-0 font-medium"
          >
            {kw}
          </Badge>
        ))}
        {extraCount > 0 && (
          <span className="text-[10px] text-muted-foreground ml-0.5">
            +{extraCount} more
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2.5">
        <span>{entry.totalWordCount.toLocaleString()} words</span>
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {getRelativeTime(entry.savedAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs gap-1"
          onClick={onLoad}
        >
          <BookOpen className="size-3" />
          Load
        </Button>

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Article</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{entry.title}&rdquo; from your history? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ─── Main Sidebar Component ───────────────────────────────────────

export default function ArticleHistorySidebar() {
  const {
    articleHistory,
    loadFromHistory,
    deleteFromHistory,
    clearHistory,
  } = useArticleStore();

  const [open, setOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleLoad = (id: string, title: string) => {
    loadFromHistory(id);
    setOpen(false);
    toast.success(`Loaded "${title}"`);
  };

  const handleDelete = (id: string) => {
    deleteFromHistory(id);
    toast.success('Article removed from history');
  };

  const handleClearAll = () => {
    clearHistory();
    setShowClearConfirm(false);
    toast.success('History cleared');
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="size-9 text-muted-foreground hover:text-foreground relative"
        aria-label="Article history"
      >
        <Clock className="size-4" />
        {articleHistory.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center size-3.5 rounded-full bg-emerald-500 text-[8px] font-bold text-white leading-none">
            {articleHistory.length > 9 ? '9+' : articleHistory.length}
          </span>
        )}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-0">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Clock className="size-5 text-emerald-600 dark:text-emerald-400" />
              Article History
            </SheetTitle>
            <SheetDescription>
              {articleHistory.length > 0
                ? `${articleHistory.length} saved article${articleHistory.length !== 1 ? 's' : ''} — max 20`
                : 'Your saved articles will appear here'}
            </SheetDescription>
          </SheetHeader>

          <Separator className="mt-3" />

          {articleHistory.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-3">
                <div className="mx-auto flex items-center justify-center size-14 rounded-full bg-muted">
                  <BookOpen className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
                  No saved articles yet. Generate your first article to save it here.
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-3">
                {articleHistory.map((entry) => (
                  <HistoryItem
                    key={entry.id}
                    entry={entry}
                    onLoad={() => handleLoad(entry.id, entry.title)}
                    onDelete={() => handleDelete(entry.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          {articleHistory.length > 0 && (
            <div className="border-t p-4 mt-auto">
              <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full gap-2"
                  >
                    <Trash2 className="size-3.5" />
                    Clear All History
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All History</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {articleHistory.length} saved article{articleHistory.length !== 1 ? 's' : ''}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
