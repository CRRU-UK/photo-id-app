import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { MLMatchResponse, PhotoBody } from "@/types";

interface AnalysisContextValue {
  error: string | null;
  handleAnalyse: (photos: PhotoBody[], inputLabel: string) => Promise<void>;
  handleClose: () => void;
  inputLabel: string | null;
  isAnalysing: boolean;
  result: MLMatchResponse | null;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

interface AnalysisProviderProps {
  children: ReactNode;
}

export const AnalysisProvider = ({ children }: AnalysisProviderProps) => {
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [result, setResult] = useState<MLMatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputLabel, setinputLabel] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (isAnalysing) {
        window.electronAPI.cancelAnalyseStack();
      }
    };
  }, [isAnalysing]);

  const handleAnalyse = useCallback(
    async (photos: PhotoBody[], label: string) => {
      if (isAnalysing) {
        return;
      }

      setIsAnalysing(true);
      setResult(null);
      setError(null);
      setinputLabel(label);

      try {
        const response = await window.electronAPI.analyseStack(photos);
        setResult(response);
      } catch (error) {
        setError(error instanceof Error ? error.message : "An unexpected error occurred.");
        console.error("Analysis failed:", error);
      } finally {
        setIsAnalysing(false);
      }
    },
    [isAnalysing],
  );

  const handleClose = useCallback(() => {
    if (isAnalysing) {
      window.electronAPI.cancelAnalyseStack();
      setIsAnalysing(false);
    }

    setResult(null);
    setError(null);
    setinputLabel(null);
  }, [isAnalysing]);

  const value = useMemo<AnalysisContextValue>(
    () => ({ isAnalysing, result, error, inputLabel, handleAnalyse, handleClose }),
    [isAnalysing, result, error, inputLabel, handleAnalyse, handleClose],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};

export const useAnalysis = (): AnalysisContextValue => {
  const context = useContext(AnalysisContext);

  if (context === null) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }

  return context;
};
