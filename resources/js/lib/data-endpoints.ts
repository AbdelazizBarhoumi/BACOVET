// Dynamically fetched from /api/novacity-endpoints which reads storage/app/public/data.json

import { useState, useEffect } from "react";

interface EndpointMeta {
  name: string;
  method: string;
  fields: string[];
}

export type EndpointMap = Record<string, EndpointMeta>;

/**
 * Fetch endpoint definitions from the server.
 * The server reads and parses data.json on every request,
 * so changes to the file are reflected immediately.
 */
async function fetchEndpoints(): Promise<EndpointMap> {
  const res = await fetch("/novacity-endpoints", {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return {};
  const json = await res.json();
  return json.endpoints ?? {};
}

/**
 * React hook that loads endpoints from the API.
 * Returns the flat slug→fields map (for backward compat with DATA_ENDPOINTS),
 * the full metadata map, the slug list, and a loading state.
 */
export function useNovacityEndpoints() {
  const [dataEndpoints, setDataEndpoints] = useState<Record<string, string[]>>({});
  const [endpointMeta, setEndpointMeta] = useState<EndpointMap>({});
  const [endpointList, setEndpointList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchEndpoints().then((meta) => {
      if (cancelled) return;

      const flat: Record<string, string[]> = {};
      for (const [slug, info] of Object.entries(meta)) {
        flat[slug] = info.fields;
      }

      setDataEndpoints(flat);
      setEndpointMeta(meta);
      setEndpointList(Object.keys(meta));
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  return { dataEndpoints, endpointMeta, endpointList, loading };
}
