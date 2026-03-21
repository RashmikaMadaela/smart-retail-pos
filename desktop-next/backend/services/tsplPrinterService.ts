import * as usb from 'usb';
import type { Product } from '../types';

export interface TSPLLabelItem {
  product_id: string;
  name: string;
  sell_price: number;
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
  return devices.find((dev) => dev.deviceDescriptor.idVendor === vendorId && dev.deviceDescriptor.idProduct === productId) || null;
}

/**
 * Sends TSPL commands directly to USB thermal printer
 */
export async function printTSPLLabels(
  items: Array<{ item: TSPLLabelItem; quantity: number }>,
  vendorId: number = 0x0b1f,
  productId: number = 0x1004
): Promise<{ success: boolean; message: string }> {
  try {
    const device = findPrinterDevice(vendorId, productId);
    if (!device) {
      return {
        success: false,
        message: `Printer not found (Vendor: 0x${vendorId.toString(16)}, Product: 0x${productId.toString(16).toUpperCase()}). Please ensure USB printer is connected and powered on.`,
      };
    }

    device.open();

    try {
      for (const { item, quantity } of items) {
        const commands = generateTSPLCommands(item, quantity);
        const buffer = Buffer.from(commands + '\n', 'utf-8');

        console.log(`[TSPL] Printing ${quantity} label(s) for: ${item.name} (${item.product_id})`);
        console.log(`[TSPL] Commands:\n${commands}`);

        // Find bulk output endpoint
        const interfaces = device.interfaces;
        if (!interfaces || interfaces.length === 0) {
          return {
            success: false,
            message: 'Printer interface not found',
          };
        }

        const iface = interfaces[0];
        const endpoints = iface.endpoints;
        const endpoint = endpoints?.find((ep: usb.Endpoint) => ep.direction === 'out');
        
        if (!endpoint) {
          return {
            success: false,
            message: 'Printer output endpoint not found',
          };
        }

        // Use bulkTransfer for output
        await new Promise<void>((resolve, reject) => {
          (endpoint as any).bulkTransfer(buffer, (error: Error | null) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }

      console.log('[TSPL] Label printing completed successfully');
      return {
        success: true,
        message: `Successfully printed ${items.length} label(s)`,
      };
    } finally {
      device.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[TSPL] Printing failed: ${message}`);
    return {
      success: false,
      message: `Label printing failed: ${message}`,
    };
  }
}
