import { spawn } from "node:child_process";

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with code ${code ?? "unknown"}`));
    });
  });
}

function launchRendererAndDetectUrl() {
  return new Promise((resolve, reject) => {
    const renderer = spawn(npmCmd, ["run", "dev:renderer"], {
      stdio: ["inherit", "pipe", "pipe"],
      env: process.env,
      shell: process.platform === "win32",
    });

    let resolved = false;

    const onData = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);

      if (resolved) {
        return;
      }

      const match = text.match(/Local:\s+http:\/\/(localhost|127\.0\.0\.1):(\d+)/i);
      if (match) {
        resolved = true;
        const devUrl = `http://localhost:${match[2]}`;
        resolve({ renderer, devUrl });
      }
    };

    const onErrData = (chunk) => {
      process.stderr.write(chunk.toString());
    };

    renderer.stdout.on("data", onData);
    renderer.stderr.on("data", onErrData);

    renderer.on("error", (error) => {
      if (resolved) {
        return;
      }
      reject(error);
    });

    renderer.on("exit", (code) => {
      if (!resolved) {
        reject(new Error(`Renderer exited before exposing dev URL (code ${code ?? "unknown"}).`));
      }
    });
  });
}

async function main() {
  let rendererProcess;
  let electronProcess;

  const shutdown = (code = 0) => {
    if (rendererProcess && !rendererProcess.killed) {
      rendererProcess.kill();
    }
    if (electronProcess && !electronProcess.killed) {
      electronProcess.kill();
    }
    process.exit(code);
  };

  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));

  try {
    const rendererLaunch = await launchRendererAndDetectUrl();
    rendererProcess = rendererLaunch.renderer;

    rendererProcess.on("exit", (code) => {
      shutdown(code ?? 1);
    });

    const devUrl = rendererLaunch.devUrl;
    console.log(`[dev-runner] Renderer detected at ${devUrl}`);

    await runCommand(npmCmd, ["run", "rebuild:native:electron"]);
    await runCommand(npmCmd, ["run", "build:electron"]);

    electronProcess = spawn(npmCmd, ["run", "dev:electron:launch"], {
      stdio: "inherit",
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: devUrl,
      },
      shell: process.platform === "win32",
    });

    electronProcess.on("exit", (code) => {
      shutdown(code ?? 0);
    });
  } catch (error) {
    console.error(`[dev-runner] ${String(error instanceof Error ? error.message : error)}`);
    shutdown(1);
  }
}

main();
