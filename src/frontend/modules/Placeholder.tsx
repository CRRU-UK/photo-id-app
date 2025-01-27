import { Box, Text, Button } from "@primer/react";
import { FileDirectoryIcon, FileIcon } from "@primer/octicons-react";

interface PlaceholderProps {
  openProjectFolderCallback: () => void;
  openProjectFileCallback: () => void;
}

const Placeholder = ({ openProjectFolderCallback, openProjectFileCallback }: PlaceholderProps) => (
  <Box>
    <Text>Open a folder with photos (JPEG, TIFF, PNG) to get started.</Text>
    <Button
      onClick={() => openProjectFolderCallback()}
      variant="primary"
      size="large"
      block
      leadingVisual={FileDirectoryIcon}
      sx={{ mt: 4 }}
    >
      Open Project Folder
    </Button>

    <Button
      onClick={() => openProjectFileCallback()}
      variant="primary"
      size="large"
      block
      leadingVisual={FileIcon}
      sx={{ mt: 4 }}
    >
      Open Project File
    </Button>
  </Box>
);

export default Placeholder;
