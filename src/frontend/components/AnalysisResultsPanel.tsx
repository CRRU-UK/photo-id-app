import { XIcon } from "@primer/octicons-react";
import { Heading, IconButton } from "@primer/react";

import { useAnalysis } from "@/contexts/AnalysisContext";
import AnalysisMatchResults from "@/frontend/components/AnalysisMatchResults";

const AnalysisResultsPanel = () => {
  const { isAnalysing, isOpen, handleClose } = useAnalysis();

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="edit-results-panel">
      <div className="edit-results-panel-header">
        <Heading as="h2">Match Analysis</Heading>
        <IconButton
          aria-label={isAnalysing ? "Cancel analysis" : "Close results"}
          icon={XIcon}
          onClick={handleClose}
          variant="invisible"
        />
      </div>
      <div className="edit-results-panel-body">
        <AnalysisMatchResults />
      </div>
    </aside>
  );
};

export default AnalysisResultsPanel;
