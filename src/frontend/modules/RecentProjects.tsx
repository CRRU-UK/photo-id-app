import { HistoryIcon, TrashIcon } from "@primer/octicons-react";
import {
  Text,
  Stack as PrimerStack,
  Timeline,
  Link,
  RelativeTime,
  Spinner,
  IconButton,
} from "@primer/react";
import { useState, useEffect } from "react";

import type { RecentProject } from "@/types";

const RecentProjects = () => {
  const [recentProjects, setRecentProjects] = useState<RecentProject[] | null>(null);

  useEffect(() => {
    window.electronAPI.getRecentProjects();

    async function getRecentProjects() {
      const data = await window.electronAPI.getRecentProjects();
      setRecentProjects(data);
    }

    getRecentProjects();
  }, []);

  const handleRemoveRecentProject = async (path: string): Promise<void> => {
    console.log("handleRemoveRecentProject", "path", path);
    const data = await window.electronAPI.removeRecentProject(path);
    console.log("handleRemoveRecentProject", "data", data);
    setRecentProjects(data);
  };

  if (recentProjects === null) {
    return (
      <div style={{ paddingTop: "var(--stack-gap-spacious)", textAlign: "center" }}>
        <Spinner size="small" />
      </div>
    );
  }

  if (recentProjects.length > 0) {
    return (
      <>
        <Text>Or open a recent project:</Text>
        <RecentProjectsList projects={recentProjects} onRemove={handleRemoveRecentProject} />
      </>
    );
  }

  return <></>;
};

interface RecentProjectsListProps {
  projects: RecentProject[];
  onRemove: (path: string) => Promise<void>;
}

const RecentProjectsList = ({ projects, onRemove }: RecentProjectsListProps) => {
  const handleOpenProjectFile = (path: string) => window.electronAPI.openRecentProject(path);

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
                icon={TrashIcon}
                size="small"
                variant="invisible"
                aria-label="Remove recent project"
                onClick={() => onRemove(item.path)}
              />
            </PrimerStack>
          </Timeline.Body>
        </Timeline.Item>
      ))}
    </Timeline>
  );
};

export default RecentProjects;
