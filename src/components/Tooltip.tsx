"use client";
import React, { useState } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "right" | "bottom" | "left";
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = "top",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const showTooltip = () => {
    setIsVisible(true);
  };

  const hideTooltip = () => {
    setIsVisible(false);
  };

  const getTooltipPositionClass = () => {
    switch (position) {
      case "top":
        return "bottom-full mb-2";
      case "right":
        return "left-full ml-2";
      case "bottom":
        return "top-full mt-2";
      case "left":
        return "right-full mr-2";
      default:
        return "bottom-full mb-2";
    }
  };

  return (
    <div className="relative inline-block">
      <div
        className="inline-block"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={`absolute z-10 p-2 bg-gray-800 text-white text-sm rounded ${getTooltipPositionClass()} max-w-xs`}
        >
          {content}
        </div>
      )}
    </div>
  );
};
