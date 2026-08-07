FROM node:22-bookworm@sha256:0557ac14e0d45d02ed563067b82856ca5e7aa3437fa28d98d4350ea9c3d9494a

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential python3 make \
 && rm -rf /var/lib/apt/lists/*

COPY .vendor/.zed/oresoftware/flags-2-env ./.vendor/.zed/oresoftware/flags-2-env
RUN make -C .vendor/.zed/oresoftware/flags-2-env clean && make -C .vendor/.zed/oresoftware/flags-2-env shared

# Node is the one runtime here that does not use FFI: it builds a real N-API
# addon with node-gyp and loads that instead of the shared library.
RUN npm install -g node-gyp@11.4.2

# WORKDIR rather than `cd` inside the RUN: node-gyp resolves binding.gyp from
# the process working directory, and a `cd` that only lives for one layer hides
# where the addon is actually being built.
WORKDIR /app/.vendor/.zed/oresoftware/flags-2-env/clients/nodejs
RUN node-gyp rebuild
WORKDIR /app

COPY .cli-flags.toml ./
COPY src ./src

ENV FLAGS2ENV_NODE_ADDON=/app/.vendor/.zed/oresoftware/flags-2-env/clients/nodejs/build/Release/flags2env.node

RUN useradd --create-home --shell /bin/sh --uid 10001 fixture
USER fixture

CMD ["node", "src/demo.mjs"]
