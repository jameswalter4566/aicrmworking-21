
import { toast as sonnerToast } from "sonner";

export type Toast = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

// Define a more comprehensive toast function interface
interface ToastFunction {
  (message: string): void;
  (options: { title: string; description?: string; variant?: "default" | "destructive" }): void;
  success: (message: string | { title: string; description?: string }) => void;
  error: (message: string | { title: string; description?: string; variant?: string }) => void;
  info: (message: string | { title: string; description?: string }) => void;
  warning: (message: string | { title: string; description?: string; variant?: string }) => void;
  custom: (title: string, description?: string, variant?: "default" | "destructive") => string;
  dismiss: (toastId?: string) => void;
}

const toast = ((messageOrOptions: string | { title: string; description?: string; variant?: "default" | "destructive" }) => {
  if (typeof messageOrOptions === 'string') {
    sonnerToast(messageOrOptions);
  } else {
    sonnerToast(messageOrOptions.title, {
      description: messageOrOptions.description,
      // Use default variant if not specified
      ...(messageOrOptions.variant && { className: `toast-${messageOrOptions.variant}` }),
    });
  }
}) as ToastFunction;

toast.success = (messageOrOptions: string | { title: string; description?: string }) => {
  if (typeof messageOrOptions === 'string') {
    sonnerToast.success(messageOrOptions);
  } else {
    sonnerToast.success(messageOrOptions.title, {
      description: messageOrOptions.description,
    });
  }
};

toast.error = (messageOrOptions: string | { title: string; description?: string; variant?: string }) => {
  if (typeof messageOrOptions === 'string') {
    sonnerToast.error(messageOrOptions);
  } else {
    sonnerToast.error(messageOrOptions.title, {
      description: messageOrOptions.description,
    });
  }
};

toast.info = (messageOrOptions: string | { title: string; description?: string }) => {
  if (typeof messageOrOptions === 'string') {
    sonnerToast.info(messageOrOptions);
  } else {
    sonnerToast.info(messageOrOptions.title, {
      description: messageOrOptions.description,
    });
  }
};

toast.warning = (messageOrOptions: string | { title: string; description?: string; variant?: string }) => {
  if (typeof messageOrOptions === 'string') {
    sonnerToast.error(messageOrOptions);
  } else {
    sonnerToast.error(messageOrOptions.title, {
      description: messageOrOptions.description,
    });
  }
};

toast.custom = (title: string, description?: string, variant: "default" | "destructive" = "default"): string => {
  return sonnerToast(title, {
    description,
  });
};

toast.dismiss = (toastId?: string) => {
  sonnerToast.dismiss(toastId);
};

export { toast };
export default toast;
