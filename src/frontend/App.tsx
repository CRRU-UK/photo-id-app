import { useState } from 'react';
import { PageLayout, Heading, TextInput, Button } from '@primer/react';

const App = () => {
  const [title, setTitle] = useState<string>('');

  const onClick = () => {
    window.electronAPI.setTitle(title);
  }

  return (
    <PageLayout sx={{ backgroundColor: 'canvas.default', height: '100vh' }}>
      <PageLayout.Header>
        <Heading>Hello world!</Heading>
      </PageLayout.Header>

      <PageLayout.Content>
        <TextInput onInput={({ target }) => setTitle((target as HTMLInputElement).value)} />
        <Button onClick={onClick}>Set title</Button>
      </PageLayout.Content>
    </PageLayout>
  );
};

export default App;
