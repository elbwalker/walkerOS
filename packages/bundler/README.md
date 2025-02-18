# walkerOS Bundler

The walkerOS Bundler is a tool that bundles your individual project
configuration into a single file.

It is a simple tool. It can be used via CLI or as a library. There is a
`template` file that works as a boilerplate for the output file. Pass a json
configuration file to the tool to customize the output. The output file will be
saved in the current working directory. It takes the json configuration file and
the template file and outputs a single file. The compiled file can be run in a
browser environment. It is minified and optimized for the browser.

Currently, the supported fields in the json configuration file are:

- `name`: The name of the project.
- `message`: The version of the project.

Both fields are required.

## Usage

### CLI

```bash
npx walker-bundler @TODO
```

### Library

```ts
import { bundler } from '@elbwalker/bundler';
@TODO
```

## Tools

The bundler uses

- `handlebars` to render the template.
- `esbuild` to bundle the output file.

## Organization

The project is organized in the following way:

- `src/`: The source code of the project.
- `src/templates/`: For all the templates.
- `dist/`: The compiled output of the project.
