"use client";
import dynamic from "next/dynamic";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef} from "react";
import {
  FaHighlighter,
  FaComment,
  FaUnderline,
  FaUndo,
  FaRedo,
  FaCloudUploadAlt,
} from "react-icons/fa";
import { pdfjs } from "react-pdf";

// Use the `.mjs` file if `.min.js` is unavailable
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";

// Dynamically import PDF components with SSR disabled
const Document = dynamic(
  () => import("react-pdf").then((mod) => mod.Document),
  {
    ssr: false,
    loading: () => <p>Loading PDF...</p>,
  }
);

const Page = dynamic(
  () => import("react-pdf").then((mod) => mod.Page),
  {
    ssr: false,
    loading: () => <p>Loading page...</p>,
  }
);


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
    const newAnnotation = {
      id: Date.now(),
      type,
      page: currentPage,
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
    <div className="h-screen bg-[#eff1fa] flex items-center justify-center flex-col px-10">
      <div className="fixed top-0 left-0 z-10 flex items-center justify-between h-[4rem] shadow-xl bg-[#8334c2] w-full p-4">
        <div className="flex items-center gap-4">PDF Annotator</div>
      </div>
      <div
        className={`w-full h-[500px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg bg-blue-50 ${
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
    <div className="h-screen bg-[#eff1fa] flex flex-col">
      <div className="fixed top-0 left-0 z-10 flex items-center justify-between h-[4rem] shadow-xl bg-[#8334c2] w-full p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedFile(null)}
            className="text-white bg-red-500 px-4 py-2 rounded"
          >
            Back to Upload
          </button>
          PDF Annotator
        </div>
        <div className="flex items-center justify-end gap-3">
          <span
            className="flex p-2 border border-white rounded-md cursor-pointer"
            onClick={() => {
              const newAnnotations = [...annotations];
              newAnnotations.pop();
              setAnnotations(newAnnotations);
            }}
          >
            <FaUndo size={18} />
          </span>
          <span className="flex p-2 border border-white rounded-md cursor-pointer">
            <FaRedo size={18} />
          </span>
          <span className="flex p-2 border bg-white rounded-md text-[#8334c2] text-sm font-semibold cursor-pointer">
            Finish
          </span>
        </div>
      </div>

      <div className="h-full flex max-h-screen overflow-y-scroll bg-gray-100 mt-[4rem]">
        {/* Annotation Sidebar */}
        <div className="fixed left-0 top-0 h-screen w-16 bg-white text-black flex flex-col gap-0 items-center pt-[5em] space-y-6 shadow-lg">
          <span
            className="flex p-3 hover:rounded-md hover:bg-[#eff1fa] cursor-pointer"
            onClick={() => addAnnotation("underline")}
          >
            <FaUnderline size={24} />
          </span>
          <span
            className="flex p-3 hover:rounded-md hover:bg-[#eff1fa] cursor-pointer"
            onClick={() => addAnnotation("highlight")}
          >
            <FaHighlighter size={24} />
          </span>
          <span
            className="flex p-3 hover:rounded-md hover:bg-[#eff1fa] cursor-pointer"
            onClick={() => addAnnotation("comment")}
          >
            <FaComment size={24} />
          </span>
        </div>

        {/* PDF Content */}
        <div className="ml-16 flex-1 flex-col items-center justify-center">
          <Document
            file={selectedFile}
            onLoadSuccess={onDocumentLoadSuccess}
            className="mx-auto"
          >
            <Page
              pageNumber={currentPage}
              width={800}
              renderAnnotationLayer={true}
              renderTextLayer={true}
            />
          </Document>

          {/* Annotation List for Current Page */}
          <div className="mt-4 mx-auto w-[800px]">
            <h3 className="text-lg font-bold mb-2">
              Annotations on Page {currentPage}
            </h3>
            {annotations
              .filter((annotation) => annotation.page === currentPage)
              .map((annotation) => (
                <div
                  key={annotation.id}
                  className="bg-white p-2 rounded mb-2 flex justify-between items-center"
                >
                  <span>
                    {annotation.type.charAt(0).toUpperCase() +
                      annotation.type.slice(1)}
                    Annotation
                  </span>
                  <button
                    onClick={() => {
                      setAnnotations(
                        annotations.filter((a) => a.id !== annotation.id)
                      );
                    }}
                    className="text-red-500"
                  >
                    Delete
                  </button>
                </div>
              ))}
          </div>

          {/* Page Navigation */}
          <div className="flex justify-center mt-4 space-x-4">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {numPages}
            </span>
            <button
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render based on file selection
  return <div>{!selectedFile ? <FileUploader /> : <PDFAnnotator />}</div>;
};

export default PDFAnnotatorApp;
