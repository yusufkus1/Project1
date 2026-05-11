import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, X, FileText, Image, File, Download } from "lucide-react";
import { tasksApi, TaskAttachment } from "../../api/tasks";
import toast from "react-hot-toast";

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? "";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimetype }: { mimetype: string }) {
  if (mimetype.startsWith("image/")) return <Image size={18} />;
  if (mimetype.includes("pdf")) return <FileText size={18} />;
  return <File size={18} />;
}

function AttachmentCard({
  attachment,
  taskId,
  onDelete,
}: {
  attachment: TaskAttachment;
  taskId: string;
  onDelete: () => void;
}) {
  const isImage = attachment.mimetype.startsWith("image/");
  const src = `${BACKEND}${attachment.url}`;

  return (
    <div
      className="bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 group"
      style={{
        borderRadius: "0.625rem",
        border: "1px solid",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Image thumbnail */}
      {isImage ? (
        <a href={src} target="_blank" rel="noreferrer">
          <img
            src={src}
            alt={attachment.originalName}
            style={{ width: "100%", height: "7rem", objectFit: "cover", display: "block" }}
          />
        </a>
      ) : (
        <div
          className="bg-gray-100 dark:bg-gray-700/60"
          style={{ height: "5rem", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <span className="text-gray-400 dark:text-gray-500">
            <FileIcon mimetype={attachment.mimetype} />
          </span>
        </div>
      )}

      {/* Info row */}
      <div style={{ padding: "0.5rem 0.625rem", display: "flex", alignItems: "center", gap: "0.375rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            className="text-gray-700 dark:text-gray-300"
            style={{ fontSize: "0.75rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {attachment.originalName}
          </p>
          <p className="text-gray-400 dark:text-gray-600" style={{ fontSize: "0.6875rem" }}>
            {formatBytes(attachment.size)}
          </p>
        </div>
        <a
          href={src}
          download={attachment.originalName}
          className="text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          style={{ flexShrink: 0 }}
        >
          <Download size={13} />
        </a>
        <button
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

interface Props {
  taskId: string;
  attachments: TaskAttachment[];
}

export function AttachmentSection({ taskId, attachments }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => tasksApi.uploadAttachment(taskId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task", taskId] }),
    onError: () => toast.error("Upload failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => tasksApi.deleteAttachment(taskId, attachmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task", taskId] }),
    onError: () => toast.error("Delete failed"),
  });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 20 MB limit`);
        return;
      }
      uploadMutation.mutate(file);
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <p
        className="text-gray-500 dark:text-gray-400"
        style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}
      >
        Attachments {attachments.length > 0 && `(${attachments.length})`}
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors cursor-pointer"
        style={{
          border: `2px dashed`,
          borderColor: dragging ? "#6366f1" : undefined,
          borderRadius: "0.625rem",
          padding: "1rem",
          textAlign: "center",
          background: dragging ? "rgba(99,102,241,0.04)" : "transparent",
          marginBottom: attachments.length > 0 ? "0.875rem" : 0,
          transition: "all 0.15s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploadMutation.isPending ? (
          <p className="text-indigo-400" style={{ fontSize: "0.8125rem" }}>Uploading…</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
            <Upload size={18} className="text-gray-300 dark:text-gray-600" />
            <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.8125rem" }}>
              Click or drag files here
            </p>
            <p className="text-gray-300 dark:text-gray-700" style={{ fontSize: "0.75rem" }}>
              Any file up to 20 MB
            </p>
          </div>
        )}
      </div>

      {/* Attachment grid */}
      {attachments.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))", gap: "0.625rem" }}>
          {attachments.map((att) => (
            <AttachmentCard
              key={att.id}
              attachment={att}
              taskId={taskId}
              onDelete={() => deleteMutation.mutate(att.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
