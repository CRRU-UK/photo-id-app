import { createFileRoute } from "@tanstack/react-router";

const Edit = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const file = urlParams.get("file");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
        height: "100vh",
        padding: "var(--stack-gap-spacious)",
      }}
    >
      <img
        src={file!}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
        alt=""
      />
    </div>
  );
};

export const Route = createFileRoute("/edit")({
  component: Edit,
});
