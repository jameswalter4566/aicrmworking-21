
import { toast as sonnerToast } from "sonner";

export type Toast = {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

// Define a more comprehensive toast function interface
interface ToastFunction {
  (message: string): void;
  (options: { title: string; description?: string; variant?: "default" | "destructive"; duration?: number }): void;
  success: (message: string | { title: string; description?: string; duration?: number }) => void;
  error: (message: string | { title: string; description?: string; duration?: number }) => void;
  info: (message: string | { title: string; description?: string; duration?: number }) => void;
  warning: (message: string | { title: string; description?: string; duration?: number }) => void;
  custom: (title: string, description?: string, variant?: "default" | "destructive") => string;
  dismiss: (toastId?: string) => void;
}

const toast = ((messageOrOptions: string | { title: string; description?: string; variant?: "default" | "destructive"; duration?: number }) => {
  if (typeof messageOrOptions === 'string') {
    sonnerToast(messageOrOptions);
  } else {
    const { title, description, variant, duration } = messageOrOptions;
    sonnerToast(title, {
      description,
      duration,
      // Use default variant if not specified
      ...(variant && { className: `toast-${variant}` }),
    });
  }
}) as ToastFunction;

toast.success = (messageOrOptions: string | { title: string; description?: string; duration?: number }) => {
  if (typeof messageOrOptions === 'string') {
    sonnerToast.success(messageOrOptions);
  } else {
    const { title, description, duration } = messageOrOptions;
    sonnerToast.success(title, {
      description,
      duration,
    });
  }
};

toast.error = (messageOrOptions: string | { title: string; description?: string; duration?: number }) => {
  if (typeof messageOrOptions === 'string') {
    sonnerToast.error(messageOrOptions);
  } else {
    const { title, description, duration } = messageOrOptions;
    sonnerToast.error(title, {
      description,
      duration,
    });
  }
};

toast.info = (messageOrOptions: string | { title: string; description?: string; duration?: number }) => {
  if (typeof messageOrOptions === 'string') {
    sonnerToast.info(messageOrOptions);
  } else {
    const { title, description, duration } = messageOrOptions;
    sonnerToast.info(title, {
      description,
      duration,
    });
  }
};

toast.warning = (messageOrOptions: string | { title: string; description?: string; duration?: number }) => {
  if (typeof messageOrOptions === 'string') {
    sonnerToast.warning(messageOrOptions);
  } else {
    const { title, description, duration } = messageOrOptions;
    sonnerToast.warning(title, {
      description,
      duration,
    });
  }
};

toast.custom = (title: string, description?: string, variant: "default" | "destructive" = "default"): string => {
  return sonnerToast(title, {
    description,
  }) as string;
};

toast.dismiss = (toastId?: string) => {
  sonnerToast.dismiss(toastId);
};

// Hook to use with the Toaster component
export function useToast() {
  return {
    toast,
    // This is a simple implementation that works with the Toaster component
    toasts: [] as Toast[],
  };
}

export { toast };
export default toast;
