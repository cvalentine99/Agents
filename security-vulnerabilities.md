# GitHub Dependabot Security Vulnerabilities

## High Severity (2)

1. **qs's arrayLimit bypass** - DoS via memory exhaustion
   - Package: qs (npm)
   - File: pnpm-lock.yaml

2. **tRPC prototype pollution** - in `experimental_nextAppDirCaller`
   - Package: @trpc/server (npm)
   - File: pnpm-lock.yaml
   - Type: Direct dependency

## Moderate Severity (5)

3. **mdast-util-to-hast** - unsanitized class attribute
   - Package: mdast-util-to-hast (npm)
   - File: pnpm-lock.yaml

4. **node-tar** - race condition leading to uninitialized memory exposure
   - Package: tar (npm)
   - File: pnpm-lock.yaml

5. **vite** - server.fs.deny bypass via backslash on Windows (x2)
   - Package: vite (npm)
   - File: pnpm-lock.yaml
   - Type: Direct dependency

6. **esbuild** - enables any website to send requests to dev server
   - Package: esbuild (npm)
   - File: pnpm-lock.yaml
