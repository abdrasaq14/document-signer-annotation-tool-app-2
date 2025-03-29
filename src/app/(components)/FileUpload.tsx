/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef, useState } from "react";
import { FaCloudUploadAlt } from "react-icons/fa";

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
}

// File Uploader Component
const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelected }) => {
  const [dragging, setDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsLoading(true);
      onFileSelected(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      setIsLoading(true);
      onFileSelected(files[0]);
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex items-center justify-center flex-col">
      <div
        className={`w-[600px] h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-white shadow-lg ${
          dragging ? "border-blue-500" : "border-gray-300"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf"
          className="hidden"
        />
        <FaCloudUploadAlt size={50} className="text-blue-600 mb-4" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
        >
          Select PDF
        </button>
        <p className="mt-2 text-gray-700 text-sm">
          Drag and drop or click to upload a PDF
        </p>
      </div>
    </div>
  );
};

export default FileUploader;
