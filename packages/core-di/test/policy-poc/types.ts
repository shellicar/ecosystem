/** Layer 0 — shared vocabulary. Depends on nothing. */

export type Token = abstract new (...args: any[]) => any;
export type Impl = new () => any;
export type LifetimeName = 'singleton' | 'scoped' | 'resolve' | 'transient';
export type Node = { readonly impl: Impl; readonly lifetime?: LifetimeName };
export type OnConstruct = (name: string) => void;
