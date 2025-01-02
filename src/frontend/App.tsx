import type { PHOTO_DATA } from '../helpers/types';

import { useState, useEffect } from 'react';
import { SplitPageLayout, Stack, Box, Text, BranchName } from '@primer/react';
import { FileDirectoryOpenFillIcon } from '@primer/octicons-react';

import { SIDEBAR_WIDTHS } from '../helpers/constants';

import MainSelection from './modules/MainSelection';
import Placeholder from './modules/Placeholder';

import mockedData from '../../data/mock.json';

const App = () => {
  const [data, setData] = useState<PHOTO_DATA | null>(mockedData);

  const handleOpenFolder = () => window.electronAPI.openFolder();

  useEffect(() => {
    console.log('register');

    window.electronAPI.onLoadData((value) => {
      console.log('received data:', value);
      setData(value);
    });
  }, []);

  return (
    <SplitPageLayout sx={{ backgroundColor: "canvas.default", height: "100vh" }}>
      <SplitPageLayout.Pane
        position="start"
        width={{
          min: `${SIDEBAR_WIDTHS.MIN}px`,
          max: `${SIDEBAR_WIDTHS.MAX}px`,
          default: `${SIDEBAR_WIDTHS.DEFAULT}px`,
        }}
        sx={{ height: "100vh" }}
        resizable
      >
        <Stack
          direction="vertical"
          align="start"
          justify="space-between"
          style={{ height: "100%" }}
        >
          <MainSelection data={data} />

          {data?.directory &&
            <Box sx={{ marginTop: "100%" }}>
              <Text
                size="small"
                weight="light"
                block
                sx={{ display: "block", color: "fg.muted" }}
              >
                <FileDirectoryOpenFillIcon size="small" />
                Currently viewing:
              </Text>
              <BranchName>{data.directory}</BranchName>
            </Box>
          }
        </Stack>
      </SplitPageLayout.Pane>

      <SplitPageLayout.Content sx={{ height: "100vh" }}>
        <Placeholder callback={handleOpenFolder} />
      </SplitPageLayout.Content>
    </SplitPageLayout>
  );
};

export default App;
