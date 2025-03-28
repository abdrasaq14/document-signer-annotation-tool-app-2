// // pdfjs.d.ts
// declare module "pdfjs-dist/build/pdf" {
//   export interface GlobalWorkerOptionsType {
//     workerSrc: string;
//   }

//   export const GlobalWorkerOptions: {
//     workerSrc: string;
//   };

//   export interface PDFDocumentLoadingTask {
//     promise: Promise<PDFDocumentProxy>;
//   }

//   export interface PDFDocumentProxy {
//     numPages: number;
//     getPage(pageNumber: number): Promise<PDFPageProxy>;
//   }

//   export interface PDFPageProxy {
//     getTextContent(): Promise<TextContent>;
//     render(params: RenderParameters): RenderTask;
//   }

//   export interface TextContent {
//     items: TextItem[];
//   }

//   export interface TextItem {
//     str: string;
//   }

//   export interface RenderParameters {
//     canvasContext: CanvasRenderingContext2D;
//     viewport: ViewPort;
//   }

//   export interface ViewPort {
//     width: number;
//     height: number;
//     scale: number;
//     rotation: number;
//   }

//   export interface RenderTask {
//     promise: Promise<void>;
//   }

//   export function getDocument(
//     src: string | ArrayBuffer | Uint8Array
//   ): PDFDocumentLoadingTask;
// }
