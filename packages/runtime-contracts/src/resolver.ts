// Modeled on the one existing example, context-runtime's ContextResolver.
export interface Resolver<TInput, TOutput> {
  resolve(input: TInput): TOutput
}
