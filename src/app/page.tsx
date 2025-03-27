import React from "react";
import {
  FaHighlighter,
  FaComment,
  FaUnderline,
  FaUndo,
  FaRedo,
} from "react-icons/fa";
// import { Card, CardContent } from "@/components/ui/card";

const PDFAnnotator: React.FC = () => {
  return (
    <div className="h-screen bg-[#eff1fa] flex flex-col">
      <div className="flex items-center justify-between h-[4rem] shadow-xl bg-[#8334c2] w-full p-4">
        <div className="flex">PDF Annotator</div>
        <div className="flex items-center justify-end gap-3">
          <span className="flex p-2 border border-white rounded-md cursor-pointer">
            <FaUndo size={18} />
          </span>
          <span className="flex p-2 border border-white rounded-md cursor-pointer">
            <FaRedo size={18} />
          </span>
          <span className="flex p-2 border bg-white rounded-md  text-[#8334c2] text-sm font-semibold cursor-pointer">
            Finish
          </span>
        </div>
      </div>
      <div className="h-full flex">
        {/* Sidebar */}
        <div className="fixed left-0 h-screen w-16 bg-white text-black flex flex-col gap-0 items-center py-8 space-y-6 shadow-lg">
          <span className="flex p-3 hover:rounded-md hover:bg-[#eff1fa] cursor-pointer">
            <FaUnderline size={24} />
          </span>
          <span className="flex p-3  hover:rounded-md hover:bg-[#eff1fa] cursor-pointer">
            <FaHighlighter size={24} />
          </span>
          <span className="flex p-3  hover:rounded-md hover:bg-[#eff1fa] cursor-pointer">
            <FaComment size={24} />
          </span>
        </div>

        {/* Main Content */}
        <div className="ml-16 flex-1 flex-col items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg h-[90%]  w-[80%] lg:w-[70%] mx-auto my-auto mt-[4rem]"></div>
        </div>
      </div>
    </div>
  );
};

export default PDFAnnotator;
