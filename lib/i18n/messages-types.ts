/** Widen literal string types so every locale can supply its own copy. */
export type DeepStringify<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<DeepStringify<U>>
        : T extends object
          ? { [K in keyof T]: DeepStringify<T[K]> }
          : T
