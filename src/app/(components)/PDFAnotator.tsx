/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from 'react'
import { FaHighlighter, FaUnderline, FaComment, FaSignature, FaUndo, FaRedo, FaSpinner, FaDownload } from 'react-icons/fa';
import { FaPencil } from 'react-icons/fa6';
import LoadingScreen from './Loader';
import { pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import dynamic from 'next/dynamic';
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

// Annotation types 
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
interface PDFAnnotatorProps {
  selectedFile: File;
  setSelectedFile: React.Dispatch<React.SetStateAction<File | null>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}
const PDFAnnotator: React.FC<PDFAnnotatorProps> = ({
  selectedFile,
  setSelectedFile,
  isLoading,
  setIsLoading,
}) => {
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

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [showCommentsSidebar, setShowCommentsSidebar] =
    useState<boolean>(false);

  // Enhanced annotations state
  const [currentAnnotationType, setCurrentAnnotationType] =
    useState<Annotation["type"]>("highlight");

  // Drawing state

  // const [documentReady, setDocumentReady] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Mouse position for sidebar annotations
  const [mousePosition, setMousePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
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
  // Add this to prevent text layer abortion when interacting with the document
  useEffect(() => {
    const abortController = new AbortController();

    return () => {
      abortController.abort();
    };
  }, []);
  // Function to check if there are any comments
  useEffect(() => {
    const hasComments = annotations.some((ann) => ann.type === "comment");
    setShowCommentsSidebar(hasComments);
  }, [annotations]);

  // Handle text selection
useEffect(() => {
  const handleMouseUp = (e: MouseEvent) => {
    // Don't process if clicking on toolbar
    if (
      selectionToolbarRef.current &&
      selectionToolbarRef.current.contains(e.target as Node)
    ) {
      return;
    }

    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== "") {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Find the containing page element more reliably
      let pageElement = null;
      let pageNumber = null;

      // Get the closest ancestor with react-pdf__Page class
      const textNode = selection.anchorNode;
      if (textNode && textNode.parentElement) {
        const closest = (
          node: Element | null,
          selector: string
        ): Element | null => {
          while (node && !node.matches(selector)) {
            node = node.parentElement;
          }
          return node;
        };

        const textContainer = closest(
          textNode.parentElement,
          ".react-pdf__Page__textContent"
        );
        if (textContainer) {
          pageElement = closest(textContainer, ".react-pdf__Page");
          if (pageElement) {
            pageNumber = parseInt(
              pageElement.getAttribute("data-page-number") || "1"
            );
          }
        }
      }

      if (pageElement && pageNumber) {
        const pageRect = pageElement.getBoundingClientRect();

        setSelectedText(selection.toString());
        setSelectionPosition({
          x: rect.left - pageRect.left,
          y: rect.top - pageRect.top,
          width: rect.width,
          height: rect.height,
        });
        setSelectedPage(pageNumber);
        setShowToolbar(true);
      }
    } else if (
      !selectionToolbarRef.current ||
      !selectionToolbarRef.current.contains(e.target as Node)
    ) {
      clearSelection();
    }
  };

  // Delay adding the event listener to prevent conflicts with react-pdf
  const timer = setTimeout(() => {
    document.addEventListener("mouseup", handleMouseUp);
  }, 500);

  return () => {
    clearTimeout(timer);
    document.removeEventListener("mouseup", handleMouseUp);
  };
}, []);
  // SelectionToolbar component to position correctly
// Improve the SelectionToolbar component for more reliable positioning
const SelectionToolbar = () => {
  if (!showToolbar || !selectionPosition || !selectedPage) return null;

  // Get the current page element for positioning
  const pageElement = document.querySelector(
    `.react-pdf__Page[data-page-number="${selectedPage}"]`
  );
  if (!pageElement) return null;

  const pageRect = pageElement.getBoundingClientRect();
  
  // Calculate position in viewport coordinates
  const absoluteX = pageRect.left + selectionPosition.x;
  // Make sure toolbar is above the selection
  const absoluteY = pageRect.top + selectionPosition.y - 10;

  return (
    <div
      ref={selectionToolbarRef}
      className="fixed bg-white rounded-lg shadow-lg flex items-center space-x-2 p-2 z-50"
      style={{
        left: absoluteX,
        top: absoluteY,
        transform: "translateY(-100%)", // Position above the text
      }}
      onMouseDown={(e) => e.stopPropagation()} // Prevent document mouseDown from triggering
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
     
    /* Style for text spans */
    .react-pdf__Page__textContent span {
      cursor: text !important;
      color: transparent !important;
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

  // sidebar annotation
  const applySidebarAnnotation = (type: Annotation["type"]) => {
    if (!mousePosition || !currentPage) return;

    // Get the current page element
    const pageElement = document.querySelector(
      `.react-pdf__Page[data-page-number="${currentPage}"]`
    );
    if (!pageElement) return;

    // Calculate position relative to the page
    const adjustedX = mousePosition.x;
    const adjustedY = mousePosition.y;

    // Create annotation based on type
    switch (type) {
      case "freehand":
        // For freehand, we will just add a dot where they clicked
        const newFreehandAnnotation: Annotation = {
          id: Date.now(),
          type: "freehand",
          page: currentPage,
          color: currentColor,
          points: [{ x: adjustedX, y: adjustedY }],
        };
        setAnnotations([...annotations, newFreehandAnnotation]);
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
                page: currentPage,
                position: {
                  x: adjustedX,
                  y: adjustedY,
                },
              };
              setAnnotations([...annotations, newSignature]);
            };
            reader.readAsDataURL(file);
          };
          signatureInput.click();
        } else if (signatureMethod?.toLowerCase() === "draw") {
          alert("Draw signature on the canvas");
        }
        break;

      case "comment":
        const commentText = prompt("Enter your comment:");
        if (commentText) {
          const newCommentAnnotation: Annotation = {
            id: Date.now(),
            type: "comment",
            page: currentPage,
            comment: commentText,
            position: {
              x: adjustedX,
              y: adjustedY,
            },
          };
          setAnnotations([...annotations, newCommentAnnotation]);
        }
        break;

      // For highlight and underline, we need text selection
      case "highlight":
      case "underline":
        alert(`Please select text first to ${type}`);
        break;
    }
  };
  // Enhanced annotation methods
  const addAnnotation = (type: Annotation["type"]) => {
    if (!selectedText || !selectedPage || !selectionPosition) return;

    switch (type) {
      case "highlight":
      case "underline":
        // Get the exact position relative to the page
        const pageElement = document.querySelector(
          `.react-pdf__Page[data-page-number="${selectedPage}"]`
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const pageRect = pageElement?.getBoundingClientRect() || {
          left: 0,
          top: 0,
        };

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

  // event handler to track mouse position

  const handleMouseMove = (e: React.MouseEvent) => {
    // Get the current page element
    const pageElements = document.querySelectorAll(".react-pdf__Page");

    if (pageElements.length > 0) {
      // Find which page the mouse is over
      for (let i = 0; i < pageElements.length; i++) {
        const pageElement = pageElements[i];
        const rect = pageElement.getBoundingClientRect();

        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          // Mouse is over this page
          setCurrentPage(i + 1);

          // Calculate position relative to the page
          setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });

          break;
        }
      }
    }

    // If we're in drawing mode, continue with the drawing
    if (currentAnnotationType === "freehand") {
      draw(e);
    }
  };

  // PDF Document Load Handler
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setIsLoading(false);
  };

  // Function to handle page changes
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    clearSelection();
  };

  // Export PDF with annotations and a comment sidebar
  const exportPDF = async () => {
    setIsExporting(true);

    try {
      // Get the original PDF file
      if (!selectedFile) {
        throw new Error("No file selected");
      }
      const pdfBytes = await fetch(URL.createObjectURL(selectedFile)).then(
        (res) => res.arrayBuffer()
      );

      // Load the PDF document using pdf-lib
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Group annotations by page
      const annotationsByPage = annotations.reduce((acc, annotation) => {
        // Ensure page is a valid number
        const pageIndex = Number(annotation.page);
        if (isNaN(pageIndex)) {
          console.warn("Invalid page number found in annotation:", annotation);
          return acc;
        }

        // Convert to string to use as object key
        const pageKey = pageIndex.toString();
        if (!acc[pageKey]) acc[pageKey] = [];
        acc[pageKey].push(annotation);
        return acc;
      }, {} as Record<string, Annotation[]>);

      // Create a new PDF document to build our annotated version
      const newPdfDoc = await PDFDocument.create();

      // Process each page in the original document
      for (let i = 0; i < pdfDoc.getPageCount(); i++) {
        const pageIndex = i + 1; // Convert 0-based to 1-based
        const pageKey = pageIndex.toString();
        const pageAnnotations = annotationsByPage[pageKey] || [];
        const originalPage = pdfDoc.getPages()[i];
        const { width, height } = originalPage.getSize();

        // Copy the original page
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);

        // Check if page has comments
        const hasComments = pageAnnotations.some(
          (ann) => ann.type === "comment"
        );

        if (hasComments) {
          // Add the page to our new document
          const newPage = newPdfDoc.addPage([width, height]);

          // Scale factor for the content area to make room for comments
          const scaleFactor = 0.75;

          // Embed and draw the original page content scaled down
          const embeddedPage = await newPdfDoc.embedPage(copiedPage);
          newPage.drawPage(embeddedPage, {
            x: 0,
            y: 0,
            width: width * scaleFactor,
            height: height,
          });

          // Draw the comments sidebar
          newPage.drawRectangle({
            x: width * scaleFactor,
            y: 0,
            width: width * (1 - scaleFactor),
            height: height,
            color: rgb(0.9, 0.9, 0.9), // Light gray background
          });

          // Draw a header for the comments section
          newPage.drawText("Comments", {
            x: width * scaleFactor + 20,
            y: height - 50,
            size: 16,
            font: helveticaBold,
            color: rgb(0.3, 0.3, 0.3),
          });

          // Process and draw the comments
          const comments = pageAnnotations.filter(
            (ann) => ann.type === "comment"
          );
          comments.forEach((comment, index) => {
            const commentY = height - 100 - index * 120;

            // Draw comment box
            newPage.drawRectangle({
              x: width * scaleFactor + 10,
              y: commentY - 60,
              width: width * (1 - scaleFactor) - 20,
              height: 100,
              color: rgb(1, 1, 1),
              borderColor: rgb(0.7, 0.7, 0.7),
              borderWidth: 1,
              opacity: 1,
            });

            // Draw comment text
            newPage.drawText(comment.comment || "", {
              x: width * scaleFactor + 20,
              y: commentY - 20,
              size: 10,
              font: helveticaFont,
              color: rgb(0, 0, 0),
              maxWidth: width * (1 - scaleFactor) - 40,
              lineHeight: 12,
            });

            // Draw reference text (what text was commented on)
            if (comment.text) {
              newPage.drawText(
                `"${comment.text.substring(0, 40)}${
                  comment.text.length > 40 ? "..." : ""
                }"`,
                {
                  x: width * scaleFactor + 20,
                  y: commentY - 40,
                  size: 8,
                  font: helveticaFont,
                  color: rgb(0.4, 0.4, 0.4),
                  maxWidth: width * (1 - scaleFactor) - 40,
                }
              );
            }

            // Draw connector line from comment to text (if rect exists)
            if (comment.rect) {
              const rectX = (comment.rect.x / 794) * width * scaleFactor;
              const rectY = height - (comment.rect.y / 1123) * height;

              newPage.drawLine({
                start: {
                  x: rectX + comment.rect.width * scaleFactor,
                  y: rectY,
                },
                end: { x: width * scaleFactor, y: commentY - 30 },
                thickness: 1,
                color: rgb(0.7, 0.7, 0.7),
                dashArray: [3, 3], // Dashed line
              });
            }
          });
        } else {
          // For pages without comments, add the page to our new document
          const newPage = newPdfDoc.addPage(copiedPage);

          // Process regular annotations
          for (const annotation of pageAnnotations) {
            const { type, rect, color } = annotation;

            // Convert hex color to rgb values
            const hexToRgb = (hex: string) => {
              const r = parseInt(hex.slice(1, 3), 16) / 255;
              const g = parseInt(hex.slice(3, 5), 16) / 255;
              const b = parseInt(hex.slice(5, 7), 16) / 255;
              return { r, g, b };
            };

            const rgbColor = color ? hexToRgb(color) : { r: 1, g: 1, b: 0 };

            switch (type) {
              case "highlight":
                if (rect) {
                  // Scale coordinates to PDF coordinates
                  const scaledX = (rect.x / 794) * width;
                  const scaledY =
                    height -
                    (rect.y / 1123) * height -
                    (rect.height / 1123) * height;
                  const scaledWidth = (rect.width / 794) * width;
                  const scaledHeight = (rect.height / 1123) * height;

                  // Add highlight annotation
                  newPage.drawRectangle({
                    x: scaledX,
                    y: scaledY,
                    width: scaledWidth,
                    height: scaledHeight,
                    color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
                    opacity: 0.5,
                  });
                }
                break;

              case "underline":
                if (rect) {
                  // Scale coordinates to PDF coordinates
                  const scaledX = (rect.x / 794) * width;
                  const scaledY =
                    height -
                    (rect.y / 1123) * height -
                    (rect.height / 1123) * height;
                  const scaledWidth = (rect.width / 794) * width;

                  // Add underline annotation (a thin rectangle)
                  newPage.drawLine({
                    start: { x: scaledX, y: scaledY },
                    end: { x: scaledX + scaledWidth, y: scaledY },
                    thickness: 2,
                    color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
                  });
                }
                break;

              // Other annotation types (signature, freehand) would be handled here
            }
          }
        }
      }

      // Save the modified PDF
      const modifiedPdfBytes = await newPdfDoc.save();

      // Create a blob from the modified PDF bytes
      const blob = new Blob([modifiedPdfBytes], { type: "application/pdf" });

      // Create a download link and trigger the download
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `annotated-${selectedFile?.name || "document.pdf"}`;
      link.click();

      setIsExporting(false);
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      setIsExporting(false);
      alert(`Error exporting PDF: ${error.message}`);
    }
  };

  return (
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
          <button
            className="bg-[#8334c2] text-white px-4 py-2 rounded flex items-center gap-2"
            onClick={exportPDF}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <FaSpinner className="animate-spin" /> Exporting...
              </>
            ) : (
              <>
                <FaDownload /> Export PDF
              </>
            )}
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
            onClick={() => {
              setCurrentAnnotationType("underline");
              if (mousePosition && !selectedText) {
                applySidebarAnnotation("underline");
              }
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
              if (mousePosition && !selectedText) {
                applySidebarAnnotation("highlight");
              }
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
              applySidebarAnnotation("comment");
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
              applySidebarAnnotation("signature");
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
            onClick={() => {
              setCurrentAnnotationType("freehand");
              applySidebarAnnotation("freehand");
            }}
          >
            <FaPencil size={24} className="text-gray-700" />
          </button>
        </div>
        {/* Document Area */}
        <div
          ref={documentRef}
          className={`flex-1 overflow-auto p-8 bg-gray-100 relative ${
            showCommentsSidebar ? "pr-0" : "pr-8"
          }`}
          onMouseDown={startDrawing}
          // onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseMove={handleMouseMove}
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
          <div className="flex">
            {/* PDF Document */}
            <div className={`${showCommentsSidebar ? "w-3/4" : "w-full"}`}>
              <Document
                file={selectedFile}
                onLoadSuccess={onDocumentLoadSuccess}
              >
                <div className="flex flex-col items-center space-y-8">
                  {Array.from({ length: numPages }, (_, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl shadow-xl overflow-hidden w-[794px] min-h-[1123px] border border-gray-200 relative"
                      onClick={() => handlePageChange(index + 1)}
                    >
                      <Page
                        key={`page_${index + 1}`}
                        pageNumber={index + 1}
                        width={794}
                        renderAnnotationLayer={false}
                        renderTextLayer={true}
                        customTextRenderer={({ str }: { str: string }) => str}
                        loading={
                          <div className="h-[1123px] w-full flex items-center justify-center">
                            Loading page {index + 1}...
                          </div>
                        }
                        onRenderSuccess={() => {
                          if (index === 0) {
                            setTimeout(() => {
                              setIsLoading(false);
                            }, 500);
                          }
                        }}
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
                              // For comments, we'll draw a comment indicator and a connector line to the sidebar
                              return (
                                <div
                                  key={ann.id}
                                  className="absolute z-20 flex items-center"
                                  style={{
                                    left: ann.rect?.x,
                                    top: ann.rect?.y,
                                    width: ann.rect?.width,
                                    height: ann.rect?.height,
                                  }}
                                >
                                  <div className="bg-yellow-400 text-xs rounded-full w-5 h-5 flex items-center justify-center text-white font-bold shadow-lg">
                                    <FaComment size={10} />
                                  </div>
                                  {/* We'll draw the connector line with SVG */}
                                  {showCommentsSidebar && (
                                    <div className="absolute top-1/2 left-full w-full pointer-events-none">
                                      <svg height="2" width="100%">
                                        <line
                                          x1="0"
                                          y1="0"
                                          x2="100%"
                                          y2="0"
                                          style={{
                                            stroke: "#aaa",
                                            strokeWidth: 1,
                                            strokeDasharray: "5,5",
                                          }}
                                        />
                                      </svg>
                                    </div>
                                  )}
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

            {/* Comments Sidebar */}
            {showCommentsSidebar && (
              <div className="w-1/4 bg-gray-200 h-full p-4 overflow-y-auto border-l border-gray-300">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">
                  Comments
                </h3>

                {/* Group comments by page */}
                {Array.from({ length: numPages }, (_, pageIndex) => {
                  const pageComments = annotations.filter(
                    (ann) =>
                      ann.type === "comment" && ann.page === pageIndex + 1
                  );

                  if (pageComments.length === 0) return null;

                  return (
                    <div key={pageIndex} className="mb-6">
                      <h4 className="text-sm text-gray-500 mb-2">
                        Page {pageIndex + 1}
                      </h4>

                      {pageComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="bg-white p-3 rounded-lg shadow-sm mb-3"
                        >
                          {comment.text && (
                            <div className="text-xs text-gray-500 italic mb-1 border-b pb-1">
                              &quot;{comment.text.substring(0, 40)}
                              {comment.text.length > 40 ? "..." : ""}&quot;
                            </div>
                          )}
                          <div className="text-sm">{comment.comment}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Full-screen loading overlay */}
      {isLoading && <LoadingScreen />}
    </div>
  );
};


export default PDFAnnotator;