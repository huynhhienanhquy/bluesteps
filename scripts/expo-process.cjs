const { spawn } = require('node:child_process');

const STDERR_LIMIT = 16_384;
const NETWORK_CODES =
  /\b(?:ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT)\b/g;
const FATAL_ERRORS =
  /SyntaxError|TransformError|Unable to resolve(?: module)?|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|EADDRINUSE|Bundling failed|Transform failed|not logged in|Unauthorized|AuthenticationError|CERT_[A-Z_]+|ERR_TLS_CERT_[A-Z_]+|UNABLE_TO_VERIFY_LEAF_SIGNATURE|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_GET_ISSUER_CERT(?:_LOCALLY)?/i;

/** Retry one failed initial network connection; never restart an active app session. */
function startExpoProcess({
  args,
  cwd,
  env = process.env,
  onSpawn = () => {},
  onExit = () => {},
  onRetry = ({ attempt, maxRestarts, codes }) =>
    console.warn(
      `Kết nối Expo bị gián đoạn (${codes.join(', ')}). Đang khởi động lại Expo (${attempt}/${maxRestarts})...`,
    ),
  isStopping = () => false,
  maxRestarts = 1,
  retryDelayMs = 1000,
  spawn: spawnProcess = spawn,
  stderr = process.stderr,
}) {
  let ready = false;
  let failed = false;
  let activeChild = null;
  let retryTimer;
  let restarts = 0;
  let rejectStartup;
  const startupFailure = new Promise((_, reject) => {
    rejectStartup = reject;
  });
  // Callers may start their readiness race after the first child event fires.
  startupFailure.catch(() => {});

  function fail(error) {
    if (failed) return;
    failed = true;
    clearTimeout(retryTimer);
    rejectStartup(error);
  }

  function launch() {
    if (failed || isStopping()) return;
    let child;
    try {
      child = spawnProcess(process.execPath, args, {
        cwd,
        env,
        stdio: ['inherit', 'inherit', 'pipe'],
        windowsHide: true,
      });
      activeChild = child;
      onSpawn(child);
    } catch (error) {
      fail(error);
      return;
    }
    let stderrTail = '';
    let spawnFailed = false;
    child.stderr?.on('data', (chunk) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_LIMIT);
      stderr.write(chunk);
    });
    child.once('error', (error) => {
      spawnFailed = true;
      activeChild = null;
      if (isStopping()) return;
      if (ready) onExit(1, null);
      else fail(error);
    });
    // 'close' follows exit and drains stderr, including the final network cause.
    child.once('close', (code, signal) => {
      activeChild = null;
      if (spawnFailed || isStopping() || failed) return;
      if (ready) return onExit(code, signal);
      const codes = [...new Set(stderrTail.match(NETWORK_CODES) ?? [])];
      const transient = codes.length > 0 && !FATAL_ERRORS.test(stderrTail);
      if (code !== 0 && transient && restarts < maxRestarts) {
        restarts++;
        onRetry({ attempt: restarts, maxRestarts, code, signal, codes });
        retryTimer = setTimeout(launch, retryDelayMs);
        return;
      }
      const detail = codes.length ? `; lỗi mạng ${codes.join(', ')}` : '';
      fail(
        new Error(
          `Expo dừng trước khi sẵn sàng (mã ${code ?? signal ?? 'unknown'}${detail}). Kiểm tra lỗi CLI ở trên.`,
        ),
      );
    });
  }

  launch();
  return {
    startupFailure,
    markReady() {
      if (
        failed ||
        !activeChild ||
        activeChild.exitCode != null ||
        activeChild.signalCode != null ||
        activeChild.killed
      ) {
        const error = new Error('Expo đã dừng trước khi hoàn tất kiểm tra sẵn sàng.');
        fail(error);
        throw error;
      }
      ready = true;
    },
  };
}

module.exports = { startExpoProcess };
