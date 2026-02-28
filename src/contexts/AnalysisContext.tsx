import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { MLMatchResponse, PhotoBody } from "@/types";

interface AnalysisContextValue {
  isAnalysing: boolean;
  result: MLMatchResponse | null;
  error: string | null;
  stackLabel: string | null;
  handleAnalyse: (photos: PhotoBody[], stackLabel: string) => void;
  handleClose: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

interface AnalysisProviderProps {
  children: ReactNode;
}

export const AnalysisProvider = ({ children }: AnalysisProviderProps) => {
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [result, setResult] = useState<MLMatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stackLabel, setStackLabel] = useState<string | null>(null);

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
      setStackLabel(label);

      try {
        const response = await window.electronAPI.analyseStack(photos);
        setResult(response);
      } catch (analysisError) {
        setError(
          analysisError instanceof Error ? analysisError.message : "An unexpected error occurred.",
        );
        console.error("Analysis failed:", analysisError);
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
  }, [isAnalysing]);

  const value = useMemo<AnalysisContextValue>(
    () => ({ isAnalysing, result, error, stackLabel, handleAnalyse, handleClose }),
    [isAnalysing, result, error, stackLabel, handleAnalyse, handleClose],
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
