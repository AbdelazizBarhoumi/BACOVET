declare module '@/actions/*' {
    // Actions are generated JS wrappers for server controllers — treat them as `unknown`
    // so imports like `import ProfileController from '@/actions/...';` are usable
    // in TSX files while preserving strict checking elsewhere
    const value: unknown;
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
    
    const value: unknown;
    export default value;
}
