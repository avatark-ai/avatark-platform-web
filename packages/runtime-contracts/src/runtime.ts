// Not a shared method-signature contract -- the five existing runtimes'
// method names are too different to unify without renaming public APIs,
// which this sprint explicitly forbids. Instead, this names the one thing
// all five do share structurally: construction from options into an
// instance, whether built as a class or a factory function -- both existing
// styles already satisfy this without any change (see
// docs/RUNTIME_CONTRACTS.md §17).
export interface RuntimeFactory<TOptions, TInstance> {
  create(options: TOptions): TInstance
}
