import { useEffect, useState } from "react";

function useQueryParam(key: string) {
  const getParam = () => new URLSearchParams(window.location.search).get(key);
  const [param, setParam] = useState(getParam());

  useEffect(() => {
    const handler = () => setParam(getParam());
    window.addEventListener("popstate", handler);
    window.addEventListener("hashchange", handler);
    return () => {
      window.removeEventListener("popstate", handler);
      window.removeEventListener("hashchange", handler);
    };
  }, []);

  return param;
}

export default function SomeComponent() {
  const data = useQueryParam("data");

  useEffect(() => {
    // Effect runs when 'data' changes
    // ...your logic...
  }, [data]);

  return <div>{/* ...your component JSX... */}</div>;
}
