import { CheckIcon, CopyIcon } from "@primer/octicons-react";
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
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  ANALYSIS_RESULTS_PER_PAGE,
  COPY_FEEDBACK_DURATION_MS,
  RATING_THRESHOLDS,
} from "@/constants";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { useSettings } from "@/contexts/SettingsContext";
import type { MLMatch, MLMatchResponse } from "@/types";

const CopyDetailsButton = ({ details }: { details: string }) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(details);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      return;
    }

    setCopied(true);

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, COPY_FEEDBACK_DURATION_MS);
  }, [details]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <Tooltip text={copied ? "Copied" : details} type="label">
      <IconButton
        aria-label={copied ? "Copied to clipboard" : "Copy details to clipboard"}
        icon={copied ? CheckIcon : CopyIcon}
        onClick={handleCopy}
        size="small"
        variant="invisible"
      />
    </Tooltip>
  );
};

const Loading = ({
  inputLabel,
  modelLabel,
}: {
  inputLabel: string | null;
  modelLabel: string | null;
}) => {
  const subtitleId = useId();

  return (
    <Table.Container>
      <Table.Subtitle as="p" id={subtitleId}>
        <PrimerStack align="start" direction="horizontal" gap="condensed">
          <Spinner size="small" />
          <span>
            Processing for {inputLabel !== null && <Label variant="accent">{inputLabel}</Label>}{" "}
            with model {modelLabel !== null && <Label variant="done">{modelLabel}</Label>}...
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
  inputLabel,
  modelLabel,
}: {
  data: MLMatchResponse;
  inputLabel: string | null;
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
            return <CopyDetailsButton details={row.details} />;
          },
        },
      ]}
      data={rows}
    />
  );

  return (
    <Table.Container>
      <Table.Subtitle as="p" id={subtitleId}>
        Matches for {inputLabel !== null && <Label variant="accent">{inputLabel}</Label>} with model{" "}
        {modelLabel !== null && <Label variant="done">{modelLabel}</Label>}:
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
  const { isAnalysing, result, error, inputLabel, handleClose } = useAnalysis();
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
      {isAnalysing && <Loading inputLabel={inputLabel} modelLabel={modelLabel} />}

      {result !== null && <Results data={result} inputLabel={inputLabel} modelLabel={modelLabel} />}

      {error !== null && (
        <Banner title="Error" variant="critical">
          {error}
        </Banner>
      )}
    </Dialog>
  );
};

export default AnalysisOverlay;
