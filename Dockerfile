FROM node:22-bookworm

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential python3 make \
 && rm -rf /var/lib/apt/lists/*

COPY .vendor/.zed/oresoftware/flags-2-env ./.vendor/.zed/oresoftware/flags-2-env
RUN make -C .vendor/.zed/oresoftware/flags-2-env clean && make -C .vendor/.zed/oresoftware/flags-2-env shared

# Node is the one runtime here that does not use FFI: it builds a real N-API
# addon with node-gyp and loads that instead of the shared library.
RUN npm install -g node-gyp@^11 \
 && cd .vendor/.zed/oresoftware/flags-2-env/clients/nodejs \
 && node-gyp rebuild

COPY .cli-flags.toml ./
COPY src ./src

ENV FLAGS2ENV_NODE_ADDON=/app/.vendor/.zed/oresoftware/flags-2-env/clients/nodejs/build/Release/flags2env.node

CMD ["node", "src/demo.mjs"]
