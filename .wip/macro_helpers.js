// JavaScript helpers for macro execution in funee
// These functions handle serialization between Rust and JS for Closures and MacroResults

/**
 * Deserialize a Closure from Rust JSON format to JS object
 * 
 * Input shape: { expression: string, references: { [localName]: [uri, name] } }
 * Output shape: { expression: string, references: Map<string, {uri, name}> }
 */
globalThis.__funee_deserialize_closure = function(data) {
  return {
    expression: data.expression,
    references: new Map(
      Object.entries(data.references || {}).map(([localName, [uri, name]]) => [
        localName,
        { uri, name }
      ])
    )
  };
};

/**
 * Serialize a Closure from JS object to Rust JSON format
 */
globalThis.__funee_serialize_closure = function(closure) {
  return {
    expression: closure.expression,
    references: Object.fromEntries(
      Array.from(closure.references?.entries() || []).map(([localName, canonical]) => [
        localName,
        [canonical.uri, canonical.name]
      ])
    )
  };
};

/**
 * Serialize a MacroResult (either simple Closure or Closure + Definitions)
 * 
 * Macro can return:
 * 1. Just a Closure: { expression, references }
 * 2. [Closure, Map<CanonicalName, Definition>] - includes artificial definitions
 */
globalThis.__funee_serialize_macro_result = function(result) {
  if (Array.isArray(result)) {
    // [Closure, Map<CanonicalName, Definition>]
    const [closure, definitions] = result;
    
    return JSON.stringify({
      type: 'WithDefinitions',
      closure: globalThis.__funee_serialize_closure(closure),
      definitions: Object.fromEntries(
        Array.from(definitions?.entries() || []).map(([canonical, definition]) => [
          // Key: [uri, name] tuple
          [canonical.uri, canonical.name],
          // Value: definition code (string)
          definition
        ])
      )
    });
  } else {
    // Just a Closure
    return JSON.stringify({
      type: 'Simple',
      closure: globalThis.__funee_serialize_closure(result)
    });
  }
};

/**
 * Helper to create Closures from user macro code
 * 
 * Usage in macros:
 *   const myClosure = Closure({
 *     expression: '1 + 2',
 *     references: new Map([['add', { uri: './utils.ts', name: 'add' }]])
 *   });
 */
globalThis.Closure = function(props) {
  return {
    expression: props.expression || '',
    references: props.references || new Map()
  };
};

/**
 * Helper to create CanonicalName objects
 * 
 * Usage:
 *   const name = CanonicalName({ uri: './utils.ts', name: 'helper' });
 */
globalThis.CanonicalName = function(props) {
  return {
    uri: props.uri,
    name: props.name
  };
};

// Export for debugging
globalThis.__funee_macro_helpers = {
  deserialize_closure: globalThis.__funee_deserialize_closure,
  serialize_closure: globalThis.__funee_serialize_closure,
  serialize_macro_result: globalThis.__funee_serialize_macro_result,
  Closure: globalThis.Closure,
  CanonicalName: globalThis.CanonicalName
};
