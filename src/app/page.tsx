"use client";
import dynamic from "next/dynamic";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef } from "react";
import {
  FaHighlighter,
  FaComment,
  FaUnderline,
  FaUndo,
  FaRedo,
  FaCloudUploadAlt,
} from "react-icons/fa";
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
// pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.js`;
// Dynamically import PDF components with SSR disabled
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  {
    ssr: false,
    loading: () => <p>Loading PDF...</p>,
  }
);

const Page = dynamic(() => import("react-pdf").then((mod) => mod.Page), {
  ssr: false,
  loading: () => <p>Loading page...</p>,
});

const PDFAnnotatorApp: React.FC = () => {
  // State management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dragging, setDragging] = useState<boolean>(false);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Annotation methods
  const addAnnotation = (type: string) => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") return; // No text selected

    const newAnnotation = {
      id: Date.now(),
      type,
      page: currentPage,
      text: selection.toString(),
      range: selection.getRangeAt(0), // Store range for styling
    };

    setAnnotations([...annotations, newAnnotation]);
  };

  // File handling methods
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
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
      setSelectedFile(files[0]);
    }
  };

  // PDF Document Load Handler
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  // File Uploader Component
  const FileUploader = () => (
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

  // PDF Annotator Component
  const PDFAnnotator = () => (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Top Toolbar */}
      <div className="h-16 bg-[#8334c2] shadow-lg text-white flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSelectedFile(null)}
            className="text-white px-4 py-2 bg-red-600 rounded"
          >
            Back to Upload
          </button>
          <div className="text-xl font-semibold text-gray-800">
            PDF Annotator
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            className="p-2 hover:bg-gray-100 rounded"
            onClick={() => {
              const newAnnotations = [...annotations];
              newAnnotations.pop();
              setAnnotations(newAnnotations);
            }}
          >
            <FaUndo size={18} className="text-white" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded">
            <FaRedo size={18} className="text-white" />
          </button>
          <button className="bg-white text-[#8334c2] px-4 py-2 rounded">
            Finish
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Annotation Sidebar */}
        <div className="w-16 bg-white border-r shadow-md flex flex-col items-center pt-4 space-y-4">
          <button
            className="p-3 hover:bg-[#f1e0ff] rounded"
            onClick={() => addAnnotation("underline")}
          >
            <FaUnderline size={24} className="text-gray-700" />
          </button>
          <button
            className="p-3 hover:bg-[#f1e0ff] rounded"
            onClick={() => addAnnotation("highlight")}
          >
            <FaHighlighter size={24} className="text-gray-700" />
          </button>
          <button
            className="p-3 hover:bg-[#f1e0ff] rounded"
            onClick={() => addAnnotation("comment")}
          >
            <FaComment size={24} className="text-gray-700" />
          </button>
        </div>

        {/* Document Area */}
        <div className="flex-1 overflow-auto p-8 bg-gray-100">
          <Document file={selectedFile} onLoadSuccess={onDocumentLoadSuccess}>
            <div className="flex flex-col items-center space-y-8">
              {Array.from({ length: numPages }, (_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-xl overflow-hidden w-[794px] min-h-[1123px] border border-gray-200"
                >
                  <Page
                    pageNumber={index + 1}
                    width={794}
                    renderAnnotationLayer
                    renderTextLayer
                  />
                </div>
              ))}
            </div>
          </Document>
        </div>
      </div>
    </div>
  );

  // Render based on file selection
  return <div>{!selectedFile ? <FileUploader /> : <PDFAnnotator />}</div>;
};

export default PDFAnnotatorApp;