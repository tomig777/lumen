interface ImportMeta {
  readonly env: { readonly PROD: boolean }
}

declare const __LUMEN_RELEASE__: Readonly<{ version: string; build: string }>
