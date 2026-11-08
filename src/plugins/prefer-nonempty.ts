import type { Context, ESTree, Rule, Scope } from '@oxlint/plugins';

type IdentifierNode = Extract<ESTree.Node, { type: 'Identifier' }>;

type SchemaKind = 'string' | 'array' | 'set';

const CHAIN_METHODS: Record<SchemaKind, ReadonlySet<string>> = {
  string: new Set([
    'trim',
    'toLowerCase',
    'toUpperCase',
    'normalize',
    'min',
    'max',
    'length',
    'regex',
    'includes',
    'startsWith',
    'endsWith',
    'nonempty',
  ]),
  array: new Set(['min', 'max', 'length', 'nonempty']),
  set: new Set(['min', 'max', 'size', 'nonempty']),
};

function schemaKind(name: string): SchemaKind | undefined {
  if (name === 'string' || name === 'array' || name === 'set') {
    return name;
  }

  return undefined;
}

function importedName(node: IdentifierNode, context: Context): string | undefined {
  let scope: Scope | null = context.sourceCode.getScope(node);

  while (scope) {
    const variable = scope.set.get(node.name);

    if (variable) {
      const definition = variable.defs[0];

      if (!definition || definition.type !== 'ImportBinding') {
        return undefined;
      }

      const declaration = definition.parent;
      const specifier = definition.node;

      if (
        declaration?.type !== 'ImportDeclaration' ||
        declaration.importKind === 'type' ||
        (declaration.source.value !== 'zod' && declaration.source.value !== 'zod/v4')
      ) {
        return undefined;
      }

      if (specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier') {
        return 'z';
      }

      if (specifier.type === 'ImportSpecifier' && specifier.importKind !== 'type') {
        return specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
      }

      return undefined;
    }

    scope = scope.upper;
  }

  return undefined;
}

function isNamedMember(node: ESTree.Node): node is ESTree.MemberExpression & { property: IdentifierNode } {
  return node.type === 'MemberExpression' && !node.computed && !node.optional && node.property.type === 'Identifier';
}

function isZodNamespace(node: ESTree.Node, context: Context): boolean {
  return node.type === 'Identifier' && importedName(node, context) === 'z';
}

function inlineSchemaKind(node: ESTree.Node, context: Context): SchemaKind | undefined {
  if (node.type !== 'CallExpression' || node.optional) {
    return undefined;
  }

  const callee = node.callee;

  if (callee.type === 'Identifier') {
    const name = importedName(callee, context);

    return name !== undefined ? schemaKind(name) : undefined;
  }

  if (!isNamedMember(callee)) {
    return undefined;
  }

  const name = callee.property.name;

  if (isZodNamespace(callee.object, context)) {
    return schemaKind(name);
  }

  if (
    name === 'string' &&
    isNamedMember(callee.object) &&
    callee.object.property.name === 'coerce' &&
    isZodNamespace(callee.object.object, context)
  ) {
    return 'string';
  }

  const receiverKind = inlineSchemaKind(callee.object, context);

  if (receiverKind === undefined) {
    return undefined;
  }

  if (name === 'array') {
    return 'array';
  }

  return CHAIN_METHODS[receiverKind].has(name) ? receiverKind : undefined;
}

const preferNonempty: Rule = {
  meta: { type: 'suggestion', fixable: 'code', schema: [] },
  create(context) {
    return {
      CallExpression(node) {
        const member = node.callee;
        const [bound, error] = node.arguments;

        if (
          node.optional ||
          !isNamedMember(member) ||
          member.property.name !== 'min' ||
          bound?.type !== 'Literal' ||
          bound.value !== 1 ||
          node.arguments.length > 2 ||
          error?.type === 'SpreadElement' ||
          inlineSchemaKind(member.object, context) === undefined
        ) {
          return;
        }

        context.report({
          node: member.property,
          message: 'Use .nonempty() instead of .min(1).',
          fix(fixer) {
            const opening = context.sourceCode.getTokenAfter(member.property);
            const closing = context.sourceCode.getLastToken(node);

            if (!opening || !closing) {
              return null;
            }

            const tokens = context.sourceCode.getTokensBetween(opening, error ?? closing);
            const commaIndex = tokens.findIndex(token => token.value === ',');
            const removedTokens = error ? tokens.slice(0, commaIndex + 1) : tokens;
            const lastRemoved = removedTokens.at(-1);
            const next = lastRemoved ? context.sourceCode.getTokenAfter(lastRemoved) : closing;

            if (!next) {
              return null;
            }

            const removals = context.sourceCode.commentsExistBetween(opening, next)
              ? removedTokens.map(token => fixer.remove(token))
              : [fixer.removeRange([opening.range[1], next.range[0]])];

            return [fixer.replaceText(member.property, 'nonempty'), ...removals];
          },
        });
      },
    };
  },
};

export default preferNonempty;
