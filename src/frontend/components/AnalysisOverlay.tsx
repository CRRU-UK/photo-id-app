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

import { ML_MATCHES_PER_PAGE } from "@/constants";
import { useAnalysis } from "@/contexts/AnalysisContext";
import type { MLMatch, MLMatchResponse } from "@/types";

type MLMatchRow = MLMatch & { id: number };

const Loading = ({ stackLabel }: { stackLabel: string | null }) => (
  <Table.Container>
    <Table.Subtitle as="p" id="subtitle">
      <PrimerStack direction="horizontal" align="center" justify="space-between">
        <div>
          Processing stack <Label variant="accent">{stackLabel}</Label>...
        </div>
        <Spinner size="small" />
      </PrimerStack>
    </Table.Subtitle>
    <Table.Skeleton
      aria-labelledby="repositories-loading"
      rows={10}
      columns={[
        {
          header: "Rank",
          id: "rank",
          width: "auto",
        },
        {
          header: "ID",
          id: "animal_id",
          width: "80px",
        },
        {
          header: "Similarity / Confidence",
          id: "confidence",
          width: "grow",
        },
        {
          header: "",
          id: "source_path",
          width: "50px",
        },
      ]}
    />
  </Table.Container>
);

const Results = ({ data, stackLabel }: { data: MLMatchResponse; stackLabel: string | null }) => {
  const [pageIndex, setPageIndex] = useState(0);

  const pageSize = ML_MATCHES_PER_PAGE;
  const start = pageIndex * pageSize;
  const end = start + pageSize;

  const rows: MLMatchRow[] = data.matches.slice(start, end).map((match) => ({
    ...match,
    id: match.rank,
  }));

  const tableContent = (
    <DataTable<MLMatchRow>
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
          field: "animal_id",
          width: "auto",
          rowHeader: true,
        },
        {
          header: "Similarity / Confidence",
          field: "confidence",
          width: "grow",
          renderCell: (row: MLMatchRow) => {
            const confidence = Math.round(row.confidence * 100);

            let progressBarColor = "success.emphasis";

            if (confidence < 82) {
              progressBarColor = "attention.emphasis";
            }

            if (confidence < 70) {
              progressBarColor = "danger.emphasis";
            }

            return (
              <>
                <ProgressBar
                  progress={confidence}
                  inline
                  bg={progressBarColor}
                  style={{ width: "100%", marginRight: "var(--stack-gap-condensed)" }}
                />
                <Text>{confidence}%</Text>
              </>
            );
          },
        },
        {
          header: "",
          field: "source_path",
          width: "auto",
          renderCell: (row: MLMatchRow) => {
            return (
              <Tooltip text={row.source_path} type="label">
                <IconButton
                  icon={InfoIcon}
                  size="small"
                  variant="invisible"
                  aria-label="View source path"
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
        Matches for stack {stackLabel !== null && <Label variant="accent">{stackLabel}</Label>} from{" "}
        {data.query_image_count} image(s) with model <Label variant="done">{data.model}</Label>:
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

      {result !== null && <Results data={result} stackLabel={stackLabel} />}

      {error !== null && <Flash variant="danger">{error}</Flash>}
    </Dialog>
  );
};

export default AnalysisOverlay;
