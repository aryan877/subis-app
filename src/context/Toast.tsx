import React from "react";
import { X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "info" | "success" | "error";
  message: string;
  transactionHash?: string;
}

interface ToastProps {
  messages: ToastMessage[];
  removeToast: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ messages, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`alert ${
            message.type === "info"
              ? "alert-info"
              : message.type === "success"
              ? "alert-success"
              : "alert-error"
          } shadow-lg`}
        >
          <div>
            <span>{message.message}</span>
            {message.transactionHash && (
              <button
                className="btn btn-sm btn-ghost ml-2"
                onClick={() =>
                  navigator.clipboard.writeText(message.transactionHash!)
                }
              >
                Copy Hash
              </button>
            )}
          </div>
          <div className="flex-none">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => removeToast(message.id)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
