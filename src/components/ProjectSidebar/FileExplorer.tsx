import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  RefreshCw,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeList } from 'react-window';

import { getPtyCwd, listDirectory, type DirectoryEntry } from '../../lib/tauri';
import styles from './FileExplorer.module.css';

const ITEM_HEIGHT = 24;
const VIRTUAL_THRESHOLD = 50;
const CACHE_TTL_MS = 30_000;

const dirCache = new Map<string, { entries: DirectoryEntry[]; ts: number }>();

function getCachedEntries(
  path: string,
  bypassCache: boolean,
): DirectoryEntry[] | null {
  if (bypassCache) return null;
  const hit = dirCache.get(path);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) {
    dirCache.delete(path);
    return null;
  }
  return hit.entries;
}

function setCachedEntries(path: string, entries: DirectoryEntry[]) {
  dirCache.set(path, { entries, ts: Date.now() });
}

type FileExplorerProps = {
  cwd: string;
  ptyId: string | null;
  terminalName: string;
  onFileClick?: (filePath: string) => void;
};

export function FileExplorer({
  cwd,
  ptyId,
  terminalName,
  onFileClick,
}: FileExplorerProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [liveCwd, setLiveCwd] = useState(cwd);

  useEffect(() => {
    setLiveCwd(cwd);
    if (cwd || !ptyId) return;
    let cancelled = false;
    getPtyCwd(ptyId)
      .then((value) => {
        if (!cancelled && value) setLiveCwd(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [cwd, ptyId]);

  const onRefresh = useCallback(() => {
    dirCache.clear();
    setReloadKey((v) => v + 1);
  }, []);

  if (!liveCwd) {
    return (
      <div className={styles.message}>
        Este terminal nao possui uma pasta ativa.
      </div>
    );
  }

  return (
    <div className={styles.explorer}>
      <div className={styles.context} title={liveCwd}>
        <span className={styles.contextName}>{terminalName}</span>
        <span className={styles.contextPath}>{liveCwd}</span>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onRefresh}
          title="Atualizar arquivos"
          aria-label="Atualizar arquivos"
        >
          <RefreshCw size={13} />
        </button>
      </div>
      <DirectoryNode
        path={liveCwd}
        name={rootName(liveCwd)}
        depth={0}
        initialOpen
        reloadKey={reloadKey}
        onFileClick={onFileClick}
      />
    </div>
  );
}

const DirectoryNode = memo(function DirectoryNode({
  path,
  name,
  depth,
  initialOpen = false,
  reloadKey,
  onFileClick,
}: {
  path: string;
  name: string;
  depth: number;
  initialOpen?: boolean;
  reloadKey: number;
  onFileClick?: (filePath: string) => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lastReloadKey = useRef(reloadKey);

  const bypassCache = reloadKey !== lastReloadKey.current;
  if (bypassCache) lastReloadKey.current = reloadKey;

  useEffect(() => {
    if (!open) return;
    const cached = getCachedEntries(path, bypassCache);
    if (cached) {
      setEntries(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    listDirectory(path)
      .then((result) => {
        if (!cancelled) {
          setEntries(result);
          setCachedEntries(path, result);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, path, reloadKey]);

  const toggleOpen = useCallback(() => setOpen((v) => !v), []);

  const dirs = useMemo(() => entries.filter((e) => e.is_dir), [entries]);
  const files = useMemo(() => entries.filter((e) => !e.is_dir), [entries]);

  return (
    <div>
      <button
        type="button"
        className={`${styles.row} ${depth === 0 ? styles.rootRow : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={toggleOpen}
        title={path}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {open ? <FolderOpen size={14} /> : <Folder size={14} />}
        <span>{name}</span>
      </button>
      {open ? (
        <div>
          {loading ? <SkeletonRows depth={depth} /> : null}
          {error ? (
            <div className={styles.message}>
              Nao foi possivel ler esta pasta.
            </div>
          ) : null}
          {!loading && !error ? (
            <>
              {dirs.map((entry) => (
                <DirectoryNode
                  key={entry.path}
                  path={entry.path}
                  name={entry.name}
                  depth={depth + 1}
                  reloadKey={reloadKey}
                  onFileClick={onFileClick}
                />
              ))}
              {files.length > VIRTUAL_THRESHOLD ? (
                <VirtualFileList
                  files={files}
                  depth={depth}
                  onFileClick={onFileClick}
                />
              ) : (
                files.map((entry) => (
                  <FileRow
                    key={entry.path}
                    entry={entry}
                    depth={depth}
                    onFileClick={onFileClick}
                  />
                ))
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

const FileRow = memo(function FileRow({
  entry,
  depth,
  onFileClick,
}: {
  entry: DirectoryEntry;
  depth: number;
  onFileClick?: (filePath: string) => void;
}) {
  const handleDoubleClick = useCallback(() => {
    if (!entry.is_dir && onFileClick) onFileClick(entry.path);
  }, [entry.path, entry.is_dir, onFileClick]);

  return (
    <div
      className={styles.row}
      style={{ paddingLeft: 22 + depth * 14 }}
      title={entry.path}
      onDoubleClick={handleDoubleClick}
    >
      <File size={13} />
      <span>{entry.name}</span>
    </div>
  );
});

function VirtualFileList({
  files,
  depth,
  onFileClick,
}: {
  files: DirectoryEntry[];
  depth: number;
  onFileClick?: (filePath: string) => void;
}) {
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const entry = files[index];
      return (
        <div
          className={styles.row}
          style={{
            ...style,
            paddingLeft: 22 + depth * 14,
          }}
          title={entry.path}
          onDoubleClick={() => {
            if (!entry.is_dir && onFileClick) onFileClick(entry.path);
          }}
        >
          <File size={13} />
          <span>{entry.name}</span>
        </div>
      );
    },
    [files, depth, onFileClick],
  );

  const height = Math.min(files.length * ITEM_HEIGHT, 400);

  return (
    <FixedSizeList
      height={height}
      itemCount={files.length}
      itemSize={ITEM_HEIGHT}
      width="100%"
      overscanCount={10}
    >
      {Row}
    </FixedSizeList>
  );
}

function SkeletonRows({ depth }: { depth: number }) {
  return (
    <div className={styles.skeleton}>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className={styles.skeletonRow}
          style={{
            paddingLeft: 22 + depth * 14,
            animationDelay: `${i * 80}ms`,
          }}
        >
          <div className={styles.skeletonIcon} />
          <div className={styles.skeletonText} />
        </div>
      ))}
    </div>
  );
}

function rootName(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '');
  return normalized.split(/[\\/]/).pop() || normalized;
}
