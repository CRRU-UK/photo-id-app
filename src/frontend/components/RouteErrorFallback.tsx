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
      <Blankslate.Heading style={{ color: "black" }}>
        An error occurred. You can try going back, reloading the page, or closing this window.
      </Blankslate.Heading>
      <Blankslate.Description style={{ color: "black" }}>{error.message}</Blankslate.Description>
      <Blankslate.PrimaryAction title={recovery.label} onClick={recovery.onClick}>
        {recovery.label}
      </Blankslate.PrimaryAction>
    </Blankslate>
  );
};

export default RouteErrorFallback;
