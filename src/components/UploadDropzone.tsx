import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Camera, FilePlus, Loader2, UploadCloud } from 'lucide-react';

interface UploadDropzoneProps {
  contextLabel?: string;
  buttonLabel?: string;
  onUpload?: (file: File) => Promise<void>;
  className?: string;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'done';

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return (
    navigator.maxTouchPoints > 0 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

export function UploadDropzone({
  contextLabel = 'Upload a document',
  buttonLabel = 'Add document',
  onUpload,
  className = '',
}: UploadDropzoneProps) {
  const isMobile = useMemo(() => isMobileDevice(), []);
  const [status, setStatus] = useState<UploadState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulateProgress = useCallback(() => {
    setProgress(5);
    const interval = window.setInterval(() => {
      setProgress((current) => {
        const next = current + Math.floor(Math.random() * 12) + 8;
        return next >= 95 ? 95 : next;
      });
    }, 200);
    return () => window.clearInterval(interval);
  }, []);

  const resetState = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setSelectedFileName(null);
    setError(null);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setSelectedFileName(file.name);
      setStatus('uploading');
      setProgress(0);

      const stopProgress = simulateProgress();

      try {
        if (onUpload) {
          await onUpload(file);
        } else {
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
        }

        stopProgress();
        setProgress(100);
        setStatus('processing');
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
        setStatus('done');
      } catch (err) {
        stopProgress();
        setStatus('idle');
        setProgress(0);
        setError(err instanceof Error ? err.message : 'Upload failed.');
      }
    },
    [onUpload, simulateProgress]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      await handleFile(acceptedFiles[0]);
    },
    [handleFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': [] },
    multiple: false,
    noClick: isMobile,
    noKeyboard: true,
  });

  const handleNativeInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFile(file);
    event.target.value = '';
  };

  useEffect(() => {
    if (status === 'done') {
      const timer = window.setTimeout(() => resetState(), 2500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [resetState, status]);

  return (
    <div className={`rounded-3xl border border-cmd-border bg-cmd-black/40 p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cmd-muted">{contextLabel}</p>
          <h3 className="mt-2 text-lg font-semibold text-cmd-offwhite">{buttonLabel}</h3>
        </div>
        <div className="rounded-full bg-cmd-black/70 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cmd-muted">
          {status === 'uploading'
            ? 'Uploading'
            : status === 'processing'
            ? 'Processing'
            : status === 'done'
            ? 'Done'
            : 'Ready'}
        </div>
      </div>

      {isMobile ? (
        <label className="group flex cursor-pointer items-center justify-between gap-3 rounded-3xl border border-dashed border-cmd-border bg-cmd-charcoal/70 px-4 py-5 text-left transition hover:border-cmd-gold">
          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-cmd-gold" />
            <div>
              <p className="font-medium text-cmd-offwhite">Tap to take a photo or choose a file</p>
              <p className="text-sm text-cmd-muted">JPEG, PNG, PDF</p>
            </div>
          </div>
          <input
            {...getInputProps()}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="sr-only"
            onChange={handleNativeInput}
          />
        </label>
      ) : (
        <div
          {...getRootProps()}
          className={`rounded-3xl border border-dashed px-4 py-8 text-center transition ${
            isDragActive ? 'border-cmd-gold bg-cmd-black/70' : 'border-cmd-border bg-cmd-charcoal/80'
          }`}
        >
          <input {...getInputProps()} />
          <div className="mx-auto flex max-w-xs flex-col items-center gap-4 text-center">
            <UploadCloud className="h-10 w-10 text-cmd-gold" />
            <div>
              <p className="text-sm font-semibold text-cmd-offwhite">Drag & drop a file here</p>
              <p className="mt-1 text-sm text-cmd-muted">or click to browse photos and PDFs</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cmd-border bg-cmd-black/60 px-4 py-2 text-xs uppercase tracking-[0.16em] text-cmd-muted">
              <FilePlus className="h-4 w-4" /> Select file
            </div>
          </div>
        </div>
      )}

      {status !== 'idle' ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-sm text-cmd-muted">
            <span>{selectedFileName ?? 'Preparing file...'}</span>
            <span>{status === 'processing' ? 'Processing...' : `${progress}%`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-cmd-black/80">
            <div className="h-full rounded-full bg-cmd-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
          {status === 'done' && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              Upload completed. Document queued for extraction.
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
