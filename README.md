# Pruner

Will prune `node_modules` so your final Docker images is smaller. Cuts about
10 to 20 percent off. Comes handy if you’re dealing with limited resources
or work at a scale of thousands of projects. Or you’re just obsessed with small
deployments.

## Install

This package is hosted in jsr.dev, but you can install it with your normal tools:

```shell
pnpm dlx jsr add -D @antti/pruner
```

It’s a single JavaScript file with no deps, so you can just copy it to your
project if you don’t want to install it.

## Usage

```shell
pnpm dlx @antti/pruner --path=node_modules/.pnpm
# Or
pnpm pruner --path=node_modules/.pnpm
```

Example usage in Dockerfile:

```dockerfile
FROM node:lts-alpine3.19 AS base
RUN corepack enable
WORKDIR /usr/src/app
COPY pnpm-lock.yaml .
RUN pnpm fetch
COPY . .
RUN pnpm i --offline --frozen-lockfile
RUN pnpm build
RUN pnpm -F=foo --prod deploy /myapp/foo
# Run it as the last command step of the build step
RUN pnpm pruner --path=/myapp/foo/node_modules/.pnpm

# Enjoy slimmer image
FROM node:lts-alpine3.19 AS foo
COPY --from=base /myapp/foo /myapp/foo
WORKDIR /myapp/foo
CMD node build/server.js
```

## Other packages

- [npmprune](https://github.com/xthezealot/npmprune) (bash)
- [node-prune](https://github.com/tuananh/node-prune) (bash)
