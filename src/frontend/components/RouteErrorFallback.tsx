import { BugIcon } from "@primer/octicons-react";
import { Blankslate } from "@primer/react/experimental";

export type RouteErrorRecovery = {
  label: string;
  onClick: () => void;
};

type RouteErrorFallbackProps = {
  error: Error;
  recovery: RouteErrorRecovery;
};

const RouteErrorFallback = ({ error, recovery }: RouteErrorFallbackProps) => {
  return (
    <Blankslate narrow>
      <Blankslate.Visual>
        <BugIcon size="medium" />
      </Blankslate.Visual>
      <Blankslate.Heading>An error occurred</Blankslate.Heading>
      <Blankslate.Description>{error.message}</Blankslate.Description>
      <Blankslate.PrimaryAction onClick={recovery.onClick} title={recovery.label}>
        {recovery.label}
      </Blankslate.PrimaryAction>
    </Blankslate>
  );
};

export default RouteErrorFallback;
