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
import type { MLMatch, MLMatchResponse } from "@/types";

interface AnalysisOverlayProps {
  open: boolean;
  isAnalysing: boolean;
  result: MLMatchResponse | null;
  error: string | null;
  onClose: () => void;
}

type MLMatchRow = MLMatch & { id: number };

const Results = ({ data }: { data: MLMatchResponse }) => {
  const pageSize = ML_MATCHES_PER_PAGE;
  const [pageIndex, setPageIndex] = useState(0);
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
          header: "Confidence",
          field: "confidence",
          width: "grow",
          renderCell: (row: MLMatchRow) => {
            const confidence = Math.round(row.confidence * 100);
            return (
              <>
                <ProgressBar
                  progress={confidence}
                  inline
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
        Matches for stack <Label variant="default">(TBA)</Label> from{" "}
        <Label variant="default">{data.query_image_count}</Label> image(s) with model{" "}
        <Label variant="default">{data.model}</Label>:
      </Table.Subtitle>

      {tableContent}

      <Table.Pagination
        aria-label="Pagination for matches"
        pageSize={pageSize}
        totalCount={data.matches.length}
        onChange={({ pageIndex }) => setPageIndex(pageIndex)}
      />
    </Table.Container>
  );
};

const AnalysisOverlay = ({ open, isAnalysing, result, error, onClose }: AnalysisOverlayProps) => {
  if (!open) {
    return null;
  }

  return (
    <Dialog
      title={isAnalysing ? "Analysing..." : "Analysis Results"}
      onClose={onClose}
      footerButtons={
        isAnalysing
          ? [{ buttonType: "danger", content: "Cancel", onClick: onClose }]
          : [{ buttonType: "default", content: "Close", onClick: onClose }]
      }
    >
      {isAnalysing && (
        <PrimerStack direction="vertical" align="center" gap="normal">
          <Spinner size="large" />
        </PrimerStack>
      )}

      {result !== null && <Results data={result} />}

      {error !== null && <Flash variant="danger">{error}</Flash>}
    </Dialog>
  );
};

export default AnalysisOverlay;
