"use client";

import React, { useState } from "react";
import FileUploader from "./(components)/FileUpload";
import PDFAnnotator from "./(components)/PDFAnotator";

const PDFAnnotatorApp: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setIsLoading(true);
  };

  return (
    <div>
      {!selectedFile ? (
        <FileUploader onFileSelected={handleFileSelected} />
      ) : (
        <PDFAnnotator
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      )}
    </div>
  );
};

export default PDFAnnotatorApp;
