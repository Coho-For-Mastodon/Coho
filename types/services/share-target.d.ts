export declare function shareTarget(name: string): Promise<{
  success: boolean;
  decodedName: string;
  errorMessage?: string;
}>;
