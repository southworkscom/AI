module.exports = {
    parser: '@typescript-eslint/parser',  // Specifies the ESLint parser
    plugins: [
        '@typescript-eslint',
        '@typescript-eslint/tslint'
    ],
    extends: [
        "plugin:@typescript-eslint/recommended"
    ],
    parserOptions: {
        ecmaVersion: 2018,  // Allows for the parsing of modern ECMAScript features
        sourceType: 'module',  // Allows for the use of imports
        project: './tsconfig.json'
    },
    rules: {
        '@typescript-eslint/no-angle-bracket-type-assertion': 'off',
        '@typescript-eslint/tslint/config': [
            'warn',
            {
                lintFile: './tslint.json'
            }
        ]
    },
};