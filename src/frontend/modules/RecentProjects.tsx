import type { RecentProject } from "@/types";

import {
  Text,
  Stack as PrimerStack,
  Timeline,
  Link,
  RelativeTime,
  Spinner,
  IconButton,
} from "@primer/react";
import { HistoryIcon, XIcon } from "@primer/octicons-react";

interface RecentProjectsProps {
  projects: RecentProject[] | null;
}

const RecentProjects = ({ projects }: RecentProjectsProps) => {
  if (projects === null) {
    return (
      <div style={{ paddingTop: "var(--stack-gap-spacious)", textAlign: "center" }}>
        <Spinner size="small" />
      </div>
    );
  }

  if (projects.length > 0) {
    return (
      <>
        <Text>Or open a recent project:</Text>
        <RecentProjectsList projects={projects} />
      </>
    );
  }

  return <></>;
};

interface RecentProjectsListProps {
  projects: RecentProject[];
}

const RecentProjectsList = ({ projects }: RecentProjectsListProps) => {
  const handleOpenProjectFile = (path: string) => window.electronAPI.openRecentProject(path);
  const handleRemoveRecentProject = (path: string) => window.electronAPI.removeRecentProject(path);

  return (
    <Timeline style={{ marginTop: "var(--stack-gap-spacious)" }}>
      {projects.map((item) => (
        <Timeline.Item key={item.path}>
          <Timeline.Badge>
            <HistoryIcon />
          </Timeline.Badge>
          <Timeline.Body>
            <PrimerStack direction="horizontal" justify="space-between" align="center">
              <div>
                <Link
                  href="#"
                  onClick={() => handleOpenProjectFile(item.path)}
                  sx={{
                    fontWeight: "bold",
                  }}
                >
                  {item.name}
                </Link>
                <RelativeTime datetime={item.lastOpened} sx={{ ml: 2 }} />
                <Text
                  weight="semibold"
                  size="small"
                  style={{ display: "block", fontFamily: "var(--fontStack-monospace)" }}
                >
                  {item.path}
                </Text>
              </div>

              <IconButton
                icon={XIcon}
                size="small"
                variant="danger"
                aria-label="Remove recent project"
                onClick={() => handleRemoveRecentProject(item.path)}
              />
            </PrimerStack>
          </Timeline.Body>
        </Timeline.Item>
      ))}
    </Timeline>
  );
};

export default RecentProjects;
