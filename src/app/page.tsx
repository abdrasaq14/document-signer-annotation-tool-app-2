/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import dynamic from "next/dynamic";
import React, { useState, useRef } from "react";
import {
  FaHighlighter,
  FaComment,
  FaUnderline,
  FaRedo,
  FaSignature,
  FaCloudUploadAlt,
  FaUndo,
} from "react-icons/fa";
import { FaPencil } from "react-icons/fa6";
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

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

// Annotation types with enhanced properties
interface Annotation {
  id: number;
  type: 'highlight' | 'underline' | 'comment' | 'signature' | 'freehand';
  page: number;
  text?: string;
  color?: string;
  position?: { x: number, y: number };
  points?: { x: number, y: number }[];
  comment?: string;
}

const PDFAnnotatorApp: React.FC = () => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionPosition, setSelectionPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== "") {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect(); // Get position of selected text

      setSelectedText(selection.toString());
      setSelectionPosition({
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY - 30,
      });
      setSelectedPage(currentPage);
    } else {
      setSelectedText("");
      setSelectionPosition(null);
    }
  };
  // State management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dragging, setDragging] = useState<boolean>(false);

  // Enhanced annotations state
  const [currentAnnotationType, setCurrentAnnotationType] =
    useState<Annotation["type"]>("highlight");
  const [currentColor, setCurrentColor] = useState<string>("#ffff00"); // Default yellow highlight

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Color palette for annotations
  const colorPalette = [
    "#ffff00", // Yellow
    "#ff6b6b", // Red
    "#4ecdc4", // Teal
    "#a8dadc", // Light Blue
    "#9c6644", // Brown
  ];

  // Enhanced annotation methods
  const addAnnotation = (type: Annotation["type"]) => {
 if (!selectedText || !selectedPage) return;


    switch (type) {
      case "highlight":
      case "underline":
        
        const newTextAnnotation: Annotation = {
          id: Date.now(),
          type,
          page: currentPage,
          text: selectedText,
          color: currentColor,
        };
        setAnnotations([...annotations, newTextAnnotation]);
        break;

      case "comment":
        const commentText = prompt("Enter your comment:");
        if (commentText) {
          const newCommentAnnotation: Annotation = {
            id: Date.now(),
            type: "comment",
            page: currentPage,
            text: selectedText || "",
            comment: commentText,
          };
          setAnnotations([...annotations, newCommentAnnotation]);
        }
        break;

      case "signature":
        // Prompt for signature upload or drawing
        const signatureMethod = prompt(
          "Choose signature method (upload/draw):"
        );
        if (signatureMethod?.toLowerCase() === "upload") {
          // Implement signature file upload logic
          const signatureInput = document.createElement("input");
          signatureInput.type = "file";
          signatureInput.accept = "image/*";
          signatureInput.onchange = (e: any) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
              const newSignature: Annotation = {
                id: Date.now(),
                type: "signature",
                page: currentPage,
                position: { x: 100, y: 100 }, // Default position
              };
              setAnnotations([...annotations, newSignature]);
            };
            reader.readAsDataURL(file);
          };
          signatureInput.click();
        } else if (signatureMethod?.toLowerCase() === "draw") {
          // Implement signature drawing mode
          alert("Draw signature on the canvas");
        }
        break;
    }
  };

  // Drawing methods for freehand annotations
  const startDrawing = (e: React.MouseEvent) => {
    if (currentAnnotationType !== "freehand") return;

    setIsDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (ctx) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const rect = canvas?.getBoundingClientRect();
      ctx.moveTo(e.clientX - (rect?.left || 0), e.clientY - (rect?.top || 0));
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || currentAnnotationType !== "freehand") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (ctx) {
      const rect = canvas?.getBoundingClientRect();
      ctx.lineTo(e.clientX - (rect?.left || 0), e.clientY - (rect?.top || 0));
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (currentAnnotationType !== "freehand") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (ctx && isDrawing) {
      ctx.closePath();

      // Save the drawing as an annotation
      const newDrawing: Annotation = {
        id: Date.now(),
        type: "freehand",
        page: currentPage,
        color: currentColor,
      };
      setAnnotations([...annotations, newDrawing]);

      setIsDrawing(false);
    }
  };



  // Annotation methods

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

  const PDFAnnotator = () => (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Top Toolbar */}
      <div className="h-16 bg-white shadow-lg flex items-center justify-between px-4">
        {/* Top Toolbar */}
        <div className="h-16 bg-white shadow-lg flex items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedFile(null)}
              className="text-white px-4 py-2 bg-red-600 rounded cursor-pointer"
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
            <button className="bg-[#8334c2] text-white px-4 py-2 rounded">
              Finish
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {colorPalette.map((color) => (
            <button
              key={color}
              onClick={() => setCurrentColor(color)}
              className="w-6 h-6 rounded-full"
              style={{
                backgroundColor: color,
                border: currentColor === color ? "2px solid black" : "none",
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Annotation Sidebar */}
        <div className="w-16 bg-white border-r shadow-md flex flex-col items-center pt-4 space-y-4">
          <button
            className={`p-3 ${
              currentAnnotationType === "underline"
                ? "bg-purple-100"
                : "hover:bg-[#f1e0ff]"
            } rounded cursor-pointer`}
            onClick={() => {
              setCurrentAnnotationType("underline");
              addAnnotation("underline");
            }}
          >
            <FaUnderline size={24} className="text-gray-700" />
          </button>
          <button
            className={`p-3 ${
              currentAnnotationType === "highlight"
                ? "bg-purple-100"
                : "hover:bg-[#f1e0ff]"
            } rounded cursor-pointer`}
            onClick={() => {
              setCurrentAnnotationType("highlight");
              addAnnotation("highlight");
            }}
          >
            <FaHighlighter size={24} className="text-gray-700" />
          </button>
          <button
            className={`p-3 ${
              currentAnnotationType === "comment"
                ? "bg-purple-100"
                : "hover:bg-[#f1e0ff]"
            } rounded cursor-pointer`}
            onClick={() => {
              setCurrentAnnotationType("comment");
              addAnnotation("comment");
            }}
          >
            <FaComment size={24} className="text-gray-700" />
          </button>
          <button
            className={`p-3 ${
              currentAnnotationType === "signature"
                ? "bg-purple-100"
                : "hover:bg-[#f1e0ff]"
            } rounded cursor-pointer`}
            onClick={() => {
              setCurrentAnnotationType("signature");
              addAnnotation("signature");
            }}
          >
            <FaSignature size={24} className="text-gray-700" />
          </button>
          <button
            className={`p-3 ${
              currentAnnotationType === "freehand"
                ? "bg-purple-100"
                : "hover:bg-[#f1e0ff]"
            } rounded cursor-pointer`}
            onClick={() => setCurrentAnnotationType("freehand")}
          >
            <FaPencil size={24} className="text-gray-700" />
          </button>
        </div>

        {/* Document Area */}
        <div
          className="flex-1 overflow-auto p-8 bg-gray-100"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        >
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none z-10"
            style={{
              width: "100%",
              height: "100%",
            }}
          />
          <Document file={selectedFile} onLoadSuccess={onDocumentLoadSuccess}>
            <div className="flex flex-col items-center space-y-8">
              {Array.from({ length: numPages }, (_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-xl overflow-hidden w-[794px] min-h-[1123px] border border-gray-200 relative"
                >
                  <Page
                    pageNumber={index + 1}
                    width={794}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                  {/* Render existing annotations */}
                  {annotations
                    .filter((annotation) => annotation.page === index + 1)
                    .map((annotation) => {
                      switch (annotation.type) {
                        case "highlight":
                          return (
                            <div
                              key={annotation.id}
                              style={{
                                backgroundColor: annotation.color,
                                opacity: 0.5,
                                position: "absolute",
                                // You'd need more complex logic to accurately position highlights
                              }}
                            >
                              {annotation.text}
                            </div>
                          );
                        case "comment":
                          return (
                            <div
                              key={annotation.id}
                              className="absolute bg-yellow-100 p-2 rounded shadow"
                              style={
                                {
                                  // Positioning would need precise implementation
                                }
                              }
                            >
                              {annotation.comment}
                            </div>
                          );
                        // Add rendering for other annotation types
                        default:
                          return null;
                      }
                    })}
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