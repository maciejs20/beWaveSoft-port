// Linux replacements for the Windows-only (netsh/ipconfig/ms-settings) IPC handlers.
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);

async function nmcli(args) {
  const { stdout } = await execFileAsync("nmcli", args);
  return stdout;
}

async function getWifiInfo() {
  try {
    const devices = await nmcli(["-t", "-f", "DEVICE,TYPE,STATE,CONNECTION", "device"]);
    const wifi = devices.split("\n").map((l) => l.split(":")).find((c) => c[1] === "wifi" && c[2] === "connected");
    if (!wifi) return { ssid: null, ipv4: null, subnet: null };
    const show = await nmcli(["-t", "-f", "IP4.ADDRESS", "device", "show", wifi[0]]);
    const cidr = show.match(/IP4\.ADDRESS\[1\]:([0-9.]+)\/(\d+)/);
    let subnet = null;
    if (cidr) {
      const mask = Number(cidr[2]) === 0 ? 0 : (0xffffffff << (32 - Number(cidr[2]))) >>> 0;
      subnet = [24, 16, 8, 0].map((s) => (mask >>> s) & 255).join(".");
    }
    return { ssid: wifi[3] || null, ipv4: cidr ? cidr[1] : null, subnet };
  } catch (err) {
    console.error("Error getting WiFi info:", err);
    return { ssid: null, ipv4: null, subnet: null };
  }
}

async function attempt(action, label) {
  try {
    await action();
    return true;
  } catch (err) {
    console.error(label, err);
    return false;
  }
}

function openDetached(command, args) {
  return new Promise((resolve, reject) => {
    const child = require("child_process").spawn(command, args, { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => { child.unref(); resolve(); });
  });
}

function replace(ipcMain, channel, handler) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}

module.exports = function registerLinuxOverrides(ipcMain) {
  replace(ipcMain, "get-wifi-info", getWifiInfo);
  replace(ipcMain, "open-wifi-settings", () => attempt(() => openDetached("nm-connection-editor", []), "Error opening WiFi settings:"));
  replace(ipcMain, "connect-wifi", (_event, ssid) => attempt(() => nmcli(["connection", "up", "id", String(ssid)]), "Error connecting to WiFi:"));
  replace(ipcMain, "disconnect-wifi", async () => attempt(async () => {
    const devices = await nmcli(["-t", "-f", "DEVICE,TYPE,STATE", "device"]);
    const wifi = devices.split("\n").map((l) => l.split(":")).find((c) => c[1] === "wifi" && c[2] === "connected");
    if (wifi) await nmcli(["device", "disconnect", wifi[0]]);
  }, "Error disconnecting WiFi:"));
};
