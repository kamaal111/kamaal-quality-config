import preferNonempty from './prefer-nonempty.ts';
import preferNullish from './prefer-nullish.ts';

export default {
  meta: { name: 'kamaal-zod' },
  rules: {
    'prefer-nonempty': preferNonempty,
    'prefer-nullish': preferNullish,
  },
};
