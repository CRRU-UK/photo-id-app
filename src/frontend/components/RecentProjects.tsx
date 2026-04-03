import { HistoryIcon, TrashIcon } from "@primer/octicons-react";
import {
  IconButton,
  Link,
  Stack as PrimerStack,
  RelativeTime,
  Spinner,
  Text,
  Timeline,
} from "@primer/react";
import { useEffect, useState } from "react";

import type { RecentProject } from "@/types";

const RecentProjects = () => {
  const [recentProjects, setRecentProjects] = useState<RecentProject[] | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function getRecentProjects() {
      const data = await window.electronAPI.getRecentProjects();

      if (!isCancelled) {
        setRecentProjects(data);
      }
    }

    void getRecentProjects();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleRemoveRecentProject = async (path: string): Promise<void> => {
    const data = await window.electronAPI.removeRecentProject(path);
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
        <RecentProjectsList onRemove={handleRemoveRecentProject} projects={recentProjects} />
      </>
    );
  }

  return null;
};

interface RecentProjectsListProps {
  onRemove: (path: string) => Promise<void>;
  projects: RecentProject[];
}

const RecentProjectsList = ({ projects, onRemove }: RecentProjectsListProps) => {
  const handleOpenProjectFile = (path: string) => window.electronAPI.openRecentProject(path);

  return (
    <Timeline clipSidebar style={{ marginTop: "var(--stack-gap-spacious)" }}>
      {projects.map((item) => (
        <Timeline.Item key={item.path}>
          <Timeline.Badge>
            <HistoryIcon />
          </Timeline.Badge>
          <Timeline.Body>
            <PrimerStack align="center" direction="horizontal" justify="space-between">
              <div>
                <Link
                  href="#"
                  onClick={() => handleOpenProjectFile(item.path)}
                  style={{
                    fontWeight: "bold",
                  }}
                >
                  {item.name}
                </Link>
                <RelativeTime
                  datetime={item.lastOpened}
                  style={{ marginLeft: "var(--stack-gap-condensed)" }}
                />
                <Text
                  size="small"
                  style={{ display: "block", fontFamily: "var(--fontStack-monospace)" }}
                  weight="semibold"
                >
                  {item.path}
                </Text>
              </div>

              <IconButton
                aria-label="Remove from recent projects"
                icon={TrashIcon}
                onClick={() => onRemove(item.path)}
                size="small"
                variant="invisible"
              />
            </PrimerStack>
          </Timeline.Body>
        </Timeline.Item>
      ))}
    </Timeline>
  );
};

export default RecentProjects;
