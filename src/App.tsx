import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import ProcessorAssist from "./pages/ProcessorAssist";
import ProcessorAssistViewer from "./pages/ProcessorAssistViewer";
import LoanApplicationForm from "./pages/LoanApplicationForm";
import Dialer from "./pages/Dialer";
import DialerSession from "./pages/DialerSession";
import DialerQueueMonitor from "./components/power-dialer/DialerQueueMonitor";
import ClientPortal from "./pages/ClientPortal";
import ClientDashboard from "./pages/ClientDashboard";
import ClientHome from "./pages/client-portal/ClientHome";
import ClientConditions from "./pages/client-portal/ClientConditions";
import ClientAttention from "./pages/client-portal/ClientAttention";
import ClientSupport from "./pages/client-portal/ClientSupport";

const router = createBrowserRouter([
  {
    path: "/",
    element: <div>Hello world!</div>,
  },
  {
    path: "/processor",
    element: <ProcessorAssist />,
  },
  {
    path: "/processor-assist/:id",
    element: <ProcessorAssistViewer />,
  },
  {
    path: "/loan-application/new",
    element: <LoanApplicationForm />,
  },
  {
    path: "/dialer",
    element: <Dialer />,
  },
  {
    path: "/dialer-session/:sessionId",
    element: <DialerSession />,
  },
  {
    path: "/dialer-queue/:sessionId",
    element: <DialerQueueMonitor sessionId={null} />,
  },
  
  // Add client portal routes
  {
    path: "/client-portal",
    element: <ClientPortal />,
  },
  {
    path: "/client-dashboard",
    element: <ClientDashboard />,
    children: [
      {
        path: "home",
        element: <ClientHome />,
      },
      {
        path: "conditions",
        element: <ClientConditions />,
      },
      {
        path: "attention",
        element: <ClientAttention />,
      },
      {
        path: "support",
        element: <ClientSupport />,
      },
    ],
  },
  
  // Catch-all route
  {
    path: "*",
    element: <div>404</div>,
  },
]);

function App() {
  return (
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}

export default App;
