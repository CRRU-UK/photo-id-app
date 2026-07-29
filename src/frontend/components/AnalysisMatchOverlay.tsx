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
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  ANALYSIS_RESULTS_PER_PAGE,
  COPY_FEEDBACK_DURATION_MS,
  RATING_THRESHOLDS,
} from "@/constants";
import { useAnalysis } from "@/contexts/AnalysisContext";
import { getProviderLabelVariants } from "@/helpers";
import type { AnalysisMatchResult, AnalysisMatchResults } from "@/types";

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

const Loading = ({ inputLabel }: { inputLabel: string | null }) => {
  const subtitleId = useId();

  return (
    <Table.Container>
      <Table.Subtitle as="p" id={subtitleId}>
        <PrimerStack align="start" direction="horizontal" gap="condensed">
          <Spinner size="small" />
          <span>
            Processing matches for{" "}
            {inputLabel !== null && <Label variant="accent">{inputLabel}</Label>}...
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
            header: "Provider",
            id: "provider",
            width: "auto",
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
}: {
  data: AnalysisMatchResults;
  inputLabel: string | null;
}) => {
  const [pageIndex, setPageIndex] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset local UI state when data prop changes
  useEffect(() => {
    // Reset pagination when analysis result changes (reset state when prop changes)
    setPageIndex(0);
  }, [data]);

  const pageSize = ANALYSIS_RESULTS_PER_PAGE;
  const start = pageIndex * pageSize;
  const end = start + pageSize;

  const rows = data.matches.slice(start, end);

  // Derived from all matches, not just the current page, so a provider keeps its colour when paging
  const providerVariants = useMemo(() => getProviderLabelVariants(data.matches), [data.matches]);

  const subtitleId = useId();

  const tableContent = (
    <DataTable<AnalysisMatchResult>
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
          renderCell: (row: AnalysisMatchResult) => {
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
          header: "Provider",
          field: "provider",
          width: "auto",
          renderCell: (row: AnalysisMatchResult) => {
            return <Label variant={providerVariants.get(row.provider)}>{row.provider}</Label>;
          },
        },
        {
          header: "",
          field: "details",
          width: "auto",
          renderCell: (row: AnalysisMatchResult) => {
            return <CopyDetailsButton details={row.details} />;
          },
        },
      ]}
      data={rows}
      // The same match ID can be returned by more than one provider, so rows are keyed by both
      getRowId={(row) => `${row.provider}:${row.id}`}
    />
  );

  return (
    <Table.Container>
      <Table.Subtitle as="p" id={subtitleId}>
        Match results for {inputLabel !== null && <Label variant="accent">{inputLabel}</Label>}
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

const AnalysisMatchOverlay = () => {
  const { isAnalysing, result, error, inputLabel, handleClose } = useAnalysis();

  const open = isAnalysing || result !== null || error !== null;

  if (!open) {
    return null;
  }

  const failures = result?.failures ?? [];

  /**
   * Compared against the number of providers asked, not against the match count: a provider that
   * succeeds but returns no matches is a valid empty result, not a failed analysis.
   */
  const allProvidersFailed = failures.length > 0 && failures.length === result?.providerCount;

  return (
    <Dialog
      footerButtons={
        isAnalysing
          ? [{ buttonType: "danger", content: "Cancel", onClick: handleClose }]
          : [{ buttonType: "default", content: "Close", onClick: handleClose }]
      }
      onClose={handleClose}
      title="Match Analysis"
      width="900px"
    >
      {isAnalysing && <Loading inputLabel={inputLabel} />}

      {failures.length > 0 && (
        <Banner
          style={{ marginBottom: "var(--stack-gap-spacious)" }}
          title={allProvidersFailed ? "Analysis failed" : "Some providers failed"}
          variant={allProvidersFailed ? "critical" : "warning"}
        >
          <Banner.Description>
            <PrimerStack direction="vertical" gap="none">
              {failures.map((failure) => (
                <span key={failure.provider}>
                  <strong>{failure.provider}</strong>: {failure.message}
                </span>
              ))}
            </PrimerStack>
          </Banner.Description>
        </Banner>
      )}

      {result !== null && !allProvidersFailed && <Results data={result} inputLabel={inputLabel} />}

      {error !== null && (
        <Banner title="Error" variant="critical">
          {error}
        </Banner>
      )}
    </Dialog>
  );
};

export default AnalysisMatchOverlay;
