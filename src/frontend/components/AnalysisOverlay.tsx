import { InfoIcon } from "@primer/octicons-react";
import {
  Banner,
  Dialog,
  IconButton,
  Label,
  Stack as PrimerStack,
  ProgressBar,
  Spinner,
  Text,
  Tooltip,
} from "@primer/react";
import { DataTable, Table } from "@primer/react/experimental";
import { useEffect, useId, useState } from "react";

import { ANALYSIS_RESULTS_PER_PAGE, RATING_THRESHOLDS } from "@/constants";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useSettings } from "@/contexts/SettingsContext";
import type { MLMatch, MLMatchResponse } from "@/types";

const Loading = ({ stackLabel }: { stackLabel: string | null }) => {
  const subtitleId = useId();

  return (
    <Table.Container>
      <Table.Subtitle as="p" id={subtitleId}>
        <PrimerStack align="start" direction="horizontal" gap="condensed">
          <Spinner size="small" />
          <span>
            Processing stack <Label variant="accent">{stackLabel}</Label>...
          </span>
        </PrimerStack>
      </Table.Subtitle>
      <Table.Skeleton
        aria-labelledby={subtitleId}
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
        rows={10}
      />
    </Table.Container>
  );
};

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset local UI state when data prop changes
  useEffect(() => {
    // Reset pagination when analysis result changes (reset state when prop changes).
    setPageIndex(0);
  }, [data]);

  const pageSize = ANALYSIS_RESULTS_PER_PAGE;
  const start = pageIndex * pageSize;
  const end = start + pageSize;

  const rows = data.matches.slice(start, end);

  const subtitleId = useId();

  const tableContent = (
    <DataTable<MLMatch>
      cellPadding="spacious"
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

            if (rating < RATING_THRESHOLDS.GOOD) {
              progressBarColor = "attention.emphasis";
            }

            if (rating < RATING_THRESHOLDS.AVERAGE) {
              progressBarColor = "danger.emphasis";
            }

            return (
              <>
                <ProgressBar
                  bg={progressBarColor}
                  inline
                  progress={rating}
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
                  aria-label="View details"
                  icon={InfoIcon}
                  size="small"
                  variant="invisible"
                />
              </Tooltip>
            );
          },
        },
      ]}
      data={rows}
    />
  );

  return (
    <Table.Container>
      <Table.Subtitle as="p" id={subtitleId}>
        Matches for stack {stackLabel !== null && <Label variant="accent">{stackLabel}</Label>} with
        model {modelLabel !== null && <Label variant="done">{modelLabel}</Label>}:
      </Table.Subtitle>

      {tableContent}

      <Table.Pagination
        aria-label="Pagination for matches"
        onChange={({ pageIndex: newPageIndex }) => setPageIndex(newPageIndex)}
        pageSize={pageSize}
        totalCount={data.matches.length}
      />
    </Table.Container>
  );
};

const AnalysisOverlay = () => {
  const { isAnalysing, result, error, stackLabel, handleClose } = useAnalysis();
  const { settings } = useSettings();

  const selectedModel =
    settings?.mlModels.find(({ id }) => id === settings.selectedModelId) ?? null;
  const modelLabel = selectedModel?.name ?? null;

  const open = isAnalysing || result !== null || error !== null;

  if (!open) {
    return null;
  }

  return (
    <Dialog
      footerButtons={
        isAnalysing
          ? [{ buttonType: "danger", content: "Cancel", onClick: handleClose }]
          : [{ buttonType: "default", content: "Close", onClick: handleClose }]
      }
      onClose={handleClose}
      title="Machine Learning Analysis"
    >
      {isAnalysing && <Loading stackLabel={stackLabel} />}

      {result !== null && <Results data={result} modelLabel={modelLabel} stackLabel={stackLabel} />}

      {error !== null && (
        <Banner title="Error" variant="critical">
          {error}
        </Banner>
      )}
    </Dialog>
  );
};

export default AnalysisOverlay;
