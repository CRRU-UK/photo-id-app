import { Box, Text, Button } from '@primer/react';
import { FileDirectoryOpenFillIcon } from '@primer/octicons-react';

interface PlaceholderProps {
  callback: () => void,
}

const Placeholder = ({
  callback,
}: PlaceholderProps) => (
  <Box>
    <Text>Open a folder with photos (JPEG, TIFF, PNG) to get started.</Text>
    <Button
      onClick={() => callback()}
      variant="primary"
      size="large"
      block
      leadingVisual={FileDirectoryOpenFillIcon}
      sx={{ mt: 4 }}
    >
      Open Folder
    </Button>
  </Box>
);

export default Placeholder;
