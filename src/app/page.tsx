/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import dynamic from "next/dynamic";
import React, { useState, useRef, useEffect } from "react";
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
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
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
  type: "highlight" | "underline" | "comment" | "signature" | "freehand";
  page: number;
  text?: string;
  color?: string;
  position?: { x: number; y: number };
  points?: { x: number; y: number }[];
  comment?: string;
  rect?: { x: number; y: number; width: number; height: number };
}

const PDFAnnotatorApp: React.FC = () => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectionPosition, setSelectionPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [showToolbar, setShowToolbar] = useState<boolean>(false);

  // State management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dragging, setDragging] = useState<boolean>(false);

  // Enhanced annotations state
  const [currentAnnotationType, setCurrentAnnotationType] =
    useState<Annotation["type"]>("highlight");

  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const [currentColor, setCurrentColor] = useState<string>("#a8dadc"); 
  // Color palette for annotations
  const colorPalette = [
    "#ffff00", // Yellow
    "#ff6b6b", // Red
    "#4ecdc4", // Teal
    "#a8dadc", // Light Blue
    "#9c6644", // Brown
  ];

  // tom styles for the text layer to prevent the faded/blur text appearance
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      /* Make text layer content selectable but invisible */
      .react-pdf__Page__textContent {
        cursor: text !important;
        opacity: 0 !important;
        pointer-events: auto !important;
        user-select: text !important;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
      }
      
      /* Style for selectable text spans */
      .react-pdf__Page__textContent span:hover {
        background-color: rgba(200, 200, 200, 0.2);
      }
      
      /* Ensure text layer stays within PDF boundaries */
      .react-pdf__Page__textContent > span {
        line-height: normal !important;
        position: absolute !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle text selection
  useEffect(() => {
   const handleMouseUp = () => {
     const selection = window.getSelection();
     if (selection && selection.toString().trim() !== "") {
       const range = selection.getRangeAt(0);
       const rect = range.getBoundingClientRect();

       if (
         documentRef.current?.contains(
           selection.anchorNode?.parentElement as any
         )
       ) {
         const pageContainer = (
           selection.anchorNode?.parentElement as HTMLElement
         ).closest(".react-pdf__Page");

         if (pageContainer) {
           const pageRect = pageContainer.getBoundingClientRect();

           setSelectedText(selection.toString());
           setSelectionPosition({
             x: rect.left - pageRect.left + pageContainer.scrollLeft,
             y: rect.top - pageRect.top + pageContainer.scrollTop,
             width: rect.width,
             height: rect.height,
           });
           setSelectedPage(currentPage);
           setShowToolbar(true);
         }
       }
     } else {
       // Don't clear if  clicking on the toolbar itself
       if (
         selectionToolbarRef.current &&
         !selectionToolbarRef.current.contains(document.activeElement)
       ) {
         clearSelection();
       }
     }
   };
    const handleMouseDown = (e: MouseEvent) => {
      // If clicking outside of the selection toolbar, hide it
      if (
        showToolbar &&
        selectionToolbarRef.current &&
        !selectionToolbarRef.current.contains(e.target as Node)
      ) {
        clearSelection();
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [currentPage, showToolbar]);

  const clearSelection = () => {
    setSelectedText("");
    setSelectionPosition(null);
    setShowToolbar(false);
  };

  // Reference for the selection toolbar
  const selectionToolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
    /* Default cursor remains arrow */
    .react-pdf__Page {
      cursor: default !important;
    }
    
    /* Make text layer content selectable */
    .react-pdf__Page__textContent {
      opacity: 0 !important;
      pointer-events: auto !important;
      user-select: text !important;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2;
    }
    
    /* Style for selectable text spans - use text cursor (I-beam) */
    .react-pdf__Page__textContent span {
      cursor: text !important;
    }
    
    /* Ensure text layer stays within PDF boundaries */
    .react-pdf__Page__textContent > span {
      line-height: normal !important;
      position: absolute !important;
    }
  `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // effect to change cursor based on annotation type
  useEffect(() => {
    if (currentAnnotationType === "highlight") {
      document.body.classList.add("highlight-mode");
    } else {
      document.body.classList.remove("highlight-mode");
    }

    return () => {
      document.body.classList.remove("highlight-mode");
    };
  }, [currentAnnotationType]);
  // Enhanced annotation methods
  const addAnnotation = (type: Annotation["type"]) => {
    if (!selectedText || !selectedPage || !selectionPosition) return;

    switch (type) {
      case "highlight":
      case "underline":
      // Get the exact position relative to the page
      const pageElement = document.querySelector(`.react-pdf__Page[data-page-number="${selectedPage}"]`);
      const pageRect = pageElement?.getBoundingClientRect() || { left: 0, top: 0 };
      
      const newTextAnnotation: Annotation = {
        id: Date.now(),
        type,
        page: selectedPage,
        text: selectedText,
        color: currentColor,
        rect: {
          x: selectionPosition.x, 
          y: selectionPosition.y,
          width: selectionPosition.width,
          height: selectionPosition.height,
        },
      };
      setAnnotations([...annotations, newTextAnnotation]);
      break;

      case "comment":
        const commentText = prompt("Enter your comment:");
        if (commentText) {
          const newCommentAnnotation: Annotation = {
            id: Date.now(),
            type: "comment",
            page: selectedPage,
            text: selectedText,
            comment: commentText,
            rect: {
              x: selectionPosition.x,
              y: selectionPosition.y,
              width: selectionPosition.width,
              height: selectionPosition.height,
            },
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
          // file upload logic
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
                page: selectedPage,
                position: {
                  x: selectionPosition.x,
                  y: selectionPosition.y,
                },
              };
              setAnnotations([...annotations, newSignature]);
            };
            reader.readAsDataURL(file);
          };
          signatureInput.click();
        } else if (signatureMethod?.toLowerCase() === "draw") {
          // signature drawing mode
          alert("Draw signature on the canvas");
        }
        break;
    }

    // Clear selection after applying annotation
    clearSelection();
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

  // Function to handle page changes
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    clearSelection();
  };

  // Selection Toolbar Component
  const SelectionToolbar = () => {
    if (!showToolbar || !selectionPosition) return null;

    return (
      <div
        ref={selectionToolbarRef}
        className="absolute bg-white rounded-lg shadow-lg flex items-center space-x-2 p-2 z-50"
        style={{
          left: selectionPosition.x,
          top: selectionPosition.y - 35, // Position it just slightly above the text
          transform: "translateY(-100%)", // This ensures it sits right above the text
        }}
      >
        <button
          className="p-1 hover:bg-gray-100 rounded-full"
          onClick={() => addAnnotation("highlight")}
          title="Highlight"
        >
          <FaHighlighter size={16} className="text-gray-700" />
        </button>
        <button
          className="p-1 hover:bg-gray-100 rounded-full"
          onClick={() => addAnnotation("underline")}
          title="Underline"
        >
          <FaUnderline size={16} className="text-gray-700" />
        </button>
        <button
          className="p-1 hover:bg-gray-100 rounded-full"
          onClick={() => addAnnotation("comment")}
          title="Comment"
        >
          <FaComment size={16} className="text-gray-700" />
        </button>
        <button
          className="p-1 hover:bg-gray-100 rounded-full"
          onClick={() => addAnnotation("signature")}
          title="Signature"
        >
          <FaSignature size={16} className="text-gray-700" />
        </button>
        <div className="flex border-l pl-2 ml-1">
          {colorPalette.map((color) => (
            <button
              key={color}
              onClick={() => setCurrentColor(color)}
              className="w-4 h-4 rounded-full mx-1"
              style={{
                backgroundColor: color,
                border: currentColor === color ? "2px solid black" : "none",
              }}
            />
          ))}
        </div>
      </div>
    );
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
            <FaUndo size={18} className="text-gray-700" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded">
            <FaRedo size={18} className="text-gray-700" />
          </button>
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
          <button className="bg-[#8334c2] text-white px-4 py-2 rounded">
            Finish
          </button>
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
            onClick={() => setCurrentAnnotationType("underline")}
          >
            <FaUnderline size={24} className="text-gray-700" />
          </button>
          <button
            className={`p-3 ${
              currentAnnotationType === "highlight"
                ? "bg-purple-100"
                : "hover:bg-[#f1e0ff]"
            } rounded cursor-pointer`}
            onClick={() => setCurrentAnnotationType("highlight")}
          >
            <FaHighlighter size={24} className="text-gray-700" />
          </button>
          <button
            className={`p-3 ${
              currentAnnotationType === "comment"
                ? "bg-purple-100"
                : "hover:bg-[#f1e0ff]"
            } rounded cursor-pointer`}
            onClick={() => setCurrentAnnotationType("comment")}
          >
            <FaComment size={24} className="text-gray-700" />
          </button>
          <button
            className={`p-3 ${
              currentAnnotationType === "signature"
                ? "bg-purple-100"
                : "hover:bg-[#f1e0ff]"
            } rounded cursor-pointer`}
            onClick={() => setCurrentAnnotationType("signature")}
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
          ref={documentRef}
          className="flex-1 overflow-auto p-8 bg-gray-100 relative"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        >
          {/* Selection Toolbar */}
          <SelectionToolbar />

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
                  onClick={() => handlePageChange(index + 1)}
                >
                  <Page
                    pageNumber={index + 1}
                    width={794}
                    renderAnnotationLayer={false}
                    renderTextLayer={true}
                    customTextRenderer={({ str }: { str: string }) => str}
                  />
                  {/* Render existing annotations */}
                  {annotations
                    .filter((ann) => ann.page === index + 1)
                    .map((ann) => {
                      switch (ann.type) {
                        case "highlight":
                          return (
                            <div
                              key={ann.id}
                              className="absolute pointer-events-none z-10"
                              style={{
                                backgroundColor: ann.color,
                                opacity: 0.5,
                                position: "absolute",
                                left: ann.rect?.x,
                                top: ann.rect?.y,
                                width: ann.rect?.width,
                                height: ann.rect?.height,
                              }}
                            />
                          );
                        case "underline":
                          return (
                            <div
                              key={ann.id}
                              className="absolute pointer-events-none z-10"
                              style={{
                                position: "absolute",
                                left: ann.rect?.x,
                                top: ann.rect
                                  ? ann.rect.y + ann.rect.height - 2
                                  : 0,
                                width: ann.rect?.width,
                                height: "2px",
                                backgroundColor: ann.color,
                              }}
                            />
                          );
                        case "comment":
                          return (
                            <div
                              key={ann.id}
                              className="absolute bg-yellow-100 p-2 rounded shadow z-20"
                              style={{
                                left: ann.rect?.x,
                                top: ann.rect ? ann.rect.y - 30 : 0,
                              }}
                            >
                              {ann.comment}
                            </div>
                          );
                        case "signature":
                          return (
                            <div
                              key={ann.id}
                              className="absolute z-20"
                              style={{
                                left: ann.position?.x,
                                top: ann.position?.y,
                              }}
                            >
                              [Signature Placeholder]
                            </div>
                          );
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

  
  return <div>{!selectedFile ? <FileUploader /> : <PDFAnnotator />}</div>;
};

export default PDFAnnotatorApp;
