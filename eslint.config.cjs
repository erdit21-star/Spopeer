const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    files: ["server/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_|^next$|^req$|^res$" }],
      "no-undef": "error",
      "no-constant-binary-expression": "error",
      "no-self-compare": "error",
      "no-template-curly-in-string": "warn",
      "no-control-regex": "off"
    }
  },
  {
    files: ["*.js", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error"
    }
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        SpopeerAPI: "readonly",
        io: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "no-redeclare": "off",
      "no-useless-escape": "warn",
      "no-constant-binary-expression": "error",
      "no-self-compare": "error"
    }
  },
  {
    ignores: [
      "node_modules/**",
      "server/node_modules/**",
      "server/uploads/**",
      "public/uploads/**"
    ]
  }
];
