/// <reference types="@cloudflare/workers-types" />

type PagesFunction<Env = unknown, Params = string, Data = unknown> = (
  context: EventContext<Env, Params, Data>
) => Response | Promise<Response>;

interface EventContext<Env, Params, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<unknown>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Params;
  data: Data;
}

interface Env {
  CHATANYWHERE_API_KEY: string;
  VVEAI_API_KEY: string;
  FUND_DATA: KVNamespace;
  UPSTASH_URL?: string;
  UPSTASH_TOKEN?: string;
  NEXT_PUBLIC_STORAGE_TYPE?: string;
  USERNAME?: string;
  PASSWORD?: string;
}
