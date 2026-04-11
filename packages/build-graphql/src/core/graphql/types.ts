export type GraphqlFile = {
  path: string;
  name: string;
};
export type TransformResult =
  | {
      code: string;
      map: null;
    }
  | null
  | undefined;
