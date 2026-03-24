import * as usb from 'usb';
import { execFile } from 'node:child_process';

export interface TSPLLabelItem {
  product_id: string;
  name: string;
  sell_price: number;
}

type UsbIdPair = { vendorId: number; productId: number };
type UsbCandidate = {
  device: usb.Device;
  vendorId: number;
  productId: number;
  score: number;
};

function toHex(value: number): string {
  return `0x${value.toString(16)}`;
}

function formatUsbId(pair: UsbIdPair): string {
  return `VID ${toHex(pair.vendorId)} PID ${toHex(pair.productId)}`;
}

function isLikelyPrinterDevice(device: usb.Device): boolean {
  const descriptorClass = device.deviceDescriptor.bDeviceClass;
  if (descriptorClass === 0x07) {
    return true;
  }

  // Many USB printer devices expose class 0 and set class on interfaces.
  const interfaces = device.interfaces;
  if (!interfaces || interfaces.length === 0) {
    return false;
  }
  return interfaces.some((iface) => iface.descriptor?.bInterfaceClass === 0x07);
}

function getConnectedUsbIds(): UsbIdPair[] {
  return usb.getDeviceList().map((dev) => ({
    vendorId: dev.deviceDescriptor.idVendor,
    productId: dev.deviceDescriptor.idProduct,
  }));
}

function hasOutEndpoint(device: usb.Device): boolean {
  const interfaces = device.interfaces;
  if (!interfaces || interfaces.length === 0) {
    return false;
  }

  return interfaces.some((iface) => iface.endpoints.some((ep) => ep.direction === 'out'));
}

function rankUsbCandidates(devices: usb.Device[], preferredVendorId: number, preferredProductId: number): UsbCandidate[] {
  const blockedVendors = new Set([0x8086, 0x8087, 0x5986]); // Intel controllers, common webcam vendor

  const candidates: UsbCandidate[] = [];
  for (const device of devices) {
    const vendorId = device.deviceDescriptor.idVendor;
    const productId = device.deviceDescriptor.idProduct;
    if (blockedVendors.has(vendorId)) {
      continue;
    }

    let score = 0;
    if (vendorId === preferredVendorId && productId === preferredProductId) {
      score += 100;
    }

    try {
      device.open();
      if (isLikelyPrinterDevice(device)) {
        score += 50;
      }
      if (hasOutEndpoint(device)) {
        score += 25;
      }
    } catch {
      continue;
    } finally {
      try {
        device.close();
      } catch {
        // Ignore close failures during probing.
      }
    }

    if (score > 0) {
      candidates.push({ device, vendorId, productId, score });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/**
 * Generates TSPL (TSC Printer Language) command string for thermal label printing
 * Per Barcode Printer Programming Manual specifications:
 * - Label size: 38mm x 25mm (Manual lines 49-50)
 * - Gap: 2mm (Manual lines 83-84)
 * - Font: "3" = 16x24 dots (Manual line 1077)
 * - Barcode type: "128" CODE128 (Manual lines 476-483)
 * - Height: 80 dots (Manual line 557-558)
 * - Human readable: 1 (enabled) (Manual line 557-558)
 */
export function generateTSPLCommands(item: TSPLLabelItem, quantity: number): string {
  const lines: string[] = [];

  // Label configuration (Manual 49-50, 83-84, 195-196)
  lines.push('SIZE 38 mm,25 mm');
  lines.push('GAP 2 mm,0');
  lines.push('DIRECTION 1');
  lines.push('CLS');

  // Product name (truncate to 16 chars for label width)
  const displayName = item.name.substring(0, 16);
  lines.push(`TEXT 10,10,"3",0,1,1,"${displayName}"`);

  // Barcode (Manual 476-483: type "128", Manual 557-558: height 80, human_readable 1)
  lines.push(`BARCODE 10,50,"128",80,1,0,2,2,"${item.product_id}"`);

  // Price
  const priceText = `Rs. ${Number(item.sell_price).toFixed(2)}`;
  lines.push(`TEXT 10,160,"3",0,1,1,"${priceText}"`);

  // Print (Manual 1248-1254: PRINT copies)
  lines.push(`PRINT ${quantity}`);

  return lines.join('\n');
}

/**
 * Finds and opens USB thermal printer device
 * Default TSC TDP-34 printer IDs: 0x0b1f (vendor), 0x1004 (product)
 */
function findPrinterDevice(vendorId: number = 0x0b1f, productId: number = 0x1004): usb.Device | null {
  const devices = usb.getDeviceList();

  // Attempt 1: exact configured match.
  const exact = devices.find((dev) => dev.deviceDescriptor.idVendor === vendorId && dev.deviceDescriptor.idProduct === productId);
  if (exact) {
    return exact;
  }

  // Attempt 2: score and probe candidates that can accept OUT transfers.
  const ranked = rankUsbCandidates(devices, vendorId, productId);
  return ranked[0]?.device || null;
}

function generateBatchCommands(items: Array<{ item: TSPLLabelItem; quantity: number }>): string {
  return items
    .map(({ item, quantity }) => {
      const commands = generateTSPLCommands(item, quantity);
      console.log(`[TSPL] Printing ${quantity} label(s) for: ${item.name} (${item.product_id})`);
      console.log(`[TSPL] Commands:\n${commands}`);
      return commands;
    })
    .join('\n');
}

async function sendRawTsplViaWindowsSpooler(printerName: string, rawData: string): Promise<{ success: boolean; message: string }> {
  const safePrinterName = printerName.replace(/'/g, "''");
  const dataBase64 = Buffer.from(rawData, 'utf-8').toString('base64');
  const script = `
$printerName = '${safePrinterName}'
$data = [System.Convert]::FromBase64String('${dataBase64}')

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFOA {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);

  public static bool SendBytesToPrinter(string printerName, byte[] bytes, int count) {
    IntPtr hPrinter;
    var di = new DOCINFOA();
    di.pDocName = "TSPL Barcode Job";
    di.pDataType = "RAW";
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) return false;
    try {
      if (!StartDocPrinter(hPrinter, 1, di)) return false;
      try {
        if (!StartPagePrinter(hPrinter)) return false;
        try {
          int written;
          return WritePrinter(hPrinter, bytes, count, out written) && written == count;
        }
        finally { EndPagePrinter(hPrinter); }
      }
      finally { EndDocPrinter(hPrinter); }
    }
    finally { ClosePrinter(hPrinter); }
  }
}
"@ -Language CSharp

$ok = [RawPrinterHelper]::SendBytesToPrinter($printerName, $data, $data.Length)
if (-not $ok) {
  $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  Write-Error "RAW TSPL spooler write failed. Win32Error=$code"
  exit 1
}
`;

  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], (error, _stdout, stderr) => {
      if (error) {
        const detail = (stderr || error.message || '').trim();
        resolve({
          success: false,
          message: `Windows RAW spooler failed for printer '${printerName}': ${detail || 'unknown error'}`,
        });
        return;
      }
      resolve({
        success: true,
        message: `Printed via Windows RAW spooler on '${printerName}'`,
      });
    });
  });
}

