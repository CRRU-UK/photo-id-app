import { InfoIcon } from "@primer/octicons-react";
import {
  Dialog,
  Flash,
  IconButton,
  Label,
  Stack as PrimerStack,
  ProgressBar,
  Spinner,
  Text,
  Tooltip,
} from "@primer/react";
import { DataTable, Table } from "@primer/react/experimental";
import { useState } from "react";

import { ANALYSIS_RESULTS_PER_PAGE } from "@/constants";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useSettings } from "@/contexts/SettingsContext";
import type { MLMatch, MLMatchResponse } from "@/types";

const Loading = ({ stackLabel }: { stackLabel: string | null }) => (
  <Table.Container>
    <Table.Subtitle as="p" id="subtitle">
      <PrimerStack direction="horizontal" align="start" gap="condensed">
        <Spinner size="small" />
        <span>
          Processing stack <Label variant="accent">{stackLabel}</Label>...
        </span>
      </PrimerStack>
    </Table.Subtitle>
    <Table.Skeleton
      aria-labelledby="analysis-loading"
      rows={10}
      columns={[
        {
          header: "Rank",
          id: "rank",
          width: "auto",
        },
        {
          header: "ID",
          id: "id",
          width: "80px",
        },
        {
          header: "Rating",
          id: "rating",
          width: "grow",
        },
        {
          header: "",
          id: "details",
          width: "50px",
        },
      ]}
    />
  </Table.Container>
);

const Results = ({
  data,
  stackLabel,
  modelLabel,
}: {
  data: MLMatchResponse;
  stackLabel: string | null;
  modelLabel: string | null;
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [prevData, setPrevData] = useState(data);

  if (data !== prevData) {
    setPrevData(data);
    setPageIndex(0);
  }

  const pageSize = ANALYSIS_RESULTS_PER_PAGE;
  const start = pageIndex * pageSize;
  const end = start + pageSize;

  const rows = data.matches.slice(start, end);

  const tableContent = (
    <DataTable<MLMatch>
      data={rows}
      cellPadding="spacious"
      initialSortColumn="rank"
      columns={[
        {
          header: "Rank",
          field: "rank",
          width: "auto",
          rowHeader: true,
        },
        {
          header: "ID",
          field: "id",
          width: "auto",
          rowHeader: true,
        },
        {
          header: "Rating",
          field: "rating",
          width: "grow",
          renderCell: (row: MLMatch) => {
            const rating = Math.round(row.rating * 100);

            let progressBarColor = "success.emphasis";

            if (rating < 82) {
              progressBarColor = "attention.emphasis";
            }

            if (rating < 70) {
              progressBarColor = "danger.emphasis";
            }

            return (
              <>
                <ProgressBar
                  progress={rating}
                  inline
                  bg={progressBarColor}
                  style={{ width: "100%", marginRight: "var(--stack-gap-condensed)" }}
                />
                <Text>{rating}%</Text>
              </>
            );
          },
        },
        {
          header: "",
          field: "details",
          width: "auto",
          renderCell: (row: MLMatch) => {
            return (
              <Tooltip text={row.details} type="label">
                <IconButton
                  icon={InfoIcon}
                  size="small"
                  variant="invisible"
                  aria-label="View details"
                />
              </Tooltip>
            );
          },
        },
      ]}
    />
  );

  return (
    <Table.Container>
      <Table.Subtitle as="p" id="subtitle">
        Matches for stack {stackLabel !== null && <Label variant="accent">{stackLabel}</Label>} with
        model {modelLabel !== null && <Label variant="done">{modelLabel}</Label>}:
      </Table.Subtitle>

      {tableContent}

      <Table.Pagination
        aria-label="Pagination for matches"
        pageSize={pageSize}
        totalCount={data.matches.length}
        onChange={({ pageIndex: newPageIndex }) => setPageIndex(newPageIndex)}
      />
    </Table.Container>
  );
};

const AnalysisOverlay = () => {
  const { isAnalysing, result, error, stackLabel, handleClose } = useAnalysis();
  const { settings } = useSettings();

  const selectedModel = settings?.mlModels.find((m) => m.id === settings.selectedModelId) ?? null;
  const modelLabel = selectedModel?.name ?? null;

  const open = isAnalysing || result !== null || error !== null;

  if (!open) {
    return null;
  }

  return (
    <Dialog
      title="Machine Learning Analysis"
      onClose={handleClose}
      footerButtons={
        isAnalysing
          ? [{ buttonType: "danger", content: "Cancel", onClick: handleClose }]
          : [{ buttonType: "default", content: "Close", onClick: handleClose }]
      }
    >
      {isAnalysing && <Loading stackLabel={stackLabel} />}

      {result !== null && <Results data={result} stackLabel={stackLabel} modelLabel={modelLabel} />}

      {error !== null && <Flash variant="danger">{error}</Flash>}
    </Dialog>
  );
};

export default AnalysisOverlay;
