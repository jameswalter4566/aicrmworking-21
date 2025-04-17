
import { toast as sonnerToast } from "sonner";

export type Toast = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

// Fix for TypeScript error TS2349 - making toast callable directly
interface ToastFunction {
  (message: string): void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  custom: (title: string, description?: string, variant?: "default" | "destructive") => string;
  dismiss: (toastId?: string) => void;
}

const toast = ((message: string) => {
  sonnerToast(message);
}) as ToastFunction;

toast.success = (message: string) => {
  sonnerToast.success(message);
};

toast.error = (message: string) => {
  sonnerToast.error(message);
};

toast.info = (message: string) => {
  sonnerToast.info(message);
};

toast.warning = (message: string) => {
  sonnerToast.warning(message);
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