/**
 * Sends TSPL commands directly to USB thermal printer
 */
export async function printTSPLLabels(
  items: Array<{ item: TSPLLabelItem; quantity: number }>,
  vendorId: number = 0x0b1f,
  productId: number = 0x1004,
  windowsPrinterName?: string
): Promise<{ success: boolean; message: string }> {
  let device: usb.Device | null = null;
  let iface: usb.Interface | null = null;
  let interfaceClaimed = false;
  const batchedCommands = `${generateBatchCommands(items)}\n`;
  try {
    device = findPrinterDevice(vendorId, productId);
    if (!device) {
      if (process.platform === 'win32' && windowsPrinterName) {
        const spoolResult = await sendRawTsplViaWindowsSpooler(windowsPrinterName, batchedCommands);
        if (spoolResult.success) {
          return spoolResult;
        }
      }

      const connected = getConnectedUsbIds();
      const connectedText = connected.length > 0
        ? connected.map(formatUsbId).join(', ')
        : 'none';
      return {
        success: false,
        message: `Printer not found for configured ${formatUsbId({ vendorId, productId })}. Connected USB devices: ${connectedText}. Please confirm printer VID/PID and power state.${windowsPrinterName ? ` Also attempted RAW spooler on '${windowsPrinterName}'.` : ''}`,
      };
    }

    device.open();
    const interfaces = device.interfaces;
    if (!interfaces || interfaces.length === 0) {
      return {
        success: false,
        message: 'Printer interface not found',
      };
    }

    iface = interfaces[0];
    iface.claim();
    interfaceClaimed = true;

    const endpoint = interfaces
      .flatMap((ifc) => ifc.endpoints)
      .find((ep): ep is usb.OutEndpoint => ep.direction === 'out');
    if (!endpoint) {
      return {
        success: false,
        message: 'Printer output endpoint not found',
      };
    }

    const buffer = Buffer.from(batchedCommands, 'utf-8');
    await new Promise<void>((resolve, reject) => {
      endpoint.transfer(buffer, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    console.log('[TSPL] Label printing completed successfully');
    return {
      success: true,
      message: `Successfully printed ${items.length} label(s)`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[TSPL] Printing failed: ${message}`);

    if (process.platform === 'win32' && windowsPrinterName) {
      const spoolResult = await sendRawTsplViaWindowsSpooler(windowsPrinterName, batchedCommands);
      if (spoolResult.success) {
        return spoolResult;
      }
      return {
        success: false,
        message: `Label printing failed over USB: ${message}. Fallback RAW spooler also failed: ${spoolResult.message}`,
      };
    }

    return {
      success: false,
      message: `Label printing failed: ${message}`,
    };
  } finally {
    if (iface && interfaceClaimed) {
      await new Promise<void>((resolve) => {
        iface?.release(true, () => resolve());
      });
    }
    if (device) {
      try {
        device.close();
      } catch {
        // No-op: close may throw if device already disconnected.
      }
    }
  }
}
