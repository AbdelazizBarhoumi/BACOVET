declare module '@/actions/*' {
    // Actions are generated JS wrappers for server controllers — treat them as `unknown`
    // so imports like `import ProfileController from '@/actions/...';` are usable
    // in TSX files while preserving strict checking elsewhere.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value: any;
    export default value;
}

declare module '@/routes' {
    // Re-export the runtime `routes/index.ts` typings when present so imports
    // like `import { dashboard } from '@/routes'` type-check correctly.
    export * from '@/routes/index';
}

declare module '@/routes/*' {
    // Route modules are generated; provide a permissive fallback for
    // edge-cases where the compiler cannot infer the exact signature.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value: any;
    export default value;
}
