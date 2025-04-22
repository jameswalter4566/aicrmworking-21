
import React, { useRef } from "react";
import { Upload } from "lucide-react";

interface DropboxUploaderProps {
  onFilesAdded?: (files: File[]) => void;
}

const DropboxUploader: React.FC<DropboxUploaderProps> = ({ onFilesAdded }) => {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (onFilesAdded) onFilesAdded(files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (onFilesAdded) onFilesAdded(files);
  };

  return (
    <div
      className="flex flex-col items-center justify-center w-full h-80 border-4 border-dashed border-blue-400 bg-blue-50/60 rounded-3xl p-8 cursor-pointer transition-all hover:bg-blue-100/80"
      onClick={() => fileInput.current?.click()}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      tabIndex={0}
      role="button"
      aria-label="Upload documents"
    >
      <Upload className="h-12 w-12 text-blue-500 mb-2" />
      <span className="font-semibold text-lg text-blue-800 mb-1">Drop files here or click to upload</span>
      <span className="text-blue-600 text-sm mb-2">You can upload multiple PDF or image files</span>
      <input
        ref={fileInput}
        type="file"
        multiple
        accept=".pdf,image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default DropboxUploader;
