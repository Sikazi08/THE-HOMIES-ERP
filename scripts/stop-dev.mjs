import { execFileSync } from "node:child_process";

const ports = [3000, 5173];

function stopWindows() {
  const portList = ports.join(",");
  const command = [
    `$ports = @(${portList})`,
    "$connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort }",
    "$pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique",
    "foreach ($procId in $pids) {",
    "  try {",
    "    $process = Get-Process -Id $procId -ErrorAction Stop",
    "    Write-Output \"Stopping $($process.ProcessName) PID $procId\"",
    "    Stop-Process -Id $procId -Force -ErrorAction Stop",
    "  } catch {}",
    "}",
  ].join("; ");

  execFileSync("powershell.exe", ["-NoProfile", "-Command", command], {
    stdio: "inherit",
  });
}

function stopUnix() {
  for (const port of ports) {
    try {
      execFileSync("sh", ["-c", `lsof -ti tcp:${port} | xargs -r kill -9`], {
        stdio: "inherit",
      });
    } catch {}
  }
}

if (process.platform === "win32") {
  stopWindows();
} else {
  stopUnix();
}
