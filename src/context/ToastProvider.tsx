"use client";

import React, { createContext, useState, ReactNode, useContext } from "react";
import { Toast, ToastMessage } from "./Toast";
import { v4 as uuidv4 } from "uuid";

interface ToastContextProps {
  showToast: (message: Omit<ToastMessage, "id">) => void;
}

export const ToastContext = createContext<ToastContextProps>({
  showToast: () => {},
});

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast = (message: Omit<ToastMessage, "id">) => {
    const toastMessage: ToastMessage = {
      ...message,
      id: uuidv4(),
    };
    setMessages((prevMessages) => [...prevMessages, toastMessage]);
    setTimeout(() => {
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== toastMessage.id)
      );
    }, 4000);
  };

  const removeToast = (id: string) => {
    setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Toast messages={messages} removeToast={removeToast} />
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const { showToast } = useContext(ToastContext);
  return { showToast };
};
